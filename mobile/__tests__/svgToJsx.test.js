/**
 * Guards `svgToJsx.js`, the build-time SVG->JSX compiler that replaced the runtime
 * `SvgXml` parse path (see `svgTransformer.js`'s header for why). Two checks:
 *
 *  - Every real `.svg` asset in the app compiles to the exact same React element tree
 *    that `SvgXml`/`parse()` would have produced from the same (sanitized) source —
 *    proven by rendering both a source's real-runtime AST and its compiled output down
 *    to a plain, comparable tree and diffing them, not by re-deriving the parser logic.
 *  - `TAG_TO_COMPONENT`'s keys cover every tag `react-native-svg` itself knows, so a
 *    future library version that adds an element fails this test instead of silently
 *    rendering `null` for it (the exact SVGR gap this file replaced).
 */

const fs = require('fs');
const path = require('path');
const React = require('react');
const babel = require('@babel/core');
const { parse, Svg } = require('react-native-svg');
// `tags` isn't part of the public API (only `SvgXml`/`parse`/the components are), but the
// runtime path this replaces used exactly this map (`xml.tsx`'s `import { tags } from
// './xmlTags'`) to resolve elements, so it's the correct ground truth for both tests below.
const { tags } = require('react-native-svg/lib/commonjs/xmlTags.js');

const { compileToSource, TAG_TO_COMPONENT } = require('../svgToJsx');
const { sanitizeSvg } = require('../svgTransformer');

const ASSET_ROOT = path.join(__dirname, '..', 'assets');

function walkSvgFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSvgFiles(full, out);
    else if (entry.name.endsWith('.svg')) out.push(full);
  }
  return out;
}

const SVG_FILES = walkSvgFiles(ASSET_ROOT);

const COMPONENT_TO_TAG = new Map(Object.entries(tags).map(([tag, Component]) => [Component, tag]));

/** A real React element (from either `parse()`'s runtime AST or our compiled output) -> a plain, comparable tree. */
function normalizeElement(node) {
  if (node === null || node === undefined) return null;
  if (typeof node === 'string') return node;

  const { type, props } = node;
  const tag = COMPONENT_TO_TAG.get(type);
  if (!tag) {
    // A genuinely unknown SVG element — e.g. `parse()`'s own `missingTag` fallback for a
    // tag react-native-svg doesn't know, like the backdrop-filter `<div>` shim inside some
    // Figma exports' inert bg-blur `<foreignObject>` — renders nothing either way. Our
    // compiled output skips instantiating it at all (see `nodeToExpr`'s `null` fallback),
    // so collapse it to the same `null` here rather than diffing against a component ref.
    return null;
  }

  const { children, ...rest } = props || {};
  return {
    tag,
    props: rest,
    children: (children || []).map(normalizeElement),
  };
}

/**
 * `parse()`'s return value has raw `tag`/`props` fields for the root — unlike every
 * descendant, the root never actually goes through `React.createElement` inside `parse()`
 * itself; that only happens later, when `SvgAst` renders `<Svg {...props} {...override}>`.
 * Rebuilding that same call here (rather than reading `ast.props` directly) matters: it's
 * what actually applies `Svg`'s default props to values the source left unset (e.g.
 * `preserveAspectRatio`), exactly as real runtime rendering does — comparing raw
 * `ast.props` against our compiled root's already-defaulted props would flag every asset
 * that omits a defaulted attribute as a false mismatch.
 */
function normalizeParseRoot(ast) {
  return normalizeElement(React.createElement(Svg, ast.props, ast.children));
}

function loadCompiledComponent(source) {
  const { code } = babel.transform(source, {
    filename: 'compiled-svg-asset.js',
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  const run = new Function('module', 'exports', 'require', code);
  run(mod, mod.exports, require);
  return mod.exports.default;
}

test('found the onboarding/app svg asset corpus', () => {
  expect(SVG_FILES.length).toBeGreaterThan(100);
});

test('TAG_TO_COMPONENT covers every tag react-native-svg exposes', () => {
  expect(Object.keys(TAG_TO_COMPONENT).sort()).toEqual(Object.keys(tags).sort());
});

describe.each(SVG_FILES.map((file) => [path.relative(ASSET_ROOT, file), file]))(
  '%s',
  (_relPath, file) => {
    test('compiles to the same tree SvgXml would parse at runtime', () => {
      const raw = fs.readFileSync(file, 'utf8');
      const sanitized = sanitizeSvg(raw, file);

      const groundTruthAst = parse(sanitized);
      expect(groundTruthAst).not.toBeNull();
      const expected = normalizeParseRoot(groundTruthAst);

      const source = compileToSource(sanitized, file);
      const SvgAsset = loadCompiledComponent(source);
      const element = SvgAsset({});
      const actual = normalizeElement(element);

      expect(actual).toEqual(expected);
    });
  }
);
