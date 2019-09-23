import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProviderMetadata, DocumentSelector, Range, TextDocument, commands, Command } from "vscode";
import { RankedCodeActionProvider } from "./ranking_code_action_provider";
import { getDartDocument } from "../utils";
import { Location, SourceChange } from "../dart-ext-types";

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
			let results: Command[] = await commands.executeCommand('vscode.executeCodeActionProvider', dartDocument.uri, new Range(rangeStart, rangeStart.translate({ characterDelta: 10 })));
			return results.map(a => this.buildCodeAction(xmlDocument, a));
		}
		catch (e) {
			console.error(e);
			throw e;
		}
	}

	private buildCodeAction(document: TextDocument, command: Command): CodeAction {
		if (!command.command || !(command.command as any).arguments || !(command.command as any).arguments.length) {
			return null;
		}

		const innerCommand = (command.command as any);
		const change = innerCommand.arguments[innerCommand.arguments.length - 1];
		const title = innerCommand.title;
		
		if (title.startsWith('Import library')) {
			this.buildImportNamespace(document, change);
		}
		else {
			return null;
		}

		// const diagnostics = error ? [DartDiagnosticProvider.createDiagnostic(error)] : undefined;
		const action = new CodeAction(title, CodeActionKind.QuickFix);
		action.command = {
			arguments: [document, change],
			command: "_dart.applySourceChange",
			title,
		};
		// action.diagnostics = diagnostics;
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
