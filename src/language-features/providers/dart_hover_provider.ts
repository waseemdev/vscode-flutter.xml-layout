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
			
			const results: Hover[] = await commands.executeCommand('vscode.executeHoverProvider', dartDocument.uri, dartDocument.positionAt(dartOffset));
			const contents: any[] = results && results[0] && results[0].contents;
			if (!contents) {
				return undefined;
			}
			// fixes bug that prevents the hover from showing
			const hover = new Hover([
				// { language: 'dart', value: (data.contents[0] as any).value },
				(typeof contents[0] !== 'string' ? contents[0] && (contents[0] as any).value : contents[0]) || undefined,
				(typeof contents[1] !== 'string' ? contents[1] && (contents[1] as any).value : contents[1]) || undefined
			]);
			return hover;
		} catch (e) {
			console.error(e);
		}
	}
}
