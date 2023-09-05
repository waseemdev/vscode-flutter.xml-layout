import {
	CancellationToken,
	CodeAction,
	CodeActionContext,
	CodeActionKind,
	CodeActionProviderMetadata,
	Command,
	DocumentSelector,
	Range,
	TextDocument,
	TextEdit,
	WorkspaceEdit,
	commands,
} from 'vscode';
import { getDartCodeIndex, getDartDocument } from '../utils';

import { RankedCodeActionProvider } from './ranking_code_action_provider';
import { SourceChange } from '../dart-ext-types';

export class FixCodeActionProvider implements RankedCodeActionProvider {
	constructor(public readonly selector: DocumentSelector) { }

	public readonly rank = 1;

	public readonly metadata: CodeActionProviderMetadata = {
		providedCodeActionKinds: [CodeActionKind.QuickFix],
	};

	public async provideCodeActions(xmlDocument: TextDocument, cursorRange: Range, context: CodeActionContext, token: CancellationToken): Promise<CodeAction[] | undefined> {
		if (context.diagnostics.length < 1) {
			return undefined;
		}
		
		const xmlRange = context.diagnostics[0].range;
		if (!xmlRange || xmlRange.start == null) {
			return undefined;
		}

		if (context && context.only && !context.only.contains(CodeActionKind.QuickFix)) {
			return undefined;
		}

		try {
			const dartDocument = await getDartDocument(xmlDocument);
			const dartOffset = getDartCodeIndex(xmlDocument, xmlRange.start, dartDocument, xmlRange);
			const rangeEnd = dartDocument.positionAt(dartOffset);

			const dartRange = new Range(rangeEnd.translate({ characterDelta: -(xmlRange.end.character - xmlRange.start.character) }), rangeEnd);
			let results: (Command | CodeAction)[] = await commands.executeCommand('vscode.executeCodeActionProvider', dartDocument.uri, dartRange);
			return results.map(a => this.buildCodeAction(xmlDocument, a));
		}
		catch (e) {
			console.error(e);
			throw e;
		}
	}

	private buildCodeAction(document: TextDocument, command: Command | CodeAction): CodeAction {
		const innerCommand = command.command as any;
		const title = command.title ? command.title : innerCommand.title;
		if (!title || !title.startsWith('Import library')) {
			return null;
		}

		// once we have a title like "Import library 'package:xxx.xml.dart'", we can build a CodeAction to import file
		const change: SourceChange = {
			message: 'import library',
			edits: [
				{
					file: document.uri.path,
					fileStamp: -1,
					edits: [
						{
							offset: 0,
							length: 0,
							replacement: title,
						},
					],
				},
			],
			linkedEditGroups: [],
		};
		this.buildImportNamespace(document, change);

		const action = new CodeAction(title, CodeActionKind.QuickFix);
		action.edit = new WorkspaceEdit();
		const edit = new TextEdit(
			new Range(document.positionAt(change.edits[0].edits[0].offset), document.positionAt(change.edits[0].edits[0].offset + change.edits[0].edits[0].length)),
			change.edits[0].edits[0].replacement
		);
		action.edit.set(document.uri, [edit]);
		return action;
	}

	private buildImportNamespace(document: TextDocument, change: SourceChange) {
		change.edits[0].edits[0].offset = document.getText().indexOf('>');
		change.edits[0].file = change.edits[0].file.replace('.xml.dart', '.xml');
		const importText = this.extractImportText(change.edits[0].edits[0].replacement);
		const namespace = importText.substring(importText.lastIndexOf('/') + 1).replace('.dart', '').toLowerCase();
		change.edits[0].edits[0].replacement = '\n\txmlns:' + namespace + '="' + importText + '"';
	}

	private extractImportText(text: string): string {
		const quoteIndex = text.indexOf("'");
		const lastQuoteIndex = text.lastIndexOf("'");
		text = text.substring(quoteIndex + 1, lastQuoteIndex);
		return text;
	}
}
