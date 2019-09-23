import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, Uri, TextDocument, workspace, languages, DiagnosticChangeEvent } from "vscode";
import { getXmlCodeWordLocation } from "../utils";

export class DartDiagnosticProvider {
	constructor(private readonly diagnostics: DiagnosticCollection) {
	}

	async onDidChangeDiagnostics(event: DiagnosticChangeEvent) {
		const file = event.uris.filter(a => a.path.endsWith('.xml.dart'))[0];
		if (file) {
			const dartDocument = await workspace.openTextDocument(Uri.file(file.path));
			const dartCode = dartDocument.getText();
			const xmlFile = file.path.replace('.xml.dart', '.xml');
			const xmlDocument = await workspace.openTextDocument(Uri.file(xmlFile));
			const results = languages.getDiagnostics(file).filter(a => a.severity === DiagnosticSeverity.Error);
			const allMessages: string[] = [];
			const mappedErrors = results
				.map((e) => DartDiagnosticProvider.createDiagnostic(dartCode, dartDocument, xmlDocument, e))
				.filter(a => !!a)
				.filter(a => {
					// remove duplicated diagnostics
					const res = !allMessages.find(m => m === a.message);
					if (res) {
						allMessages.push(a.message);
					}
					return res;
				});
			this.diagnostics.set(
				Uri.file(xmlFile),
				mappedErrors
			);
		}
	}

	public static createDiagnostic(dartCode: string, dartDocument: TextDocument, xmlDocument: TextDocument, error: Diagnostic): Diagnostic {
		const offset = dartDocument.offsetAt(error.range.start);
		const offsetEnd = dartDocument.offsetAt(error.range.end);
		const xmlWordRange = getXmlCodeWordLocation(xmlDocument, dartCode, 
			{ offset: offset, length: offsetEnd - offset } as any);
		if (!xmlWordRange) {
			return null;
		}
		error.range = xmlWordRange;
		(error as any).location = { offset };
		return error;
	}
}
