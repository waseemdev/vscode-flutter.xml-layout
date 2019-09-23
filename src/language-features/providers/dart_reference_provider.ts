import { CancellationToken, DefinitionLink, DefinitionProvider, Location, Position, ReferenceContext, ReferenceProvider, TextDocument, Uri, Range, workspace, commands } from "vscode";
import * as util from "../utils";
import { getDartDocument, getDartCodeIndex } from "../utils";

export class DartReferenceProvider implements ReferenceProvider, DefinitionProvider {
	constructor() { }

	public async provideReferences(xmlDocument: TextDocument, xmlPosition: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		if (!wordRange) {
			return;
		}
		
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange);
		let dartPosition = null;

		if (dartOffset === -1) {
			return;
		}
		
		// If we want to include the decleration, kick off a request for that.
		const definitions = context.includeDeclaration && dartPosition
			? await this.provideDefinition(dartDocument, dartPosition, token)
			: undefined;

		const locations: Location[] = await commands.executeCommand('vscode.executeReferenceProvider', dartDocument.uri, dartDocument.positionAt(dartOffset));

		if (token && token.isCancellationRequested)
			return;

		return definitions
			? locations.concat(definitions.map((dl) => new Location(dl.targetUri, dl.targetRange)))
			: locations;
	}

	public async provideDefinition(xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<DefinitionLink[]> {
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		if (!wordRange) {
			return;
		}
		
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange);

		const results: Location[] = await commands.executeCommand('vscode.executeDefinitionProvider', dartDocument.uri, dartDocument.positionAt(dartOffset));
		return results.map(loc => {
			const offsetStart = dartDocument.offsetAt(loc.range.start);
			const offsetEnd = dartDocument.offsetAt(loc.range.end);
			const target = { startColumn: loc.range.start.character + 1, startLine: loc.range.start.line + 1, length: offsetEnd - offsetStart };

			if (target.startColumn === 0)
				target.startColumn = 1;

			let file = loc.uri.fsPath;
			if (file.endsWith('.xml.dart')) {
				file = file.replace('.xml.dart', '.xml');
				target.startColumn = 1;
				target.startLine = 1;
			}

			return {
				originSelectionRange: util.toRange(dartDocument, offsetStart, offsetEnd - offsetStart),
				targetRange: util.toRangeOnLine(target as any),
				targetUri: Uri.file(file)
			} as DefinitionLink;
		});
	}
}
