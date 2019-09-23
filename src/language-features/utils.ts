import { TextDocument, workspace, Uri, Position, Range } from "vscode";
import * as path from "path";
import { isAttribute, getXPath, isTagName, isClosingTagName } from "./xmlUtils";
import { Location } from "./dart-ext-types";

export const isWin = /^win/.test(process.platform);

export function forceWindowsDriveLetterToUppercase(p: string): string {
	if (p && isWin && path.isAbsolute(p) && p.charAt(0) === p.charAt(0).toLowerCase())
		p = p.substr(0, 1).toUpperCase() + p.substr(1);
	return p;
}

export function fsPath(uri: Uri | string) {
	// tslint:disable-next-line:disallow-fspath
	return forceWindowsDriveLetterToUppercase(uri instanceof Uri ? uri.fsPath : uri);
}

export function sortBy<T>(items: T[], f: (item: T) => any): T[] {
	return items.sort((item1, item2) => {
		const r1 = f(item1);
		const r2 = f(item2);
		if (r1 < r2) return -1;
		if (r1 > r2) return 1;
		return 0;
	});
}

export function uniq<T>(array: T[]): T[] {
	return array.filter((value, index) => array.indexOf(value) === index);
}

export function flatMap<T1, T2>(input: T1[], f: (input: T1) => ReadonlyArray<T2>): T2[] {
	return input.reduce((acc, x) => acc.concat(f(x)), []);
}

export function toPosition(location: Location): Position {
	return new Position(location.startLine - 1, location.startColumn - 1);
}

// Translates an offset/length to a Range.
// NOTE: Does not wrap lines because it does not have access to a TextDocument to know
// where the line ends.
export function toRangeOnLine(location: Location): Range {
	const startPos = toPosition(location);
	return new Range(startPos, startPos.translate(0, location.length));
}

export function toRange(document: TextDocument, offset: number, length: number): Range {
	return new Range(document.positionAt(offset), document.positionAt(offset + length));
}


export function countWords(text: string, word: string, endAt: number): number {
    let count = 0;
    let pos = 0;
    while (pos > -1 && (pos = text.indexOf(word, pos)) > -1 && pos < endAt) {
        pos += word.length;
        count++;
    }
    return count;
}

export function wordIndexAfter(text: string, word: string, until: number, offset: number = 0): number {
    let count = until;
    let pos = 0;
    while (count > 0 && (pos = text.indexOf(word, offset)) > -1) {
        offset = pos + word.length;
        count--;
    }
    return pos + word.length;
}

export function getDartFileUri(xmlDocument: TextDocument): Uri {
    const xmlFilePath = fsPath(xmlDocument.uri);
    const xmlFile = path.parse(xmlFilePath);
    const dartFilePath = path.join(xmlFile.dir, xmlFile.base + '.dart');
    return Uri.file(dartFilePath);
}

export async function getDartDocument(xmlDocument: TextDocument): Promise<TextDocument> {
    const uri = getDartFileUri(xmlDocument);
    const dartDocument = await workspace.openTextDocument(uri);
    return dartDocument;
}



function removeXmlComments(xml: string) {
    return xml.replace(/<!--[\s\S\n]*?-->/ig, '');
}

export function getDartCodeIndex(xmlDocument: TextDocument, xmlPosition: Position,
    dartDocument: TextDocument, wordRange: Range, includeCloseTag = false, useTagName?: boolean, translateLine?: boolean): number {
    let xml = xmlDocument.getText(); // new Range(new Position(0, 0), xmlPosition));
    const xPath = getXPath(xmlDocument, xmlPosition);
    const dart = dartDocument.getText();
    const offset = xmlDocument.offsetAt(xmlPosition);
    let dartOffset = -1;
  
    xml = removeXmlComments(xml);

    if (isAttribute(xmlDocument, xmlPosition)) {
        const tag = xPath[xPath.length - 1];
        let count = countWords(xml, '<' + tag + ' ', offset + tag.length);
        count += countWords(xml, '<' + tag + '>', offset + tag.length);
        let classIndex = wordIndexAfter(dart, ' ' +  tag + '(', count) + 2; // 2 = space + (
        if (classIndex === tag.length + 3) {
            // e.g. Class.namedCtor(...)
            const namedCtorIndex = wordIndexAfter(xml, ':use="', count) + 6;
            if (namedCtorIndex > 6) {
                const namedCtorPos = xmlDocument.positionAt(namedCtorIndex);
                const namedCtor = xmlDocument.getText(new Range(namedCtorPos, new Position(namedCtorPos.line, namedCtorPos.character + 50))).split('"\'')[0];
                classIndex = wordIndexAfter(dart, ' ' + tag + '.' + namedCtor + '(', count) + 3 + namedCtor.length; // 2 = space + (
            }
        }
        dartOffset = classIndex;
        if (wordRange) {
            const attrName = xmlDocument.getText(wordRange);
            dartOffset = dart.indexOf(attrName, classIndex);
        }
    }
    else if (isTagName(xmlDocument, xmlPosition) || (includeCloseTag && isClosingTagName(xmlDocument, xmlPosition))) {
        if (wordRange) {
            const tag = xmlDocument.getText(wordRange);
            const isAttributeOrCustomTag = tag.length && /[a-z].*/g.test(tag[0]);
            if (isAttributeOrCustomTag) {
                const parentTag = xPath[xPath.length - 1];
                let count = countWords(xml, '<' + parentTag + ' ', offset + parentTag.length);
                count += countWords(xml, '<' + parentTag + '>', offset + parentTag.length);
                const classIndex = wordIndexAfter(dart, ' ' + parentTag + '(', count) + 2; // 2 = space + (
                const attrIndex = wordIndexAfter(dart, ' ' + tag + ':', 1, classIndex) + 2; // 2 = space + :
                if (attrIndex === tag.length + 3) {
                    dartOffset = classIndex;
                }
                else {
                    dartOffset = attrIndex - 3;
                }
            }
            else {
                let count = countWords(xml, '<' + tag + ' ', offset + tag.length);
                count += countWords(xml, '<' + tag + '>', offset + tag.length);
                let classIndex = wordIndexAfter(dart, ' ' + tag + '(', count) + 2; // 2 = space + (
                if (classIndex == tag.length + 3) {
                    classIndex = wordIndexAfter(dart, ' ' + tag + '.', count) + 2; // 2 = space + (
                }
                dartOffset = classIndex - 3;
            }
        }
        else if (useTagName) {
            const parentTag = xPath[xPath.length - 1];
            let count = countWords(xml, '<' + parentTag + ' ', offset + parentTag.length);
            count += countWords(xml, '<' + parentTag + '>', offset + parentTag.length);
            const classIndex = wordIndexAfter(dart, ' ' + parentTag + '(', count) + 2; // 2 = space + (
            if (translateLine) {
                dartOffset = dartDocument.offsetAt(dartDocument.positionAt(classIndex).translate({ lineDelta: 1, characterDelta: 1000 }));
            }
            else {
                dartOffset = classIndex;
            }
        }
    }

    return dartOffset;
}

// export async function getDartCodeWordIndex(xmlDocument: TextDocument, dartDocument: TextDocument, wordRange: Range): Promise<number> {
//     if (!wordRange) {
//         return -1;
//     }
//     const dart = dartDocument.getText();
//     let dartOffset = -1;
  
//     const word = xmlDocument.getText(xmlDocument.getWordRangeAtPosition(wordRange.start));
//     if (word) {
//         dartOffset = dart.indexOf(' ' + word + ' ');
//         if (dartOffset === -1) {
//             dartOffset = dart.indexOf(' ' + word + '.');
//         }
//         if (dartOffset === -1) {
//             dartOffset = dart.indexOf('.' + word + '.');
//         }
//         if (dartOffset === -1) {
//             dartOffset = dart.indexOf('.' + word + ' ');
//         }
//     }

//     return dartOffset;
// }

export function getXmlCodeWordLocation(xmlDocument: TextDocument, dart: string, location: any): Range {
    let xmlOffset = -1;
    const xml = xmlDocument.getText();
    const word = dart.substr(location.offset, location.length);
  
    if (word) {
        xmlOffset = xml.indexOf('<' + word + '>');
        if (xmlOffset === -1) {
            xmlOffset = xml.indexOf('<' + word + ' ');
        }
        if (xmlOffset === -1) {
            xmlOffset = xml.indexOf(' ' + word + '=');
        }
        if (xmlOffset === -1) {
            xmlOffset = xml.indexOf('"' + word + '"');
        }
        if (xmlOffset === -1) {
            try {
                // general case
                const match = new RegExp(`\\b${word}\\b`, 'ig').exec(xml);
                if (match) {
                    xmlOffset = match.index - 1;
                }
            }
            catch {
                return null;
            }
        }
    }

    const startPos = xmlDocument.positionAt(xmlOffset + 1);
    return new Range(startPos, startPos.translate(0, word.length));
}