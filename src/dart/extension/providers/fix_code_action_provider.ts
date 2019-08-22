import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProviderMetadata, DocumentSelector, Range, TextDocument } from "vscode";
import * as as from "../../shared/analysis_server_types";
import { Logger } from "../../shared/interfaces";
import { fsPath } from "../../shared/vscode/utils";
import { isAnalyzableAndInWorkspace } from "../utils";
import { RankedCodeActionProvider } from "./ranking_code_action_provider";
import { getDartDocument, getDartCodeWordIndex } from "../../utils";

export class FixCodeActionProvider implements RankedCodeActionProvider {
	constructor(private readonly logger: Logger, public readonly selector: DocumentSelector, private readonly analyzer: any) { }

	public readonly rank = 1;

	public readonly metadata: CodeActionProviderMetadata = {
		providedCodeActionKinds: [CodeActionKind.QuickFix],
	};

	public async provideCodeActions(xmlDocument: TextDocument, xmlRange: Range, context: CodeActionContext, token: CancellationToken): Promise<CodeAction[] | undefined> {
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = await getDartCodeWordIndex(xmlDocument, dartDocument, xmlDocument.getWordRangeAtPosition(xmlRange.start));
		if (dartOffset === -1) {
			return undefined;
		}
		
		const rangeStart = dartDocument.positionAt(dartOffset);

		if (!isAnalyzableAndInWorkspace(dartDocument)) {
			return undefined;
		}

		// If we were only asked for specific action types and that doesn't include
		// quickfix (which is all we supply), bail out.
		if (context && context.only && !context.only.contains(CodeActionKind.QuickFix)) {
			return undefined;
		}

		try {
			const result = await this.analyzer.editGetFixes({
				file: fsPath(dartDocument.uri),
				offset: dartDocument.offsetAt(rangeStart),
			});

			if (token && token.isCancellationRequested) {
				return;
			}

			// Because fixes may be the same for multiple errors, we'll de-dupe them based on their edit.
			const allActions: { [key: string]: CodeAction } = {};

			for (const errorFix of result.fixes) {
				for (const fix of errorFix.fixes) {
					allActions[JSON.stringify(fix.edits)] = this.convertResult(xmlDocument, fix, errorFix.error);
				}
			}

			return Object.keys(allActions).map((a) => allActions[a]).filter(a => !!a);
		}
		catch (e) {
			this.logger.error(e);
			throw e;
		}
	}

	private convertResult(document: TextDocument, change: as.SourceChange, error: as.AnalysisError): CodeAction {
		const title = change.message;
		
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

	private buildImportNamespace(document: TextDocument, change: as.SourceChange) {
		change.edits[0].edits[0].offset = document.getText().indexOf('>');
		change.edits[0].file = change.edits[0].file.replace('.xml.dart', '.xml');
		let replacement = change.edits[0].edits[0].replacement;
		replacement = replacement.substring(9, replacement.length - 2);
		const namespace = replacement.substring(replacement.lastIndexOf('/') + 1).replace('.dart', '').toLowerCase();
		change.edits[0].edits[0].replacement = '\n\txmlns:' + namespace + '="' + replacement + '"';
	}
}
