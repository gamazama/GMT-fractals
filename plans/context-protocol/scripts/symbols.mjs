// symbols.mjs
// Heuristic top-level symbol extractor for TS/JS family files. Produces, for a
// file, the list of exported (and major top-level) declarations with their line
// spans — so a load plan can say "read FeatureSystem.ts:120-210 (register)"
// instead of pulling a 9k-token file whole.
//
// This is NOT a parser. It scans for top-level `export`/decl keywords and finds
// each declaration's span with a brace/paren matcher that skips strings and
// comments. Good enough for section anchors; it will occasionally mis-span
// exotic code, never fatally.
//
// Zero dependencies.

const DECL_RE = new RegExp(
  String.raw`^(export\s+)?(export\s+default\s+)?` +
  String.raw`(async\s+)?(function\*?|class|interface|type|enum|const|let|var)\s+` +
  String.raw`([A-Za-z_$][\w$]*)`,
  'mg',
);

// Map a starting char index to a 1-based line number using a precomputed table.
function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 0x0a) starts.push(i + 1);
  return starts;
}
function lineOf(starts, idx) {
  // binary search
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= idx) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

// From `startIdx`, return the index just past the end of the declaration's
// logical span. Skips strings, template literals, and comments. A declaration
// ends when: a balanced brace block opened after the start closes, OR a `;` is
// hit at brace-depth 0 before any block opened (one-liner).
function spanEnd(text, startIdx) {
  let i = startIdx;
  let depth = 0;
  let openedBlock = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    // comments
    if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    // strings / templates
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i, c); continue; }
    if (c === '{' || c === '(' || c === '[') { depth++; if (c === '{') openedBlock = true; i++; continue; }
    if (c === '}' || c === ')' || c === ']') { depth--; i++; if (openedBlock && depth <= 0) return i; continue; }
    if (c === ';' && depth <= 0 && !openedBlock) return i + 1;
    i++;
  }
  return n;
}

function skipString(text, i, quote) {
  const n = text.length;
  i++; // past opening quote
  while (i < n) {
    const c = text[i];
    if (c === '\\') { i += 2; continue; }
    if (c === quote) return i + 1;
    // template-literal ${...} can nest braces/strings; bail to closing backtick
    // conservatively (rare in declaration heads)
    i++;
  }
  return n;
}

/**
 * Extract top-level symbols from `text`.
 * Returns [{ name, kind, exported, startLine, endLine, lines }], sorted by size.
 */
export function extractSymbols(text) {
  const starts = lineStarts(text);
  const out = [];
  const seen = new Set();
  let m;
  DECL_RE.lastIndex = 0;
  while ((m = DECL_RE.exec(text)) !== null) {
    const matchIdx = m.index;
    // Only top-level: the matched line must begin at column 0 (the `m` flag's ^).
    const exported = !!(m[1] || m[2]);
    const kind = m[4].replace('*', '');
    const name = m[5];
    const end = spanEnd(text, matchIdx);
    const startLine = lineOf(starts, matchIdx);
    const endLine = lineOf(starts, Math.max(matchIdx, end - 1));
    const key = `${name}@${startLine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, kind, exported, startLine, endLine, lines: endLine - startLine + 1 });
  }
  out.sort((a, b) => b.lines - a.lines);
  return out;
}

/**
 * A compact slice guide for a single file: its largest symbols, line ranges.
 * `topN` caps the list. Returns [{name, kind, startLine, endLine, lines}].
 */
export function sliceGuide(text, topN = 6) {
  return extractSymbols(text)
    .filter((s) => s.lines >= 8) // tiny one-liners aren't worth anchoring
    .slice(0, topN);
}
