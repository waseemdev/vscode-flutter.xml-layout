import * as vs from "vscode";
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemProvider, CompletionList, Position, Range, SnippetString, TextDocument, commands, Hover } from "vscode";
import { getXPath, isAttributeValue, isAttribute, isTagName, isClosingTagName } from "../xmlUtils";
import { PropertyHandlerProvider } from "../../providers/property-handler-provider";
import { PropertyResolver } from "../../resolvers/property-resolver";
import { getDartDocument, getDartCodeIndex } from "../utils";

export class DartCompletionItemProvider implements CompletionItemProvider {

	constructor(
		private propertyHandlerProvider: PropertyHandlerProvider,
		private propertyResolver: PropertyResolver) {
	}

	public async provideCompletionItems(
		document: TextDocument, position: Position, 
		token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined> {
		let allResults: any[] = [];
		
		if (isTagName(document, position) || isClosingTagName(document, position)) {
			allResults = (await this.getTagNameCompletions(document, position, token)).concat(this.getClosingTagNameCompletions(document, position));
		}
		else if (isAttribute(document, position)) {
			allResults = await this.getAttributeCompletions(document, position, token);
		}
		else if (isAttributeValue(document, position)) {
			allResults = await this.getValueCompletions(document, position, token);
		}

		return new CompletionList(allResults);
	}

	private async getTagNameCompletions(xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<CompletionItem[]> {
		const completions: vs.CompletionItem[] = [];

		const line = xmlDocument.lineAt(xmlPosition.line).text.slice(0, xmlPosition.character);
		const segments = line.split(/[ <>"']/g);
		let tag = segments[segments.length - 1];
		const xPath = getXPath(xmlDocument, xmlPosition);
		const parentTag = xPath[xPath.length - 1];
		const isTopLevelElement = xPath.length === 0;
		const isSecondLevelElement = xPath.length === 1;
		const isAttributeOrCustomTag = tag.length && /[a-z].*/g.test(tag[0]);

		if (isTopLevelElement) {
			return [];
		}
		if (isAttributeOrCustomTag) {
			if (isSecondLevelElement) {
				return this.getSecondLevelElementCompletions(xmlDocument, xmlPosition);
			}
			else {
				return await this.getAttributeCompletionsForElement(parentTag, true, xmlDocument, xmlPosition, token);
			}
		}
		else if (!tag.length) {
			if (isSecondLevelElement) {
				completions.push(...await this.getSecondLevelElementCompletions(xmlDocument, xmlPosition));
			}
			completions.push(...await this.getAttributeCompletionsForElement(parentTag, true, xmlDocument, xmlPosition, token));
		}

		const dartDocument = await getDartDocument(xmlDocument);
		const dartCode = dartDocument.getText();
		const buildMethod = 'Widget build(BuildContext context) {';
		const dartOffset = dartCode.indexOf(buildMethod) + buildMethod.length;
		const nextCharacter = xmlDocument.getText(new Range(xmlPosition, xmlPosition.translate({ characterDelta: 1 })));
		const completionList: vs.CompletionList = await this.getCompletionItems(dartDocument, dartOffset);
		completionList.items = completionList.items
			.filter(a => a.kind == vs.CompletionItemKind.Constructor)
			.map(item => {
				item.range = null;
				item.kind = vs.CompletionItemKind.Property;
				item.label = item.label.replace('(…)', '').replace('()', '');
				this.createSnippetString(true, item, nextCharacter);
				return item;
			});
		
		const result = [...completions, ...completionList.items];
		return result;
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

	private getUnnamedArgsRange(tag: string, dartDocument: TextDocument, offset: number): number {
		const dart = dartDocument.getText();
		offset = dart.indexOf(' ' + tag + '(', offset - tag.length - 4);
		const pos = dartDocument.positionAt(offset).translate({ lineDelta: 1, characterDelta: 200 });
		offset = dartDocument.offsetAt(pos);
		return offset;
	}

	private async getAttributeCompletionsForElement(elementTag: string, isTag: boolean, xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<CompletionItem[]> {
		const dartDocument = await getDartDocument(xmlDocument);
		const hasUnnamedArgs = !!this.propertyResolver.getUnNamedParameter(elementTag);
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		let dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange, false, !!elementTag, hasUnnamedArgs);
		if (hasUnnamedArgs) {
			dartOffset = this.getUnnamedArgsRange(elementTag, dartDocument, dartOffset);
		}

		// const line = xmlDocument.lineAt(xmlPosition.line).text.slice(0, xmlPosition.character);
		const nextCharacter = xmlDocument.getText(new Range(xmlPosition, xmlPosition.translate({ characterDelta: 200 }))).trim().substr(0, 1);

		const completionList: vs.CompletionList = await this.getCompletionItems(dartDocument, dartOffset);
		const result = completionList.items
			.filter(a => a.kind === vs.CompletionItemKind.Property || 
				a.kind === vs.CompletionItemKind.Field || 
				a.kind === vs.CompletionItemKind.Variable)
			.map(item => {
				item.range = null;
				item.label = item.label.replace(':', '');
				this.createSnippetString(isTag, item, nextCharacter);
				return item;
			});
		return [...result.filter(a => a.kind == vs.CompletionItemKind.Variable), ...(isTag ? this.getWrapperPropertiesElementsCompletionItems(xmlDocument, xmlPosition) : this.getWrapperPropertiesCompletionItems(xmlDocument, xmlPosition))];
	}

	private getAttributeCompletionsForAttribute(elementTag: string, document: TextDocument, position: Position): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items: vs.CompletionItem[] = [];
		Object.keys(handlers)
			.filter((k) => handlers[k].isElement && elementTag === k)
			.forEach((k) => {
				(handlers[k].elementAttributes as any[]).forEach((a) => {
					items.push(this.createCustomCompletionItem(document, position, a.name, vs.CompletionItemKind.Variable, false, '="' + a.snippet + '"'));
				});
			});
		return items;
	}

	private getWrapperPropertiesCompletionItems(document: TextDocument, position: Position): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items = Object.keys(handlers)
			.filter((k) => !handlers[k].isElement)
			.map((k) => {
				return this.createCustomCompletionItem(document, position, k, vs.CompletionItemKind.Variable, false, handlers[k].valueSnippet);
			});
		return items;
	}

	private getWrapperPropertiesElementsCompletionItems(document: TextDocument, position: Position): vs.CompletionItem[] {
		const handlers = this.propertyHandlerProvider.getAll();
		const items = Object.keys(handlers)
			.filter((k) => handlers[k].isElement)
			.map((k) => {
				return this.createCustomCompletionItem(document, position, k, vs.CompletionItemKind.Variable, true, handlers[k].valueSnippet);
			});
		return items;
	}

	private getTopLevelElementAttributesCompletions(document: TextDocument, position: Position): vs.CompletionItem[] {
		return [
			this.createCustomCompletionItem(document, position, 'xmlns', vs.CompletionItemKind.Variable),
			this.createCustomCompletionItem(document, position, 'controller', vs.CompletionItemKind.Variable),
			this.createCustomCompletionItem(document, position, 'routeAware', vs.CompletionItemKind.Variable),
		];
	}

	private getSecondLevelElementCompletions(document: TextDocument, position: Position): vs.CompletionItem[] {
		return [
			this.createCustomCompletionItem(document, position, 'provider', vs.CompletionItemKind.Property, true, ' type="$0" name="$1">$2'),
			this.createCustomCompletionItem(document, position, 'with', vs.CompletionItemKind.Property, true, ' mixin="$0">$1'),
			this.createCustomCompletionItem(document, position, 'var', vs.CompletionItemKind.Property, true, ' name="$0" value="$1">$2'),
			this.createCustomCompletionItem(document, position, 'param', vs.CompletionItemKind.Property, true, ' type="$0" name="$1">$2'),
		];
	}

	private getSecondLevelElementAttributesCompletions(elementTag: string, document: TextDocument, position: Position): vs.CompletionItem[] {
		const elements: { [name: string]: vs.CompletionItem[] } = {
			'provider': [
				this.createCustomCompletionItem(document, position, 'type', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'name', vs.CompletionItemKind.Variable),
			],
			'with': [
				this.createCustomCompletionItem(document, position, 'mixin', vs.CompletionItemKind.Variable),
			],
			'var': [
				this.createCustomCompletionItem(document, position, 'type', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'name', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'value', vs.CompletionItemKind.Variable),
			],
			'param': [
				this.createCustomCompletionItem(document, position, 'type', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'name', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'required', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'value', vs.CompletionItemKind.Variable),
				this.createCustomCompletionItem(document, position, 'superParamName', vs.CompletionItemKind.Variable),
			],
		};

		return elements[elementTag];
	}

	private createCustomCompletionItem(document: TextDocument, position: Position, label: string, kind: vs.CompletionItemKind, isTag = false, snippet?: string): vs.CompletionItem {
		const nextCharacter = document.getText(new Range(position, position.translate({ characterDelta: 1 })));
		const line = document.lineAt(position).text.substring(0, position.character);
		const isAttribute = kind === vs.CompletionItemKind.Variable && !isTag;

		const bothHasStartingColon = line.substr(line.lastIndexOf(' ', line.length) + 1).startsWith(':') && label.startsWith(':');
		label = bothHasStartingColon ? label.substr(1) : label;

		const item = new vs.CompletionItem(label, kind);
		this.createSnippetString(!isAttribute, item, nextCharacter, snippet);
		return item;
	}

	private createSnippetString(isTag: boolean, item: vs.CompletionItem, nextCharacter: string, snippet: string = null) {
		let insertText = '';
		let name = item.label;
		if (isTag) {
			if (name.indexOf('.') !== -1) {
				const parts = name.split('.');
				name = parts[0];
				insertText = name + ' :use="' + parts[1] + '"' + (snippet ? ' ' + snippet : '') + (nextCharacter === '>' ? '' : '>') + (snippet ? '' : '$0');
			}
			else {
				insertText = name + (snippet ? ' ' + snippet : '') + (nextCharacter === '>' ? '' : '>') + (snippet ? '' : '$0');
			}
			if (nextCharacter !== '>') {
				insertText += '</' + name + '>';
			}
		}
		else {
			insertText = name + '=' + (snippet ? snippet : '"$0"');
		}
		item.insertText = new SnippetString(insertText);
	}

	private async getValueCompletions(xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<CompletionItem[]> {
		// Get the attribute name
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		const wordStart = wordRange ? wordRange.start : xmlPosition;
		const wordEnd = wordRange ? wordRange.end : xmlPosition;
		const lineRange = new Range(wordStart.line, 0, wordStart.line, wordEnd.character);
		const line = xmlDocument.getText(lineRange);

		const lineContent = xmlDocument.lineAt(xmlPosition).text;
		let after = lineContent.substring(xmlPosition.character, lineContent.indexOf('"', xmlPosition.character));
		if (!after) {
		  after = '"';
		}
		const before = lineContent.substring(lineContent.lastIndexOf('="', xmlPosition.character), xmlPosition.character);
		const assignIndex = lineContent.lastIndexOf('="', xmlPosition.character);
		const attrName = lineContent.substring(assignIndex, lineContent.lastIndexOf(' ', assignIndex) + 1).replace(':', '');
		// const attrValue = before.replace('="', '') + after;
		const attrValue = before.replace('="', '');

		// Get the XPath
		const xPath = getXPath(xmlDocument, xmlPosition);
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

		const dartDocument = await getDartDocument(xmlDocument);
		const cursorPos = line.substr(line.lastIndexOf(attrName + '="') + 2).length - attrName.length - Math.abs(wordEnd.character - xmlPosition.character);
		let dartOffset = dartDocument.getText().indexOf(attrName + ': ' + attrValue) + attrName.length + 2 + cursorPos;
		if (attrValue.endsWith('ctrl.')) {
			dartOffset = dartDocument.getText().indexOf(' ctrl.') + 6;
		}

		const completionList: vs.CompletionList = await this.getCompletionItems(dartDocument, dartOffset);
		return completionList.items.map(item => {
			item.range = null;
			return item;
		});
	}

	private getTopLevelAttributeValueCompletions(attrName: string): vs.CompletionItem[] {
		if (attrName.startsWith('xmlns')) {
			// todo get import statments
		}
		return [];
	}

	private getSecondLevelAttributeValueCompletions(tag: string, attrName: string): vs.CompletionItem[] {
		if (attrName === 'type') {
			// todo
		}
		return [];
	}

	private async getCompletionItems(dartDocument: vs.TextDocument, dartOffset: number): Promise<CompletionList> {
		const triggerCharachter: string = undefined;
		const itemResolveCount: number = undefined;
		const completionList: CompletionList = await commands.executeCommand('vscode.executeCompletionItemProvider', dartDocument.uri, dartDocument.positionAt(dartOffset), triggerCharachter, itemResolveCount);
		return completionList;
	}

	public async resolveCompletionItem(item: CompletionItem, token: CancellationToken): Promise<CompletionItem | undefined> {
		// const itemAny: any = item;
		// if (itemAny.dartDocument) {
		// 	let result: Hover[] = await commands.executeCommand('vscode.executeHoverProvider', itemAny.dartDocument.uri, itemAny.dartDocument.positionAt(itemAny.dartOffset));
		// 	result.forEach(a => a.range = null);
		// 	// item. = result[0].contents[0] as any;
		// 	if (result[0] && result[0].contents.length) {
		// 		item.documentation = result[0].contents[1] as any;
		// 	}
		// }
		// return item;
		return new Promise(() => item);
	}
}
