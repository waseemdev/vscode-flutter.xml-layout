import {Position, Range, TextDocument} from 'vscode';

// source: https://github.com/Tyriar/vscode-xml

// This will catch:
// * Start tags: <tagName
// * End tags: </tagName
// * Auto close tags: />
const startTagPattern = '<\s*[\\.\\-:_a-zA-Z0-9]+';
const endTagPattern = '<\\/\s*[\\.\\-:_a-zA-Z0-9]+';
const autoClosePattern = '\\/>';
const startCommentPattern = '\s*<!--';
const endCommentPattern = '\s*-->';
const fullPattern = new RegExp("(" +
    startTagPattern + "|" + endTagPattern + "|" + autoClosePattern + "|" +
    startCommentPattern + "|" + endCommentPattern + ")", "g");


// Get the full XPath to the current tag.
export function getXPath(document: TextDocument, position: Position): string[] {
    // For every row, checks if it's an open, close, or autoopenclose tag and
    // update a list of all the open tags.
    //{row, column} = bufferPosition
    const xpath: string[] = [];
    const skipList: string[] = [];
    let waitingStartTag = false;
    let waitingStartComment = false;

    // For the first line read, excluding the word the cursor is over
    const wordRange = document.getWordRangeAtPosition(position);
    const wordStart = wordRange ? wordRange.start : position;
    let line = document.getText(new Range(position.line, 0, position.line, wordStart.character));
    let row = position.line;

    while (row >= 0) { //and (!maxDepth or xpath.length < maxDepth)
      row--;

      // Apply the regex expression, read from right to left.
      let matches = line.match(fullPattern);
      if (matches) {
        matches.reverse();

        for (let i = 0; i < matches.length; i++) {
          let match = matches[i];
          let tagName;

          // Start comment
          if (match === "<!--") {
            waitingStartComment = false;
          }
          // End comment
          else if (match === "-->") {
            waitingStartComment = true;
          }
          // Omit comment content
          else if (waitingStartComment) {
            continue;
          }
          // Auto tag close
          else if (match === "/>") {
            waitingStartTag = true;
          }
          // End tag
          else if (match[0] === "<" && match[1] === "/") {
            skipList.push(match.slice(2));
          }
          // This should be a start tag
          else if (match[0] === "<" && waitingStartTag) {
            waitingStartTag = false;
          } else if (match[0] == "<") {
            tagName = match.slice(1);
            // Omit XML definition.
            if (tagName === "?xml") {
              continue;
            }

            let idx = skipList.lastIndexOf(tagName);
            if (idx != -1) {
              skipList.splice(idx, 1);
            } else {
              xpath.push(tagName);
            }
          }
        };
      }

      // Get next line
      if (row >= 0) {
        line = document.lineAt(row).text;
      }
    }

  return xpath.reverse();
}



export function textBeforeWordEquals(document: TextDocument, position: Position, textToMatch: string) {
  const wordRange = document.getWordRangeAtPosition(position);
  const wordStart = wordRange ? wordRange.start : position;
  if (wordStart.character < textToMatch.length) {
    // Not enough room to match
    return false;
  }

  const charBeforeWord = document.getText(new Range(new Position(wordStart.line, wordStart.character - textToMatch.length), wordStart));
  return charBeforeWord === textToMatch;
}

export function isTagName(document: TextDocument, position: Position): boolean {
  return textBeforeWordEquals(document, position, '<');
}

export function isClosingTagName(document: TextDocument, position: Position): boolean {
  return textBeforeWordEquals(document, position, '</');
}

// Check if the cursor is about complete the value of an attribute.
export function isAttributeValue(document: TextDocument, position: Position): boolean {
  const wordRange = document.getWordRangeAtPosition(position);
  const wordStart = wordRange ? wordRange.start : position;
  const wordEnd = wordRange ? wordRange.end : position;
  if (wordStart.character === 0 || wordEnd.character > document.lineAt(wordEnd.line).text.length - 1) {
    return false;
  }

  // TODO: This detection is very limited, only if the char before the word is ' or "
  const rangeBefore = new Range(wordStart.line, wordStart.character - 1, wordStart.line, wordStart.character);
  if (document.getText(rangeBefore).match(/'|"/)) {
    return true;
  }

  const word = document.getText(wordRange);
  if (word && new RegExp('\b\w\b').exec(word)) {
    return true;
  }

  return false;
}

export function isAttribute(document: TextDocument, position: Position): boolean {
  const wordRange = document.getWordRangeAtPosition(position);
  const wordStart = wordRange ? wordRange.start : position;
  const text = document.getText();
  const offset = document.offsetAt(wordStart);
  return text.lastIndexOf('<', offset) > text.lastIndexOf('>', offset) && text.lastIndexOf(' ', offset) > text.lastIndexOf('<', offset) ||
    text[offset] === '>' && text.lastIndexOf('<', offset) > text.lastIndexOf('>', offset - 1);
}