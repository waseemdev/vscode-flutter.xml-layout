import { TextDocument, workspace, Uri, Position, Range } from "vscode";
import { fsPath } from "./shared/vscode/utils";
import * as path from "path";
import { isAttribute, getXPath, isTagName, isClosingTagName } from "./xmlUtils";
import { Location } from "./shared/analysis_server_types";

export function removeXmlComments(xml: string) {
    return xml.replace(/<!--[\s\S\n]*?-->/ig, '');
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

export async function getDartDocument(xmlDocument: TextDocument): Promise<TextDocument> {
    const xmlFilePath = fsPath(xmlDocument.uri);
    const xmlFile = path.parse(xmlFilePath);
    const dartFilePath = path.join(xmlFile.dir, xmlFile.base + '.dart');
    const dartDocument = await workspace.openTextDocument(Uri.file(dartFilePath));
    return dartDocument;
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

export async function getDartCodeWordIndex(xmlDocument: TextDocument, dartDocument: TextDocument, wordRange: Range): Promise<number> {
    if (!wordRange) {
        return -1;
    }
    const dart = dartDocument.getText();
    let dartOffset = -1;
  
    const word = xmlDocument.getText(xmlDocument.getWordRangeAtPosition(wordRange.start));
    if (word) {
        dartOffset = dart.indexOf(' ' + word + ' ');
        if (dartOffset === -1) {
            dartOffset = dart.indexOf(' ' + word + '.');
        }
        if (dartOffset === -1) {
            dartOffset = dart.indexOf('.' + word + '.');
        }
        if (dartOffset === -1) {
            dartOffset = dart.indexOf('.' + word + ' ');
        }
    }

    return dartOffset;
}

export function getXmlCodeWordLocation(xmlDocument: TextDocument, dart: string, location: Location): Range {
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
            // general case
            const match = new RegExp(`\\b${word}\\b`, 'ig').exec(xml);
            if (match) {
                xmlOffset = match.index - 1;
            }
        }
    }

    const startPos = xmlDocument.positionAt(xmlOffset + 1);
    return new Range(startPos, startPos.translate(0, word.length));
}