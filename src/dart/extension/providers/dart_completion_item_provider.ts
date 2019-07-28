import * as path from "path";
import * as vs from "vscode";
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, CompletionTriggerKind, Disposable, MarkdownString, Position, Range, SnippetString, TextDocument } from "vscode";
import * as as from "../../shared/analysis_server_types";
import { IAmDisposable, Logger } from "../../shared/interfaces";
import { flatMap } from "../../shared/utils";
import { cleanDartdoc } from "../../shared/utils/dartdocs";
import { DelayedCompletionItem, LazyCompletionItem } from "../../shared/vscode/interfaces";
import { fsPath } from "../../shared/vscode/utils";
import { hasOverlappingEdits } from "../commands/edit";
import { config } from "../config";
import { resolvedPromise } from "../utils";
import { getXPath, isAttributeValue, isAttribute, isTagName, isClosingTagName } from "../../xmlUtils";
import { getDartDocument, getDartCodeIndex } from "../../utils";
import { PropertyHandlerProvider } from "../../../providers/property-handler-provider";

export class DartCompletionItemProvider implements CompletionItemProvider, IAmDisposable {
	private disposables: Disposable[] = [];
	private cachedCompletions: { [key: number]: as.AvailableSuggestionSet } = {};
	private existingImports: { [key: string]: { [key: string]: { [key: string]: boolean } } } = {};
	private cachedCompletionsArray: as.AvailableSuggestionSet[] = [];

	constructor(
		private readonly logger: Logger,
		private readonly analyzer: any,
		private propertyHandlerProvider: PropertyHandlerProvider) {
		this.disposables.push(analyzer.registerForCompletionAvailableSuggestions((n: any) => this.storeCompletionSuggestions(n)));
		this.disposables.push(analyzer.registerForCompletionExistingImports((n: any) => this.storeExistingImports(n)));
	}

	public async provideCompletionItems(
		document: TextDocument, position: Position, 
		token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined> {
		let allResults: any[] = [];
		
		if (isTagName(document, position) || isClosingTagName(document, position)) {
			allResults = (await this.getTagNameCompletions(document, position, token)).concat(this.getClosingTagNameCompletions(document, position));
		}
		else if (isAttributeValue(document, position)) {
			allResults = this.getAttributeValueCompletions(document, position, token);
		}
		else if (isAttribute(document, position)) {
			allResults = await this.getAttributeCompletions(document, position, token);
		}

		return new CompletionList(allResults);
	}

	private async getTagNameCompletions(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
		const completions: vs.CompletionItem[] = [];

		const line = document.lineAt(position.line).text.slice(0, position.character);
		const segments = line.split(/[ <>"']/g);
		let tag = segments[segments.length - 1];
		const xPath = getXPath(document, position);
		const parentTag = xPath[xPath.length - 1];
		const isTopLevelElement = xPath.length === 0;
		const isSecondLevelElement = xPath.length === 1;
		const isAttributeOrCustomTag = tag.length && /[a-z].*/g.test(tag[0]);

		if (isTopLevelElement) {
			return [];
		}
		if (isAttributeOrCustomTag) {
			if (isSecondLevelElement) {
				return this.getSecondLevelElementCompletions(document, position);
			}
			else {
				return await this.getAttributeCompletionsForElement(parentTag, true, document, position, token);
			}
		}
		else if (!tag.length) {
			completions.push(...await this.getAttributeCompletionsForElement(parentTag, true, document, position, token));
			completions.push(...await this.getSecondLevelElementCompletions(document, position));
		}

		tag = tag.toLowerCase();
		const temp: any = {};
		this.cachedCompletionsArray.forEach((a) => {
			a.items.forEach((i) => {
				if (i.element.kind === 'CONSTRUCTOR' && i.label.toLowerCase().indexOf(tag) > -1 && !temp[i.label] && !/[a-z].*/.test(i.label[0])) {
					const item = new vs.CompletionItem(i.label, vs.CompletionItemKind.Method);
					let insertText;
					if (i.label.indexOf('.') > -1) {
						const parts = i.label.split('.');
						insertText = parts[0] + ' :use="' + parts[1] + '">$0';
					}
					else {
						insertText = i.label + '>$0';
					}
					item.insertText = insertText ? new vs.SnippetString(insertText) : null;
					item.detail = i.docSummary;
					const docs = cleanDartdoc(i.docComplete);
					(item as any)._documentation = docs ? new MarkdownString(docs) : undefined;
					completions.push(item);
					temp[i.label] = true;
				}
			});
		});

		return completions;
	}

	private getClosingTagNameCompletions(document: TextDocument, position: Position): CompletionItem[] {
		const xPath = getXPath(document, position);
		const parentTag = xPath[xPath.length - 1];
		const suggestion = new CompletionItem('/' + parentTag);
		suggestion.detail = 'Closing tag';
		return [suggestion];
	}

	private async getAttributeCompletions(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
		const xPath = getXPath(document, position);
		const tag = xPath[xPath.length - 1];
		const isTopLevelElement = xPath.length === 1;
		const isSecondLevelElement = xPath.length === 2;
		const isCustomTag = tag.length && /[a-z].*/g.test(tag[0]);

		if (isTopLevelElement) {
			return await this.getTopLevelElementAttributesCompletions(document, position);
		}
		if (isCustomTag) {
			if (isSecondLevelElement) {
				return await this.getSecondLevelElementAttributesCompletions(tag, document, position);
			}
			return this.getAttributeCompletionsForAttribute(tag, document, position);
		}

		return await this.getAttributeCompletionsForElement(tag, false, document, position, token);
	}

	private async getAttributeCompletionsForElement(elementTag: string, isTag: boolean, xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<CompletionItem[]> {
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = await getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, null);

		const line = xmlDocument.lineAt(xmlPosition.line).text.slice(0, xmlPosition.character);
		const nextCharacter = xmlDocument.getText(new Range(xmlPosition, xmlPosition.translate({ characterDelta: 200 }))).trim().substr(0, 1);
		const conf = config.for(xmlDocument.uri);
		const enableCommitCharacters = conf.enableCompletionCommitCharacters;
		const insertArgumentPlaceholders = !enableCommitCharacters && conf.insertArgumentPlaceholders && this.shouldAllowArgPlaceholders(line);
		const resp = await this.analyzer.completionGetSuggestionsResults({
			file: fsPath(dartDocument.uri),
			offset: dartOffset,
		});

		// get used attributes
		// todo
		const currentUsedAttributes: string[] = [];

		// map results
		const includedResults = resp.results
			.filter((a: any) => currentUsedAttributes.indexOf(a.displayText || a.completion) === -1)
			.map((r: any) => {
				const a = this.convertResult(xmlDocument, nextCharacter, enableCommitCharacters, insertArgumentPlaceholders, resp, r);
				const item = new vs.CompletionItem(a.label.replace(':', ''), a.kind);
				(item as any)._documentation = (a as any)._documentation;
				if (isTag) {
					// item.insertText = new SnippetString(item.label + '>$0</' + item.label + '>');
					item.insertText = new SnippetString(item.label + '>$0');
				}
				else {
					item.insertText = new SnippetString(item.label + '="$0"');
				}
				item.detail = a.detail;
				item.filterText = a.filterText;
				item.sortText = a.sortText;
				return item;
			});

		const cachedResults = await this.getCachedResults(xmlDocument, token, nextCharacter, enableCommitCharacters, insertArgumentPlaceholders, xmlDocument.offsetAt(xmlPosition), resp);
		return [...includedResults, ...cachedResults, ...(isTag ? this.getWrapperPropertiesElementsCompletionItems() : this.getWrapperPropertiesCompletionItems())];
	}

	private getAttributeCompletionsForAttribute(elementTag: string, document: TextDocument, position: Position): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items: vs.CompletionItem[] = [];
		Object.keys(handlers)
			.filter((k) => handlers[k].isElement && elementTag === k)
			.forEach((k) => {
				handlers[k].elementAttributes.forEach((a) => {
					items.push(this.createCompletionItem(a, vs.CompletionItemKind.Variable));
				});
			});
		return items;
	}

	private getWrapperPropertiesCompletionItems(): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items = Object.keys(handlers)
			.filter((k) => !handlers[k].isElement)
			.map((k) => {
				return this.createCompletionItem(k, vs.CompletionItemKind.Variable);
			});
		return items;
	}

	private getWrapperPropertiesElementsCompletionItems(): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items = Object.keys(handlers)
			.filter((k) => handlers[k].isElement)
			.map((k) => {
				return this.createCompletionItem(k, vs.CompletionItemKind.Variable, true);
			});
		return items;
	}

	private getTopLevelElementAttributesCompletions(document: TextDocument, position: Position): vs.CompletionItem[] {
		return [
			this.createCompletionItem('xmlns', vs.CompletionItemKind.Variable),
			this.createCompletionItem('controller', vs.CompletionItemKind.Variable),
			this.createCompletionItem('routeAware', vs.CompletionItemKind.Variable),
		];
	}

	private getSecondLevelElementCompletions(document: TextDocument, position: Position): vs.CompletionItem[] {
		return [
			this.createCompletionItem('provider', vs.CompletionItemKind.Class),
			this.createCompletionItem('with', vs.CompletionItemKind.Class),
			this.createCompletionItem('var', vs.CompletionItemKind.Class),
			this.createCompletionItem('param', vs.CompletionItemKind.Class),
		];
	}

	private getSecondLevelElementAttributesCompletions(elementTag: string, document: TextDocument, position: Position): vs.CompletionItem[] {
		const elements: { [name: string]: vs.CompletionItem[] } = {
			'provider': [
				this.createCompletionItem('type', vs.CompletionItemKind.Variable),
				this.createCompletionItem('name', vs.CompletionItemKind.Variable),
			],
			'with': [
				this.createCompletionItem('mixin', vs.CompletionItemKind.Variable),
			],
			'var': [
				this.createCompletionItem('type', vs.CompletionItemKind.Variable),
				this.createCompletionItem('name', vs.CompletionItemKind.Variable),
				this.createCompletionItem('value', vs.CompletionItemKind.Variable),
			],
			'param': [
				this.createCompletionItem('type', vs.CompletionItemKind.Variable),
				this.createCompletionItem('name', vs.CompletionItemKind.Variable),
			],
		};

		return elements[elementTag];
	}

	private createCompletionItem(label: string, kind: vs.CompletionItemKind, isTag = false): vs.CompletionItem {
		let insertText = '';
		if (kind === vs.CompletionItemKind.Variable && !isTag) {
			insertText = label + '="$0"';
		}
		else {
			insertText = label + '>$0';
		}

		const item = new vs.CompletionItem(label, kind);
		item.insertText = insertText ? new vs.SnippetString(insertText) : null;
		return item;
	}

	private getAttributeValueCompletions(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
		const completions: CompletionItem[] = [];

		// Get the attribute name
		const wordRange = document.getWordRangeAtPosition(position);
		const wordStart = wordRange ? wordRange.start : position;
		const line = document.getText(new Range(wordStart.line, 0, wordStart.line, wordStart.character));
		const attrNamePattern = /[\.\-:_a-zA-Z0-9]+=/g;
		const match = line.match(attrNamePattern);

		if (!match) {
			return [];
		}

		let attrName = match.reverse()[0];
		attrName = attrName.slice(0, -1);

		// Get the XPath
		const xPath = getXPath(document, position);
		const isTopLevelElement = xPath.length === 1;
		const isSecondLevelElement = xPath.length === 2;

		if (isTopLevelElement) {
			return this.getTopLevelAttributeValueCompletions(attrName);
		}
		if (isSecondLevelElement) {
			const tag = xPath[xPath.length - 1];
			const isCustomTag = tag.length && /[a-z].*/g.test(tag[0]);
			if (isCustomTag) {
				return this.getSecondLevelAttributeValueCompletions(tag, attrName);
			}
		}

		// todo
		const children: any[] = [];

		// Apply a filter with the current prefix and return.
		children.forEach((child: any) => {
			const suggestion = new CompletionItem(child.displayText);
			suggestion.detail = child.rightLabel;
			completions.push(suggestion);
		});

		return completions;
	}

	private getTopLevelAttributeValueCompletions(attrName: string): vs.CompletionItem[] {
		if (attrName.startsWith('xmlns')) {
			// todo
		}
		return [];
	}

	private getSecondLevelAttributeValueCompletions(tag: string, attrName: string): vs.CompletionItem[] {
		if (attrName === 'type') {
			// todo
		}
		return [];
	}

	private shouldAllowCompletion(line: string, context: CompletionContext): boolean {
		line = line.trim();
		// Filter out auto triggered completions on certain characters based on the previous
		// characters (eg. to allow completion on " if it's part of an import).
		if (context.triggerKind === CompletionTriggerKind.TriggerCharacter) {
			switch (context.triggerCharacter) {
				case "{":
					return line.endsWith("${");
				case "'":
					return line.endsWith("import '") || line.endsWith("export '");
				case "\"":
					return line.endsWith("import \"") || line.endsWith("export \"");
				case "/":
				case "\\":
					return line.startsWith("import \"") || line.startsWith("export \"")
						|| line.startsWith("import '") || line.startsWith("export '");
			}
		}

		// Otherwise, allow through.
		return true;
	}

	private shouldAllowArgPlaceholders(line: string): boolean {
		line = line.trim();

		// Disallow args on imports/exports since they're likely show/hide and
		// we only want the function name. This doesn't catch all cases (for ex.
		// where a show/hide is split across multiple lines) but it's better than
		// nothing. We'd need more semantic info to handle this better, and probably
		// this will go away if commit characters is fixed properly.
		if (line.startsWith("import \"") || line.startsWith("export \"")
			|| line.startsWith("import '") || line.startsWith("export '")) {
			return false;
		}

		return true;
	}

	private storeCompletionSuggestions(notification: as.CompletionAvailableSuggestionsNotification) {
		if (notification.changedLibraries) {
			for (const completionSet of notification.changedLibraries) {
				this.cachedCompletions[completionSet.id] = completionSet;
			}
		}
		if (notification.removedLibraries) {
			for (const completionSetID of notification.removedLibraries) {
				delete this.cachedCompletions[completionSetID];
			}
		}
		this.cachedCompletionsArray = Object.keys(this.cachedCompletions).map((a) => this.cachedCompletions[a as any]);
	}

	private storeExistingImports(notification: as.CompletionExistingImportsNotification) {
		const existingImports = notification.imports;

		// Map with key "elementName/elementDeclaringLibraryUri"
		// Value is a set of imported URIs that import that element.
		const alreadyImportedSymbols: { [key: string]: { [key: string]: boolean } } = {};
		for (const existingImport of existingImports.imports) {
			for (const importedElement of existingImport.elements) {
				// This is the symbol name and declaring library. That is, the
				// library that declares the symbol, not the one that was imported.
				// This wil be the same for an element that is re-exported by other
				// libraries, so we can avoid showing the exact duplicate.
				const elementName = existingImports.elements.strings[existingImports.elements.names[importedElement]];
				const elementDeclaringLibraryUri = existingImports.elements.strings[existingImports.elements.uris[importedElement]];

				const importedUri = existingImports.elements.strings[existingImport.uri];

				const key = `${elementName}/${elementDeclaringLibraryUri}`;
				if (!alreadyImportedSymbols[key])
					alreadyImportedSymbols[key] = {};
				alreadyImportedSymbols[key][importedUri] = true;
			}
		}

		this.existingImports[notification.file] = alreadyImportedSymbols;
	}

	public async resolveCompletionItem(item: DelayedCompletionItem, token: CancellationToken): Promise<CompletionItem | undefined> {
		if (!item.suggestion) {
			if (!item.documentation && item._documentation) {
				item.documentation = item._documentation;
			}
			return item;
		}

		const res = await this.analyzer.completionGetSuggestionDetails({
			file: item.filePath,
			id: item.suggestionSetID,
			label: item.suggestion.label,
			offset: item.offset,
		});

		if (token && token.isCancellationRequested) {
			return;
		}

		// Rebuild the completion using the additional resolved info.
		return this.createCompletionItemFromSuggestion(
			item.document,
			item.nextCharacter,
			item.enableCommitCharacters,
			item.insertArgumentPlaceholders,
			item.replacementOffset,
			item.replacementLength,
			item.autoImportUri,
			item.relevance,
			item.suggestion,
			res,
		);
	}

	private createCompletionItemFromSuggestion(
		document: TextDocument,
		nextCharacter: string,
		enableCommitCharacters: boolean,
		insertArgumentPlaceholders: boolean,
		replacementOffset: number,
		replacementLength: number,
		displayUri: string | undefined,
		relevance: number,
		suggestion: as.AvailableSuggestion,
		resolvedResult: as.CompletionGetSuggestionDetailsResponse | undefined,
	) {
		const completionItem = this.makeCompletion(document, nextCharacter, enableCommitCharacters, insertArgumentPlaceholders, {
			autoImportUri: displayUri,
			completionText: (resolvedResult && resolvedResult.completion) || suggestion.label,
			displayText: suggestion.label, // Keep the label for display, so we don't update to show "prefix0" as the user moves to it.
			docSummary: suggestion.docSummary,
			elementKind: suggestion.element ? suggestion.element.kind : undefined,
			isDeprecated: false,
			kind: undefined, // This is only used when there's no element (eg. keyword completions) that won't happen here.
			parameterNames: suggestion.parameterNames,
			parameterType: undefined, // Unimported completions can't be parameters.
			parameters: suggestion.element ? suggestion.element.parameters : undefined,
			relevance,
			replacementLength,
			replacementOffset,
			requiredParameterCount: suggestion.requiredParameterCount,
			returnType: suggestion.element ? suggestion.element.returnType : undefined,
			selectionLength: resolvedResult && resolvedResult.change && resolvedResult.change.selection ? 0 : undefined as any,
			selectionOffset: resolvedResult && resolvedResult.change && resolvedResult.change.selection ? resolvedResult.change.selection.offset : undefined as any,
		});

		// Additional edits for the imports.
		if (resolvedResult && resolvedResult.change && resolvedResult.change.edits && resolvedResult.change.edits.length) {
			this.appendAdditionalEdits(completionItem, document, resolvedResult.change);
			if (displayUri)
				completionItem.detail = `Auto import from '${displayUri}'` + (completionItem.detail ? `\n\n${completionItem.detail}` : "");
		}

		// Copy the lazy docs over.
		if (resolvedResult && !completionItem.documentation && completionItem._documentation) {
			completionItem.documentation = completionItem._documentation;
		}

		return completionItem;
	}

	private async getCachedResults(
		document: TextDocument,
		token: CancellationToken,
		nextCharacter: string,
		enableCommitCharacters: boolean,
		insertArgumentPlaceholders: boolean,
		offset: number,
		resp: as.CompletionResultsNotification,
	): Promise<CompletionItem[] | undefined> {
		if (!resp.includedSuggestionSets || !resp.includedElementKinds)
			return [];

		const existingImports = resp.libraryFile ? this.existingImports[resp.libraryFile] : undefined;

		// Create a fast lookup for which kinds to include.
		const elementKinds: { [key: string]: boolean } = {};
		resp.includedElementKinds.forEach((k) => elementKinds[k] = true);

		// Create a fast lookup for relevance boosts based on tag string.
		const tagBoosts: { [key: string]: number } = {};
		resp.includedSuggestionRelevanceTags!.forEach((r) => tagBoosts[r.tag] = r.relevanceBoost);

		const filePath = fsPath(document.uri);
		const suggestionSetResults: CompletionItem[][] = [];
		// Keep track of suggestion sets we've seen to avoid included them twice.
		// See https://github.com/dart-lang/sdk/issues/37211.
		const usedSuggestionSets: { [key: number]: boolean } = {};
		for (const includedSuggestionSet of resp.includedSuggestionSets) {
			if (usedSuggestionSets[includedSuggestionSet.id])
				continue;

			// Mark that we've done this one so we don't do it again.
			usedSuggestionSets[includedSuggestionSet.id] = true;

			// Because this work is expensive, we periodically (per suggestion
			// set) yield and check whether cancellation is pending and if so
			// stop and bail out to avoid doing redundant work.
			await resolvedPromise;
			if (token && token.isCancellationRequested) {
				return undefined;
			}

			const suggestionSet = this.cachedCompletions[includedSuggestionSet.id];
			if (!suggestionSet) {
				this.logger.warn(`Suggestion set ${includedSuggestionSet.id} was not available and therefore not included in the completion results`);
				return [];
			}

			const unresolvedItems = suggestionSet.items
				.filter((r) => elementKinds[r.element.kind])
				.filter((suggestion) => {
					// Check existing imports to ensure we don't already import
					// this element (note: this exact element from its declaring
					// library, not just something with the same name). If we do
					// we'll want to skip it.
					const key = `${suggestion.label}/${suggestion.declaringLibraryUri}`;
					const importingUris = existingImports && existingImports[key];

					// Keep it only if there are either:
					// - no URIs importing it
					// - the URIs importing it include this one
					return !importingUris || importingUris[suggestionSet.uri];
				})
				.map((suggestion): DelayedCompletionItem => {
					// Calculate the relevance for this item.
					let relevanceBoost = 0;
					if (suggestion.relevanceTags)
						suggestion.relevanceTags.forEach((t) => relevanceBoost = Math.max(relevanceBoost, tagBoosts[t] || 0));

					const completionItem = this.createCompletionItemFromSuggestion(
						document,
						nextCharacter,
						enableCommitCharacters,
						insertArgumentPlaceholders,
						resp.replacementOffset,
						resp.replacementLength,
						undefined,
						includedSuggestionSet.relevance + relevanceBoost,
						suggestion,
						undefined,
					);

					// Attach additional info that resolve will need.
					const delayedCompletionItem: DelayedCompletionItem = {
						autoImportUri: includedSuggestionSet.displayUri || suggestionSet.uri,
						document,
						enableCommitCharacters,
						filePath,
						insertArgumentPlaceholders,
						nextCharacter,
						offset,
						relevance: includedSuggestionSet.relevance + relevanceBoost,
						replacementLength: resp.replacementLength,
						replacementOffset: resp.replacementOffset,
						suggestion,
						suggestionSetID: includedSuggestionSet.id,
						...completionItem,
					};

					return delayedCompletionItem;
				});
			suggestionSetResults.push(unresolvedItems);
		}

		return [].concat(...suggestionSetResults as any);
	}

	private convertResult(
		document: TextDocument,
		nextCharacter: string,
		enableCommitCharacters: boolean,
		insertArgumentPlaceholders: boolean,
		notification: as.CompletionResultsNotification,
		suggestion: as.CompletionSuggestion,
	): CompletionItem {
		return this.makeCompletion(document, nextCharacter, enableCommitCharacters, insertArgumentPlaceholders, {
			completionText: suggestion.completion,
			displayText: suggestion.displayText,
			docSummary: suggestion.docSummary,
			elementKind: suggestion.element ? suggestion.element.kind : undefined,
			isDeprecated: suggestion.isDeprecated,
			kind: suggestion.kind,
			parameterNames: suggestion.parameterNames,
			parameterType: suggestion.parameterType,
			parameters: suggestion.element ? suggestion.element.parameters : undefined,
			relevance: suggestion.relevance,
			replacementLength: notification.replacementLength,
			replacementOffset: notification.replacementOffset,
			requiredParameterCount: suggestion.requiredParameterCount,
			returnType: suggestion.returnType || (suggestion.element ? suggestion.element.returnType : undefined),
			selectionLength: suggestion.selectionLength,
			selectionOffset: suggestion.selectionOffset,
		});
	}

	private makeCompletion(
		document: TextDocument,
		nextCharacter: string,
		enableCommitCharacters: boolean,
		insertArgumentPlaceholders: boolean,
		suggestion: {
			autoImportUri?: string,
			completionText: string,
			displayText: string | undefined,
			docSummary: string | undefined,
			elementKind: as.ElementKind | undefined,
			isDeprecated: boolean,
			kind: as.CompletionSuggestionKind | undefined,
			parameterNames: string[] | undefined,
			parameters: string | undefined,
			parameterType: string | undefined,
			relevance: number,
			replacementLength: number,
			replacementOffset: number,
			requiredParameterCount: number | undefined,
			returnType: string | undefined,
			selectionLength: number,
			selectionOffset: number,
		}): LazyCompletionItem {

		const completionItemKind = suggestion.elementKind ? this.getElementKind(suggestion.elementKind) : undefined;
		let label = suggestion.displayText || suggestion.completionText;
		let detail = "";
		const completionText = new SnippetString();
		let triggerCompletion = false;

		const nextCharacterIsOpenParen = nextCharacter === "(";

		// If element has parameters (METHOD/CONSTRUCTOR/FUNCTION), show its parameters.
		if (suggestion.parameters && completionItemKind !== CompletionItemKind.Property && suggestion.kind !== "OVERRIDE"
			// Don't ever show if there is already a paren! (#969).
			&& label.indexOf("(") === -1
		) {
			label += suggestion.parameters.length === 2 ? "()" : "(…)";
			detail = suggestion.parameters;

			const hasParams = suggestion.parameterNames && suggestion.parameterNames.length > 0;

			// Add placeholders for params to the completion.
			if (insertArgumentPlaceholders && hasParams && !nextCharacterIsOpenParen) {
				completionText.appendText(suggestion.completionText);
				const args = suggestion.parameterNames!.slice(0, suggestion.requiredParameterCount);
				completionText.appendText("(");
				if (args.length) {
					completionText.appendPlaceholder(args[0]);
					for (const arg of args.slice(1)) {
						completionText.appendText(", ");
						completionText.appendPlaceholder(arg);
					}
				} else
					completionText.appendTabstop(0); // Put a tap stop between parens since there are optional args.
				completionText.appendText(")");
			} else if (insertArgumentPlaceholders && !nextCharacterIsOpenParen) {
				completionText.appendText(suggestion.completionText);
				completionText.appendText("(");
				if (hasParams)
					completionText.appendTabstop(0);
				completionText.appendText(")");
			} else {
				completionText.appendText(suggestion.completionText);
			}
		}
		else if (suggestion.selectionOffset > 0) {
			const before = suggestion.completionText.slice(0, suggestion.selectionOffset);
			const selection = suggestion.completionText.slice(suggestion.selectionOffset, suggestion.selectionOffset + suggestion.selectionLength);
			// If we have a selection offset (eg. a place to put the cursor) but not any text to pre-select then
			// pop open the completion to help the user type the value.
			// Only do this if it ends with a space (argument completion), see #730.
			if (!selection && suggestion.completionText.slice(suggestion.selectionOffset - 1, suggestion.selectionOffset) === " ")
				triggerCompletion = true;
			const after = suggestion.completionText.slice(suggestion.selectionOffset + suggestion.selectionLength);

			completionText.appendText(before);
			if (selection)
				completionText.appendPlaceholder(selection);
			else
				completionText.appendTabstop(0);
			completionText.appendText(after);
		}
		else {
			completionText.appendText(suggestion.completionText);
		}

		// If we're a property, work out the type.
		if (completionItemKind === CompletionItemKind.Property) {
			// Setters appear as methods with one arg (and cause getters to not appear),
			// so treat them both the same and just display with the properties type.
			detail = suggestion.elementKind === "GETTER"
				? suggestion.returnType!
				// See https://github.com/dart-lang/sdk/issues/27747
				: suggestion.parameters ? suggestion.parameters.substring(1, suggestion.parameters.lastIndexOf(" ")) : "";
			// Otherwise, get return type from method.
		}
		else if (suggestion.returnType) {
			detail =
				detail === ""
					? suggestion.returnType
					: detail + " → " + suggestion.returnType;
		}
		else if (suggestion.parameterType) {
			detail = suggestion.parameterType;
		}

		// If we have trailing commas (flutter) they look weird in the list, so trim the off (for display label only).
		if (label.endsWith(","))
			label = label.substr(0, label.length - 1).trim();

		// If we didnt have a CompletionItemKind from our element, base it on the CompletionSuggestionKind.
		// This covers things like Keywords that don't have elements.
		const kind = completionItemKind || (suggestion.kind ? this.getSuggestionKind(suggestion.kind, label) : undefined);
		const docs = cleanDartdoc(suggestion.docSummary);

		const completion: LazyCompletionItem = new CompletionItem(label, kind);
		completion.filterText = label.split("(")[0]; // Don't ever include anything after a ( in filtering.
		completion.detail = suggestion.isDeprecated || detail
			? (suggestion.isDeprecated ? "(deprecated) " : "") + (detail || "")
			: undefined;
		completion._documentation = docs ? new MarkdownString(docs) : undefined;
		completion.insertText = completionText;
		completion.keepWhitespace = true;
		completion.range = new Range(
			document.positionAt(suggestion.replacementOffset),
			document.positionAt(suggestion.replacementOffset + suggestion.replacementLength),
		);
		if (enableCommitCharacters)
			completion.commitCharacters = this.getCommitCharacters(suggestion.kind!);

		const triggerCompletionsFor = ["import '';"];
		if (triggerCompletionsFor.indexOf(label) !== -1)
			triggerCompletion = true;

		// Handle folders in imports better.
		if (suggestion.kind === "IMPORT" && label.endsWith("/"))
			triggerCompletion = true;

		if (triggerCompletion) {
			completion.command = {
				command: "editor.action.triggerSuggest",
				title: "Suggest",
			};
		}

		// Relevance is a number, highest being best. Code sorts by text, so subtract from a large number so that
		// a text sort will result in the correct order.
		// 555 -> 999455
		//  10 -> 999990
		//   1 -> 999999
		completion.sortText = (1000000 - suggestion.relevance).toString() + label.trim();
		return completion;
	}

	private getSuggestionKind(kind: as.CompletionSuggestionKind, label: string): CompletionItemKind | undefined {
		switch (kind) {
			case "ARGUMENT_LIST":
				return CompletionItemKind.Variable;
			case "IMPORT":
				return label.startsWith("dart:")
					? CompletionItemKind.Module
					: path.extname(label.toLowerCase()) === ".dart"
						? CompletionItemKind.File
						: CompletionItemKind.Folder;
			case "IDENTIFIER":
				return CompletionItemKind.Variable;
			case "INVOCATION":
				return CompletionItemKind.Method;
			case "KEYWORD":
				return CompletionItemKind.Keyword;
			case "NAMED_ARGUMENT":
				return CompletionItemKind.Variable;
			case "OPTIONAL_ARGUMENT":
				return CompletionItemKind.Variable;
			case "PARAMETER":
				return CompletionItemKind.Value;
		}
		return undefined;
	}

	private getElementKind(kind: as.ElementKind): CompletionItemKind | undefined {
		switch (kind) {
			case "CLASS":
			case "CLASS_TYPE_ALIAS":
				return CompletionItemKind.Class;
			case "COMPILATION_UNIT":
				return CompletionItemKind.Module;
			case "CONSTRUCTOR":
			case "CONSTRUCTOR_INVOCATION":
				return CompletionItemKind.Constructor;
			case "ENUM":
				return CompletionItemKind.Enum;
			case "ENUM_CONSTANT":
				return CompletionItemKind.EnumMember;
			case "FIELD":
				return CompletionItemKind.Field;
			case "FILE":
				return CompletionItemKind.File;
			case "FUNCTION":
			case "FUNCTION_TYPE_ALIAS":
				return CompletionItemKind.Function;
			case "GETTER":
				return CompletionItemKind.Property;
			case "LABEL":
			case "LIBRARY":
				return CompletionItemKind.Module;
			case "LOCAL_VARIABLE":
				return CompletionItemKind.Variable;
			case "METHOD":
				return CompletionItemKind.Method;
			case "PARAMETER":
			case "PREFIX":
				return CompletionItemKind.Variable;
			case "SETTER":
				return CompletionItemKind.Property;
			case "TOP_LEVEL_VARIABLE":
			case "TYPE_PARAMETER":
				return CompletionItemKind.Variable;
			case "UNIT_TEST_GROUP":
				return CompletionItemKind.Module;
			case "UNIT_TEST_TEST":
				return CompletionItemKind.Method;
			case "UNKNOWN":
				return CompletionItemKind.Value;
		}
		return undefined;
	}

	private getCommitCharacters(kind: as.CompletionSuggestionKind): string[] | undefined {
		switch (kind) {
			case "IDENTIFIER":
			case "INVOCATION":
				return [".", ",", "(", "["];
		}
		return undefined;
	}

	private appendAdditionalEdits(completionItem: vs.CompletionItem, document: vs.TextDocument, change: as.SourceChange | undefined): void {
		if (!change)
			return undefined;

		// VS Code expects offsets to be based on the original document, but the analysis server provides
		// them assuming all previous edits have already been made. This means if the server provides us a
		// set of edits where any edits offset is *equal to or greater than* a previous edit, it will do the wrong thing.
		// If this happens; we will fall back to sequential edits and write a warning.
		const hasProblematicEdits = hasOverlappingEdits(change);

		if (hasProblematicEdits) {
			this.logger.error("Unable to insert imports because of overlapping edits from the server.");
			vs.window.showErrorMessage(`Unable to insert imports because of overlapping edits from the server`);
			return undefined;
		}

		const filePath = fsPath(document.uri);
		const thisFilesEdits = change.edits.filter((e) => e.file === filePath);
		const otherFilesEdits = change.edits.filter((e) => e.file !== filePath);

		if (thisFilesEdits.length) {
			completionItem.additionalTextEdits = flatMap(thisFilesEdits, (edit) => {
				return edit.edits.map((edit) => {
					const range = new vs.Range(
						document.positionAt(edit.offset),
						document.positionAt(edit.offset + edit.length),
					);
					return new vs.TextEdit(range, edit.replacement);
				});
			});
		}
		if (otherFilesEdits.length) {
			const filteredSourceChange: as.SourceChange = {
				edits: otherFilesEdits,
				id: change.id,
				linkedEditGroups: undefined as any,
				message: change.message,
				selection: change.selection,
			};
			completionItem.command = {
				arguments: [document, filteredSourceChange],
				command: "_dart.applySourceChange",
				title: "Automatically add imports",
			};
		}
	}

	public dispose(): any {
		this.disposables.forEach((d) => d.dispose());
	}
}
