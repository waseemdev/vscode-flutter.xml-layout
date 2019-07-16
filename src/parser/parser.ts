'use strict';
// original source: https://github.com/rgrove/parse-xml

import { Document } from "./types";
import * as Syntax from './syntax';

const emptyArray = Object.freeze([]);
const emptyObject = Object.freeze(Object.create(null));

const namedEntities: any = Object.freeze({
  '&amp;': '&',
  '&apos;': "'",
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"'
});

const NODE_TYPE_CDATA = 'cdata';
const NODE_TYPE_COMMENT = 'comment';
const NODE_TYPE_DOCUMENT = 'document';
const NODE_TYPE_ELEMENT = 'element';
const NODE_TYPE_TEXT = 'text';

// let Syntax: any;

export class ParseXml {

  parse(xml: any, options = emptyObject): Document {
    // if (Syntax === void 0) {
    //   // Lazy require to defer regex parsing until first use.
    //   Syntax = require('./syntax');
    // }

    if (xml[0] === '\uFEFF') {
      // Strip byte order mark.
      xml = xml.slice(1);
    }

    xml = xml.replace(/\r\n?/g, '\n'); // Normalize CRLF and CR to LF.

    let doc: any = {
      type: NODE_TYPE_DOCUMENT,
      children: [],
      parent: null
    };
    doc.toJSON = this.nodeToJson.bind(doc);

    let state: any = {
      length: xml.length,
      options,
      parent: doc,
      pos: 0,
      prevPos: 0,
      slice: null,
      xml
    };

    this.consumeProlog(state);

    if (!this.consumeElement(state)) {
      this.error(state, 'Root element is missing or invalid');
    }

    while (this.consumeMisc(state)) { }

    if (!this.isEof(state)) {
      this.error(state, `Extra content at the end of the document`);
    }

    return doc;
  }

  // -- Private Functions --------------------------------------------------------
  addNode(state: any, node: any) {
    node.parent = state.parent;
    node.toJSON = this.nodeToJson.bind(node);

    state.parent.children.push(node);
  }

  addText(state: any, text: any) {
    let { children } = state.parent;
    let prevNode = children[children.length - 1];

    if (prevNode !== void 0 && prevNode.type === NODE_TYPE_TEXT) {
      // The previous node is a text node, so we can append to it and avoid
      // creating another node.
      prevNode.text += text;
    } else {
      this.addNode(state, {
        type: NODE_TYPE_TEXT,
        text
      });
    }
  }

  // Each `consume*` function takes the current state as an argument and returns
  // `true` if `state.pos` was advanced (meaning some XML was consumed) or `false`
  // if nothing was consumed.

  consumeCDSect(state: any) {
    let [match, text] = scan(state, Syntax.Anchored.CDSect);

    if (match === void 0) {
      return false;
    }

    if (state.options.preserveCdata) {
      this.addNode(state, {
        type: NODE_TYPE_CDATA,
        text
      });
    } else {
      this.addText(state, text);
    }

    return true;
  }

  consumeCharData(state: any) {
    let [text] = scan(state, Syntax.Anchored.CharData);

    if (text === void 0) {
      return false;
    }

    let cdataCloseIndex = text.indexOf(']]>');

    if (cdataCloseIndex !== -1) {
      state.pos = state.prevPos + cdataCloseIndex;
      this.error(state, 'Element content may not contain the CDATA section close delimiter `]]>`');
    }

    // Note: XML 1.0 5th ed. says `CharData` is "any string of characters which
    // does not contain the start-delimiter of any markup and does not include the
    // CDATA-section-close delimiter", but the conformance test suite and
    // well-established parsers like libxml seem to restrict `CharData` to
    // characters that match the `Char` symbol, so that's what I've done here.
    if (!Syntax.CharOnly.test(text)) {
      state.pos = state.prevPos + text.search(new RegExp(`(?!${Syntax.Char.source})`));
      this.error(state, 'Element content contains an invalid character');
    }

    this.addText(state, text);
    return true;
  }

  consumeComment(state: any) {
    let [, content] = scan(state, Syntax.Anchored.Comment);

    if (content === void 0) {
      return false;
    }

    if (state.options.preserveComments) {
      this.addNode(state, {
        type: NODE_TYPE_COMMENT,
        content: content.trim()
      });
    }

    return true;
  }

  consumeDoctypeDecl(state: any) {
    return scan(state, Syntax.Anchored.doctypedecl).length > 0;
  }

  consumeElement(state: any) {
    let [tag, name, attrs] = scan(state, Syntax.Anchored.EmptyElemTag);
    let isEmpty = tag !== void 0;

    if (!isEmpty) {
      [tag, name, attrs] = scan(state, Syntax.Anchored.STag);

      if (tag === void 0) {
        return false;
      }
    }

    let { parent } = state;
    let parsedAttrs = this.parseAttrs(state, attrs);

    let node: any = {
      type: NODE_TYPE_ELEMENT,
      name,
      attributes: parsedAttrs,
      children: []
    };

    let xmlSpace = parsedAttrs['xml:space'];

    if (xmlSpace === 'preserve'
      || (xmlSpace !== 'default' && parent.preserveWhitespace)) {

      node.preserveWhitespace = true;
    }

    if (!isEmpty) {
      state.parent = node;

      this.consumeCharData(state);

      while (
        this.consumeElement(state)
        || this.consumeReference(state)
        || this.consumeCDSect(state)
        || this.consumePI(state)
        || this.consumeComment(state)
      ) {
        this.consumeCharData(state);
      }

      let [, endName] = scan(state, Syntax.Anchored.ETag);

      if (endName !== name) {
        state.pos = state.prevPos;
        this.error(state, `Missing end tag for element ${name}`);
      }

      state.parent = parent;
    }

    this.addNode(state, node);
    return true;
  }

  consumeMisc(state: any) {
    return this.consumeComment(state)
      || this.consumePI(state)
      || this.consumeWhitespace(state);
  }

  consumePI(state: any) {
    let [match, target] = scan(state, Syntax.Anchored.PI);

    if (match === void 0) {
      return false;
    }

    if (target.toLowerCase() === 'xml') {
      state.pos = state.prevPos;
      this.error(state, 'XML declaration is only allowed at the start of the document');
    }

    return true;
  }

  consumeProlog(state: any) {
    let { pos } = state;

    scan(state, Syntax.Anchored.XMLDecl);

    while (this.consumeMisc(state)) { }

    if (this.consumeDoctypeDecl(state)) {
      while (this.consumeMisc(state)) { }
    }

    return state.pos > pos;
  }

  consumeReference(state: any) {
    let [ref] = scan(state, Syntax.Anchored.Reference);

    if (ref === void 0) {
      return false;
    }

    this.addText(state, this.replaceReference(ref, state));
    return true;
  }

  consumeWhitespace(state: any) {
    return scan(state, Syntax.Anchored.S).length > 0;
  }

  error(state: any, message: any) {
    let { pos, xml } = state;
    let column = 1;
    let excerpt = '';
    let line = 1;

    // Find the line and column where the error occurred.
    for (let i = 0; i < pos; ++i) {
      let char = xml[i];

      if (char === '\n') {
        column = 1;
        excerpt = '';
        line += 1;
      } else {
        column += 1;
        excerpt += char;
      }
    }

    let eol = xml.indexOf('\n', pos);

    excerpt += eol === -1
      ? xml.slice(pos)
      : xml.slice(pos, eol);

    let excerptStart = 0;

    // Keep the excerpt below 50 chars, but always keep the error position in
    // view.
    if (excerpt.length > 50) {
      if (column < 40) {
        excerpt = excerpt.slice(0, 50);
      } else {
        excerptStart = column - 20;
        excerpt = excerpt.slice(excerptStart, column + 30);
      }
    }

    let err: any = new Error(
      `${message} (line ${line}, column ${column})\n`
      + `  ${excerpt}\n`
      + ' '.repeat(column - excerptStart + 1) + '^\n'
    );

    err.column = column;
    err.excerpt = excerpt;
    err.line = line;
    err.pos = pos;

    throw err;
  }

  isEof(state: any) {
    return state.pos >= state.length - 1;
  }

  nodeToJson() {
    let json = Object.assign(Object.create(null), this);
    delete json.parent;
    return json;
  }

  normalizeAttrValue(state: any, value: any) {
    return value
      .replace(Syntax.Global.Reference, (ref: any) => this.replaceReference(ref, state))
      .replace(Syntax.Global.S, ' ')
      .trim();
  }

  parseAttrs(state: any, attrs: any) {
    let parsedAttrs = Object.create(null);

    if (!attrs) {
      return parsedAttrs;
    }

    let attrPairs = attrs
      .match(Syntax.Global.Attribute)
      .sort();

    for (let i = 0, len = attrPairs.length; i < len; ++i) {
      let attrPair = attrPairs[i];
      let name = attrPair.trim();
      let value = '';

      let eqMatch = attrPair.match(Syntax.Eq);
      if (eqMatch && eqMatch.index > -1) {
        name = attrPair.slice(0, eqMatch.index);
        value = attrPair.slice(eqMatch.index + eqMatch[0].length);
      }

      if (name in parsedAttrs) {
        state.pos = state.prevPos;
        this.error(state, `Attribute \`${name}\` redefined`);
      }

      value = this.normalizeAttrValue(state, value.slice(1, -1));

      if (name === 'xml:space') {
        if (value !== 'default' && value !== 'preserve') {
          state.pos = state.prevPos;
          this.error(state, `Value of the \`xml:space\` attribute must be "default" or "preserve"`);
        }
      }

      parsedAttrs[name] = value;
    }

    return parsedAttrs;
  }

  replaceReference(ref: any, state: any) {
    // let state = this;

    if (ref[1] === '#') {
      // This is a character entity.
      let codePoint;

      if (ref[2] === 'x') {
        codePoint = parseInt(ref.slice(3, -1), 16);
      } else {
        codePoint = parseInt(ref.slice(2, -1), 10);
      }

      if (isNaN(codePoint)) {
        state.pos = state.prevPos;
        this.error(state, `Invalid character entity \`${ref}\``);
      }

      let char = String.fromCodePoint(codePoint);

      if (!Syntax.Char.test(char)) {
        state.pos = state.prevPos;
        this.error(state, `Invalid character entity \`${ref}\``);
      }

      return char;
    }

    // This is a named entity.
    let value = namedEntities[ref];

    if (value !== void 0) {
      return value;
    }

    if (state.options.resolveUndefinedEntity) {
      let resolvedValue = state.options.resolveUndefinedEntity(ref);

      if (resolvedValue !== null && resolvedValue !== void 0) {
        return resolvedValue;
      }
    }

    if (state.options.ignoreUndefinedEntities) {
      return ref;
    }

    state.pos = state.prevPos;
    this.error(state, `Named entity isn't defined: \`${ref}\``);
  }
}

export function scan(state: any, regex: any) {
  let { pos, slice, xml } = state;

  if (!slice) {
    if (pos > 0) {
      slice = xml.slice(pos);
      state.slice = slice;
    } else {
      slice = xml;
    }
  }

  let matches = slice.match(regex);

  if (!matches) {
    return emptyArray;
  }

  state.prevPos = state.pos;
  state.pos += matches[0].length;
  state.slice = null;

  return matches;
}