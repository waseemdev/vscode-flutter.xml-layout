import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, DiagnosticTag, Uri, TextDocument, workspace } from "vscode";
import * as as from "../../shared/analysis_server_types";
// import { Analyzer } from "../analysis/analyzer";
import { config } from "../config";
import { toRangeOnLine } from "../utils";
import * as fs from 'fs';
import { denodeify } from 'q';
import { getXmlCodeWordLocation } from "../../utils";
// const readFileSync = denodeify(fs.readFileSync);

// TODO: This is not a provider?
export class DartDiagnosticProvider {
	private lastErrorJson: string | undefined;
	constructor(private readonly analyzer: any, private readonly diagnostics: DiagnosticCollection) {
		this.analyzer.registerForAnalysisErrors((es: any) => this.handleErrors(es));

		// Fired when files are deleted
		this.analyzer.registerForAnalysisFlushResults((es: any) => this.flushResults(es));
	}

	private async handleErrors(notification: as.AnalysisErrorsNotification) {
		const notificationJson = JSON.stringify(notification);

		// As a workaround for https://github.com/Dart-Code/Dart-Code/issues/1678, if
		// the errors we got are exactly the same as the previous set, do not give
		// them to VS Code. This avoids a potential loop of refreshing the error view
		// which triggers a request for Code Actions, which could result in analysis
		// of the file (which triggers errors to be sent, which triggers a refresh
		// of the error view... etc.!).
		if (this.lastErrorJson === notificationJson) {
			// TODO: Come up with a better fix than this!
			// log("Skipping error notification as it was the same as the previous one");
			return;
		}

		const errors = notification.errors.filter((error) => error.severity === 'ERROR');
		if (errors.length) {
			const dartCode = fs.readFileSync(notification.file).toString();
			const file = notification.file.replace('.xml.dart', '.xml');
			const xmlDocument = await workspace.openTextDocument(Uri.file(file));
			const allMessages: string[] = [];
			const mappedErrors = errors
				.map((e) => DartDiagnosticProvider.createDiagnostic(dartCode, xmlDocument, e))
				.filter(a => {
					// remove duplicated diagnostics
					const res = !allMessages.find(m => m === a.message);
					if (res) {
						allMessages.push(a.message);
					}
					return res;
				});
			this.diagnostics.set(
				Uri.file(file),
				mappedErrors
			);
		}
		else {
			const file = notification.file.replace('.xml.dart', '.xml');
			this.diagnostics.set(Uri.file(file), []);
		}

		this.lastErrorJson = notificationJson;
	}

	public static createDiagnostic(dartCode: string, xmlDocument: TextDocument, error: as.AnalysisError): Diagnostic {
		const xmlWordRange = getXmlCodeWordLocation(xmlDocument, dartCode, error.location);
		const diag = new DartDiagnostic(
			xmlWordRange,
			error.message,
			DartDiagnosticProvider.getSeverity(error.severity, error.type),
		);
		diag.code = error.code;
		diag.source = "dart";
		diag.tags = DartDiagnosticProvider.getTags(error);
		diag.type = error.type;
		if (error.correction) {
			diag.message += `\n${error.correction}`;
		}
		return diag;
	}

	public static getSeverity(severity: as.AnalysisErrorSeverity, type: as.AnalysisErrorType): DiagnosticSeverity {
		switch (severity) {
			case "ERROR":
				return DiagnosticSeverity.Error;
			case "WARNING":
				return DiagnosticSeverity.Warning;
			case "INFO":
				switch (type) {
					case "TODO":
						return DiagnosticSeverity.Information; // https://github.com/Microsoft/vscode/issues/48376
					default:
						return DiagnosticSeverity.Information;
				}
			default:
				throw new Error("Unknown severity type: " + severity);
		}
	}

	public static getTags(error: as.AnalysisError): DiagnosticTag[] {
		const tags: DiagnosticTag[] = [];
		if (error.code === "dead_code" || error.code === "unused_local_variable" || error.code === "unused_import")
			tags.push(DiagnosticTag.Unnecessary);
		return tags;
	}

	private flushResults(notification: as.AnalysisFlushResultsNotification) {
		this.lastErrorJson = undefined;
		const entries = notification.files.map<[Uri, Diagnostic[]]>((file) => [Uri.file(file), undefined]);
		this.diagnostics.set(entries);
	}
}

export class DartDiagnostic extends Diagnostic {
	public type: string;
}
