// 'use strict';

// To improve readability, the regular expression patterns in this file are
// written as tagged template literals. The `regex` tag function strips literal
// whitespace characters and line comments beginning with `//` and returns a
// RegExp instance.
//
// Escape sequences are preserved as-is in the resulting regex, so
// double-escaping isn't necessary. A pattern may embed another pattern using
// `${}` interpolation.

// -- Common Symbols -----------------------------------------------------------

const syntax: any = {};

syntax.Char = regex`
  (?:
    [
      \t
      \n
      \r
      \x20-\uD7FF
      \uE000-\uFFFD
    ]
    |
    [\uD800-\uDBFF][\uDC00-\uDFFF]
  )
`;

// Partial implementation.
//
// To be compliant, the matched text must result in an error if it contains the
// string `]]>`, but that can't be easily represented here so we do it in the
// parser.
syntax.CharData = regex`
  [^<&]+
`;

syntax.NameStartChar = regex`
  (?:
    [
      :
      A-Z
      _
      a-z
      \xC0-\xD6
      \xD8-\xF6
      \xF8-\u02FF
      \u0370-\u037D
      \u037F-\u1FFF
      \u200C-\u200D
      \u2070-\u218F
      \u2C00-\u2FEF
      \u3001-\uD7FF
      \uF900-\uFDCF
      \uFDF0-\uFFFD
    ]
    |
    [\uD800-\uDB7F][\uDC00-\uDFFF]
  )
`;

syntax.NameChar = regex`
  (?:
    ${syntax.NameStartChar}
    |
    [
      .
      0-9
      \xB7
      \u0300-\u036F
      \u203F-\u2040
      -
    ]
  )
`;

syntax.Name = regex`
  ${syntax.NameStartChar}
  (?:${syntax.NameChar})*
`;

// Loose implementation. The entity will be validated in the `replaceReference`
// function.
syntax.Reference = regex`
  &\S+?;
`;

syntax.S = regex`
  [\x20\t\r\n]+
`;

// -- Attributes ---------------------------------------------------------------
syntax.Eq = regex`
  (?:${syntax.S})?
  =
  (?:${syntax.S})?
`;

syntax.AttributeName = regex`
  (?:
    ${syntax.NameStartChar}
    (?:${syntax.NameChar})*
    |
    \[
    ${syntax.NameStartChar}
    (?:${syntax.NameChar})*
    \]
    |
    \(
    ${syntax.NameStartChar}
    (?:${syntax.NameChar})*
    \)
  )
`;

syntax.Attribute = regex`
  ${syntax.AttributeName}
  (?:${syntax.Eq})*
  (?:
    "(?:
      [^"] | ${syntax.Reference}
    )*"
    |
    '(?:
      [^'] | ${syntax.Reference}
    )*'
  )*
`;

// syntax.Attribute = regex`
//   ${syntax.AttributeName}
//   (?:${syntax.Eq})*
//   (?:
//     "(?:
//       [^<&"] | ${syntax.Reference}
//     )*"
//     |
//     '(?:
//       [^<&'] | ${syntax.Reference}
//     )*'
//   )*
// `;

syntax.EventAttribute = regex`
\(
  // group 1
  (
    ${syntax.NameStartChar}
    (?:${syntax.NameChar})*
  )
\)`;

syntax.BoundAttribute = regex`
\[
  // group 1
  (
    ${syntax.NameStartChar}
    (?:${syntax.NameChar})*
  )
\]`;

syntax.Pipes = regex`[^"\|]+|("[^"]*")`;
syntax.PipeArgs = regex`[^":]+|("[^"]*")`;

// -- Elements -----------------------------------------------------------------
syntax.CDSect = regex`
  <!\[CDATA\[
    // Group 1: CData text content (optional)
    (
      (?:${syntax.Char})*?
    )
  \]\]>
`;

syntax.EmptyElemTag = regex`
  <
    // Group 1: Element name
    (${syntax.Name})
    // Group 2: Attributes (optional)
    (
      (?:
        ${syntax.S}
        ${syntax.Attribute}
      )*
    )
    (?:${syntax.S})?
  />
`;

syntax.ETag = regex`
  </
    // Group 1: End tag name
    (${syntax.Name})
    (?:${syntax.S})?
  >
`;

syntax.STag = regex`
  <
    // Group 1: Start tag name
    (${syntax.Name})
    // Group 2: Attributes (optional)
    (
      (?:
        ${syntax.S}
        ${syntax.Attribute}
      )*
    )
    (?:${syntax.S})?
  >
`;

// -- Misc ---------------------------------------------------------------------

// Special pattern that matches an entire string consisting only of `Char`
// characters.
syntax.CharOnly = regex`
  ^(?:${syntax.Char})*$
`;

syntax.Comment = regex`
  <!--
    // Group 1: Comment text (optional)
    (
      (?:
        (?!-) ${syntax.Char}
        | - (?!-) ${syntax.Char}
      )*
    )
  -->
`;

// Loose implementation since doctype declarations are discarded.
//
// It's not possible to fully parse a doctype declaration with a regex, but
// since we just discard them we can skip parsing the fiddly inner bits and use
// a regex to speed things up.
syntax.doctypedecl = regex`
  <!DOCTYPE
    ${syntax.S}
    [^[>]*
    (?:
      \[ [\s\S]+? \]
      (?:${syntax.S})?
    )?
  >
`;

// Loose implementation since processing instructions are discarded.
syntax.PI = regex`
  <\?
    // Group 1: PITarget
    (
      ${syntax.Name}
    )
    (?:
      ${syntax.S}
      (?:${syntax.Char})*?
    )?
  \?>
`;

// Loose implementation since XML declarations are discarded.
syntax.XMLDecl = regex`
  <\?xml
    ${syntax.S}
    [\s\S]+?
  \?>
`;

// -- Helpers ------------------------------------------------------------------
syntax.Anchored = {};
syntax.Global = {};

// Create anchored and global variations of each pattern.
Object.keys(syntax).forEach(name => {
  if (name !== 'Anchored' && name !== 'CharOnly' && name !== 'Global') {
    let pattern = syntax[name];

    syntax.Anchored[name] = new RegExp('^' + pattern.source);
    syntax.Global[name] = new RegExp(pattern.source, 'g');
  }
});

function regex(strings: any, ...embeddedPatterns: { source: string; }[]) {
  let { length, raw } = strings;
  let lastIndex = length - 1;
  let pattern = '';

  for (let i = 0; i < length; ++i) {
    pattern += raw[i]
      .replace(/(^|[^\\])\/\/.*$/gm, '$1') // remove end-of-line comments
      .replace(/\s+/g, ''); // remove all whitespace

    if (i < lastIndex) {
      pattern += embeddedPatterns[i].source;
    }
  }

  return new RegExp(pattern);
}

export = syntax;