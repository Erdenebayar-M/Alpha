/**
 * Compiles sanitized SVG source into a `react-native-svg` JSX module at build time —
 * no runtime XML parsing, ever. Used by `svgTransformer.js`.
 *
 * The parsing half (`parseSvgSource` below) is a line-for-line port of the state
 * machine in `react-native-svg/src/xml.tsx`'s `parse()` (attribute camelCasing, the
 * "coerce every non-`id` numeric-looking value to a JS number" rule, and `getStyle`'s
 * `style="..."` splitting), stripped of the `Tag`/React bookkeeping `parse()` mixes in —
 * that resolution happens here instead, against `TAG_TO_COMPONENT`. It has to be a
 * vendored copy rather than an import: `react-native-svg`'s compiled output can't be
 * `require()`'d from plain Node (only from inside Metro/Jest's own Babel pipeline), and
 * this file runs *inside* the Metro transformer process, which is plain Node.
 *
 * `TAG_TO_COMPONENT` mirrors `react-native-svg/src/xmlTags.ts`'s `tags` map, including
 * the filter primitives (`Filter`, `FeGaussianBlur`, `FeBlend`, ...) that SVGR's
 * `native: true` allowlist is missing — that gap is the whole reason `svgTransformer.js`
 * used to route through `SvgXml` instead of compiling to JSX. A tag absent from this
 * table compiles to `null`, matching `parse()`'s own `missingTag` fallback exactly (an
 * unknown element renders nothing, but doesn't take its parent down with it) — this is
 * what already makes the girl's `blush.svg` backdrop-filter `<div>` shim inert today.
 * `__tests__/svgToJsx.test.js` asserts this table's keys equal the real library's `tags`
 * keys, so a future `react-native-svg` bump that adds an element fails the build instead
 * of silently dropping art.
 */

'use strict';

/** Mirrors `react-native-svg/src/xmlTags.ts`. Keep in sync — see the completeness test. */
const TAG_TO_COMPONENT = {
  circle: 'Circle',
  clipPath: 'ClipPath',
  defs: 'Defs',
  ellipse: 'Ellipse',
  filter: 'Filter',
  feBlend: 'FeBlend',
  feColorMatrix: 'FeColorMatrix',
  feComponentTransfer: 'FeComponentTransfer',
  feComposite: 'FeComposite',
  feConvolveMatrix: 'FeConvolveMatrix',
  feDiffuseLighting: 'FeDiffuseLighting',
  feDisplacementMap: 'FeDisplacementMap',
  feDistantLight: 'FeDistantLight',
  feDropShadow: 'FeDropShadow',
  feFlood: 'FeFlood',
  feGaussianBlur: 'FeGaussianBlur',
  feImage: 'FeImage',
  feMerge: 'FeMerge',
  feMergeNode: 'FeMergeNode',
  feMorphology: 'FeMorphology',
  feOffset: 'FeOffset',
  fePointLight: 'FePointLight',
  feSpecularLighting: 'FeSpecularLighting',
  feSpotLight: 'FeSpotLight',
  feTile: 'FeTile',
  feTurbulence: 'FeTurbulence',
  foreignObject: 'ForeignObject',
  g: 'G',
  image: 'Image',
  line: 'Line',
  linearGradient: 'LinearGradient',
  marker: 'Marker',
  mask: 'Mask',
  path: 'Path',
  pattern: 'Pattern',
  polygon: 'Polygon',
  polyline: 'Polyline',
  radialGradient: 'RadialGradient',
  rect: 'Rect',
  stop: 'Stop',
  svg: 'Svg',
  symbol: 'Symbol',
  text: 'Text',
  textPath: 'TextPath',
  tspan: 'TSpan',
  use: 'Use',
};

// ---------------------------------------------------------------------------
// Parser — ported from react-native-svg/src/xml.tsx. Keep this section's control
// flow in lockstep with the original; it's what makes attribute handling
// byte-identical to the runtime path it replaces.
// ---------------------------------------------------------------------------

const upperCase = (_match, letter) => letter.toUpperCase();

/** react-native-svg/src/xml.tsx `camelCase` — `stroke-width` -> `strokeWidth`. */
function camelCase(phrase) {
  return phrase.replace(/[:-]([a-z])/g, upperCase);
}

/** react-native-svg/src/xml.tsx `getStyle` — `"a:b;c:d"` -> `{a: 'b', c: 'd'}`. */
function getStyle(string) {
  const style = {};
  const declarations = string.split(';').filter((v) => v.trim());
  for (const declaration of declarations) {
    if (declaration.length !== 0) {
      const split = declaration.split(':');
      const property = split[0];
      const value = split[1];
      style[camelCase(property.trim())] = value.trim();
    }
  }
  return style;
}

function repeat(str, i) {
  let result = '';
  while (i--) result += str;
  return result;
}

const toSpaces = (tabs) => repeat('  ', tabs.length);

function locate(source, i) {
  const lines = source.split('\n');
  let column = i;
  let line = 0;
  for (; line < lines.length; line++) {
    const { length } = lines[line];
    if (column >= length) column -= length;
    else break;
  }
  const before = source.slice(0, i).replace(/^\t+/, toSpaces);
  const beforeExec = /(^|\n).*$/.exec(before);
  const beforeLine = (beforeExec && beforeExec[0]) || '';
  const after = source.slice(i);
  const afterExec = /.*(\n|$)/.exec(after);
  const afterLine = afterExec && afterExec[0];
  const pad = repeat(' ', beforeLine.length);
  return { line, column, snippet: `${beforeLine}${afterLine}\n${pad}^` };
}

const validNameCharacters = /[a-zA-Z0-9:_-]/;
const commentStart = /<!--/;
const whitespace = /[\s\t\r\n]/;
const quotemarks = /['"]/;

/**
 * Parses one SVG document into a plain `{tag, props, children}` tree — `children` is
 * `(node | string)[]`. No React, no component resolution; that happens in `compileToSource`.
 */
function parseSvgSource(source, filename) {
  const length = source.length;
  let currentElement = null;
  let state = metadata;
  let children = null;
  let root;
  const stack = [];

  function error(message) {
    const { line, column, snippet } = locate(source, i);
    throw new Error(
      `[svgToJsx] ${message} (${filename || '<source>'}:${line}:${column}). ${snippet}`
    );
  }

  function metadata() {
    while (
      i + 1 < length &&
      (source[i] !== '<' ||
        !(validNameCharacters.test(source[i + 1]) || commentStart.test(source.slice(i, i + 4))))
    ) {
      i++;
    }
    return neutral();
  }

  function neutral() {
    let text = '';
    let char;
    while (i < length && (char = source[i]) !== '<') {
      text += char;
      i += 1;
    }
    if (/\S/.test(text)) children.push(text);
    if (source[i] === '<') return openingTag;
    return neutral;
  }

  function openingTag() {
    const char = source[i];

    if (char === '?') return neutral; // <?xml...

    if (char === '!') {
      const start = i + 1;
      if (source.slice(start, i + 3) === '--') return comment;
      const end = i + 8;
      if (source.slice(start, end) === '[CDATA[') return cdata;
      if (/doctype/i.test(source.slice(start, end))) return doctype;
    }

    if (char === '/') return closingTag;

    const tag = getName();
    const props = {};
    const element = { tag, props, children: [] };

    if (currentElement) children.push(element);
    else root = element;

    getAttributes(props);

    const { style } = props;
    if (typeof style === 'string') {
      props.style = getStyle(style);
    }

    let selfClosing = false;
    if (source[i] === '/') {
      i += 1;
      selfClosing = true;
    }

    if (source[i] !== '>') error('Expected >');

    if (!selfClosing) {
      currentElement = element;
      ({ children } = element);
      stack.push(element);
    }

    return neutral;
  }

  function comment() {
    const index = source.indexOf('-->', i);
    if (!~index) error('expected -->');
    i = index + 2;
    return neutral;
  }

  function cdata() {
    const index = source.indexOf(']]>', i);
    if (!~index) error('expected ]]>');
    children.push(source.slice(i + 7, index));
    i = index + 2;
    return neutral;
  }

  function doctype() {
    const index = source.indexOf('>', i);
    if (index === -1) error('expected >');
    i = index;
    return neutral;
  }

  function closingTag() {
    const tag = getName();
    if (!tag) error('Expected tag name');
    if (currentElement && tag !== currentElement.tag) {
      error(`Expected closing tag </${tag}> to match opening tag <${currentElement.tag}>`);
    }
    allowSpaces();
    if (source[i] !== '>') error('Expected >');
    stack.pop();
    currentElement = stack[stack.length - 1];
    if (currentElement) ({ children } = currentElement);
    return neutral;
  }

  function getName() {
    let name = '';
    let char;
    while (i < length && validNameCharacters.test((char = source[i]))) {
      name += char;
      i += 1;
    }
    return name;
  }

  function getAttributes(props) {
    while (i < length) {
      if (!whitespace.test(source[i])) return;
      allowSpaces();

      const name = getName();
      if (!name) return;

      let value = true;

      allowSpaces();
      if (source[i] === '=') {
        i += 1;
        allowSpaces();
        value = getAttributeValue();
        if (name !== 'id' && !isNaN(+value) && value.trim() !== '') {
          value = +value;
        }
      }

      props[camelCase(name)] = value;
    }
  }

  function getAttributeValue() {
    return quotemarks.test(source[i]) ? getQuotedAttributeValue() : getUnquotedAttributeValue();
  }

  function getUnquotedAttributeValue() {
    let value = '';
    do {
      const char = source[i];
      if (char === ' ' || char === '>' || char === '/') return value;
      value += char;
      i += 1;
    } while (i < length);
    return value;
  }

  function getQuotedAttributeValue() {
    const quotemark = source[i++];
    let value = '';
    let escaped = false;
    while (i < length) {
      const char = source[i++];
      if (char === quotemark && !escaped) return value;
      if (char === '\\' && !escaped) escaped = true;
      value += escaped ? `\\${char}` : char;
      escaped = false;
    }
    return value;
  }

  function allowSpaces() {
    while (i < length && whitespace.test(source[i])) i += 1;
  }

  let i = 0;
  while (i < length) {
    if (!state) error('Unexpected character');
    state = state();
    i += 1;
  }

  if (state !== neutral) error('Unexpected end of input');

  return root || null;
}

// ---------------------------------------------------------------------------
// Codegen
// ---------------------------------------------------------------------------

function serializeValue(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (value && typeof value === 'object') {
    // `style` object from `getStyle` — string keys, string values.
    const entries = Object.keys(value).map((k) => `${JSON.stringify(k)}: ${JSON.stringify(value[k])}`);
    return `{ ${entries.join(', ')} }`;
  }
  return JSON.stringify(value);
}

function serializeProps(props) {
  const keys = Object.keys(props);
  if (keys.length === 0) return '{}';
  const entries = keys.map((k) => `${JSON.stringify(k)}: ${serializeValue(props[k])}`);
  return `{ ${entries.join(', ')} }`;
}

/**
 * One node -> a `React.createElement(...)` source expression, or the literal `"null"`
 * for a tag absent from `TAG_TO_COMPONENT` — matching `parse()`'s `missingTag` fallback,
 * which renders nothing without dropping the rest of the tree around it.
 */
function nodeToExpr(node) {
  if (typeof node === 'string') return JSON.stringify(node);

  const componentName = TAG_TO_COMPONENT[node.tag];
  if (!componentName) return 'null';

  const propsSrc = serializeProps(node.props);
  const childrenSrc = `[${node.children.map(nodeToExpr).join(', ')}]`;
  return `React.createElement(${componentName}, ${propsSrc}, ${childrenSrc})`;
}

function collectUsedComponents(node, used) {
  const componentName = TAG_TO_COMPONENT[node.tag];
  if (componentName) used.add(componentName);
  for (const child of node.children) {
    if (typeof child !== 'string') collectUsedComponents(child, used);
  }
}

/**
 * Compiles one sanitized SVG document into an ES module source string:
 * `import`s only the `react-native-svg` components this asset actually uses, plus a
 * default-exported `SvgAsset(props)` that spreads `props` onto the root the same way
 * `SvgAst` does (`{...astRootProps} {...override}` — override, i.e. the caller's props,
 * wins on conflicting keys). The root always compiles to `Svg`, regardless of what the
 * source document's root tag was — `SvgAst` does the same (`const Svg = tags.svg`,
 * ignoring `ast.tag`), and this needs to match it for the equivalence test.
 */
function compileToSource(xmlSource, filename) {
  const ast = parseSvgSource(xmlSource, filename);
  if (!ast) throw new Error(`[svgToJsx] ${filename || '<source>'}: no root element found`);

  const used = new Set(['Svg']);
  for (const child of ast.children) {
    if (typeof child !== 'string') collectUsedComponents(child, used);
  }
  const importList = [...used].sort().join(', ');

  const rootPropsSrc = serializeProps(ast.props);
  const childrenSrc = `[${ast.children.map(nodeToExpr).join(', ')}]`;

  return `import * as React from 'react';
import { ${importList} } from 'react-native-svg';

const ROOT_PROPS = ${rootPropsSrc};

export default function SvgAsset(props) {
  return React.createElement(Svg, Object.assign({}, ROOT_PROPS, props), ${childrenSrc});
}
`;
}

module.exports = {
  TAG_TO_COMPONENT,
  camelCase,
  getStyle,
  parseSvgSource,
  compileToSource,
};
