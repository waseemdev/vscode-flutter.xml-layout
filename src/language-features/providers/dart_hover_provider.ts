import { CancellationToken, Hover, HoverProvider, Position, Range, TextDocument, Uri, commands } from "vscode";
import { getDartDocument, getDartCodeIndex } from "../utils";

export class DartHoverProvider implements HoverProvider {
	constructor() { }

	public async provideHover(xmlDocument: TextDocument, xmlPosition: Position, token: CancellationToken): Promise<Hover | undefined> {
		try {
			const wordRange = xmlDocument.getWordRangeAtPosition(xmlPosition);
			if (!wordRange) {
				return;
			}
			
			const dartDocument = await getDartDocument(xmlDocument);
			const dartOffset = getDartCodeIndex(xmlDocument, xmlPosition, dartDocument, wordRange, true);
			if (dartOffset < 0) {
				return;
			}
			
			let results: Hover[] = await commands.executeCommand('vscode.executeHoverProvider', dartDocument.uri, dartDocument.positionAt(dartOffset));
			results.forEach(a => a.range = null);
			return results[0];
		} catch (e) {
			console.error(e);
		}
	}
}
