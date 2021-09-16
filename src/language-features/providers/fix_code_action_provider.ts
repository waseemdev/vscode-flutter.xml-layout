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
import { Location, SourceChange } from '../dart-ext-types';

import { RankedCodeActionProvider } from './ranking_code_action_provider';
import { getDartDocument } from '../utils';

export class FixCodeActionProvider implements RankedCodeActionProvider {
	constructor(public readonly selector: DocumentSelector) { }

	public readonly rank = 1;

	public readonly metadata: CodeActionProviderMetadata = {
		providedCodeActionKinds: [CodeActionKind.QuickFix],
	};

	public async provideCodeActions(xmlDocument: TextDocument, xmlRange: Range, context: CodeActionContext, token: CancellationToken): Promise<CodeAction[] | undefined> {
		const dartDocument = await getDartDocument(xmlDocument);
		const location = ((context.diagnostics[0] || {}) as any).location as Location;
		if (!location || location.offset === -1) {
			return undefined;
		}

		if (context && context.only && !context.only.contains(CodeActionKind.QuickFix)) {
			return undefined;
		}

		try {
			const rangeStart = dartDocument.positionAt(location.offset);
			let results: (Command | CodeAction)[] = await commands.executeCommand('vscode.executeCodeActionProvider', dartDocument.uri, new Range(rangeStart, rangeStart.translate({ characterDelta: 10 })));
			return results.map(a => this.buildCodeAction(xmlDocument, a));
		}
		catch (e) {
			console.error(e);
			throw e;
		}
	}

	private buildCodeAction(document: TextDocument, command: Command | CodeAction): CodeAction {
		const innerCommand = command.command as any;
		const title = innerCommand && innerCommand.title ? innerCommand.title : command.title;
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
