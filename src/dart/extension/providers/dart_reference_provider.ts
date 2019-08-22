import { CancellationToken, DefinitionLink, DefinitionProvider, Location, Position, ReferenceContext, ReferenceProvider, TextDocument, Uri, Range, workspace } from "vscode";
import { flatMap } from "../../shared/utils";
import { fsPath } from "../../shared/vscode/utils";
import * as util from "../utils";
import { getDartDocument, getDartCodeIndex } from "../../utils";

export class DartReferenceProvider implements ReferenceProvider, DefinitionProvider {
	constructor(private readonly analyzer: any) { }

	public async provideReferences(xmlDocument: TextDocument, xmlPosition: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
	
		// const line = xmlDocument.lineAt(xmlPosition.line).text.slice(0, xmlPosition.character);
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		if (!wordRange) {
			return;
		}
		
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange);
		let dartPosition = null;

		if (dartOffset < 0) {
			return;
		}
			
		// If we want to include the decleration, kick off a request for that.
		const definitions = context.includeDeclaration && dartPosition
			? await this.provideDefinition(dartDocument, dartPosition, token)
			: undefined;

		const resp = await this.analyzer.searchFindElementReferencesResults({
			file: fsPath(dartDocument.uri),
			includePotential: true,
			offset: dartOffset,
		});

		if (token && token.isCancellationRequested)
			return;

		const locations = resp.results.map((result: any) => {
			return new Location(
				Uri.file(result.location.file),
				util.toRangeOnLine(result.location),
			);
		});

		return definitions
			? locations.concat(definitions.map((dl) => new Location(dl.targetUri, dl.targetRange)))
			: locations;
	}

	public async provideDefinition(xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<DefinitionLink[]> {
		// const line = xmlDocument.lineAt(xmlPosition.line).text.slice(0, xmlPosition.character);
		const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
		if (!wordRange) {
			return;
		}
		
		const dartDocument = await getDartDocument(xmlDocument);
		const dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange);

		const resp = await this.analyzer.analysisGetNavigation({
			file: fsPath(dartDocument.uri),
			length: 0,
			offset: dartOffset,
		});

		if (token && token.isCancellationRequested)
			return;

		return flatMap(resp.regions, (region: any) => {
			return region.targets.map((targetIndex: any) => {
				const target = resp.targets[targetIndex];
				// HACK: We sometimes get a startColumn of 0 (should be 1-based). Just treat this as 1 for now.
				//     See https://github.com/Dart-Code/Dart-Code/issues/200
				if (target.startColumn === 0)
					target.startColumn = 1;

				let file = resp.files[target.fileIndex];
				if (file.endsWith('.xml.dart')) {
					file = file.replace('.xml.dart', '.xml');
					target.startColumn = 1;
					target.startLine = 1;
				}

				return {
					originSelectionRange: util.toRange(dartDocument, region.offset, region.length),
					targetRange: util.toRangeOnLine(target),
					targetUri: Uri.file(file),
				} as DefinitionLink;
			});
		});
	}
}
