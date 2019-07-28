import { TextDocument, workspace, Uri, Position, Range } from "vscode";
import { fsPath } from "./shared/vscode/utils";
import * as path from "path";
import { isAttribute, getXPath, isTagName, isClosingTagName } from "./xmlUtils";

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


export async function getDartCodeIndex(xmlDocument: TextDocument, xmlPosition: Position,
    dartDocument: TextDocument, wordRange: Range, includeCloseTag = false): Promise<number> {
    const xml = xmlDocument.getText(); // new Range(new Position(0, 0), xmlPosition));
    const xPath = getXPath(xmlDocument, xmlPosition);
    const dart = dartDocument.getText();
    const offset = xmlDocument.offsetAt(xmlPosition);
    let dartOffset = -1;
  
    if (isAttribute(xmlDocument, xmlPosition)) {
      const tag = xPath[xPath.length - 1];
      let count = countWords(xml, '<' + tag + ' ', offset + tag.length);
      count += countWords(xml, '<' + tag + '>', offset + tag.length);
      const classIndex = wordIndexAfter(dart, ' ' +  tag + '(', count) + 2; // 2 = space + (
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
                dartOffset = attrIndex - 3;
            }
            else {
                let count = countWords(xml, '<' + tag + ' ', offset + tag.length);
                count += countWords(xml, '<' + tag + '>', offset + tag.length);
                const classIndex = wordIndexAfter(dart, ' ' + tag + '(', count) + 2; // 2 = space + (
                dartOffset = classIndex - 3;
            }
        }
    }

    return dartOffset;
}
  