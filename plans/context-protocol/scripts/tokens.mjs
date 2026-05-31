// tokens.mjs
// Calibrated, zero-dependency token-cost estimator for the context-loading protocol.
//
// WHY a heuristic and not a real tokenizer:
//   There is no official local tokenizer for Claude models. Third-party
//   tokenizers (tiktoken / gpt-tokenizer) target OpenAI BPE vocabularies and
//   only approximate Claude anyway. For *budgeting and ranking* — which is all
//   this protocol needs — a per-filetype chars-per-token (CPT) ratio is fast,
//   deterministic, dependency-free, and accurate to roughly +/-10-15%.
//
// METHOD:
//   tokens ~= ceil(charCount / CPT(ext))
//   CPT ratios differ by file type because token density differs: code and
//   JSON are punctuation-heavy (more tokens per char => lower CPT), prose is
//   word-heavy (fewer tokens per char => higher CPT).
//
// PLUGGABLE:
//   Swap `estimateTokens` for a real tokenizer later without touching callers.
//   A global multiplier can be applied via env CONTEXT_CPT_SCALE (e.g. "1.05")
//   once you calibrate the headline number against real Claude usage — see
//   docs/policy/context-loading-protocol.md "Calibration".

/**
 * Chars-per-token by file category. Lower CPT = denser = more tokens per char.
 * Values chosen from observed BPE behaviour on each content type; tune via
 * the calibration procedure in the protocol doc.
 */
export const CPT = {
  code: 3.4, // .ts .tsx .js .jsx .mjs .mts .cjs — identifiers + punctuation
  shader: 3.2, // .glsl .vert .frag .geom .comp — dense math/punctuation
  markup: 3.3, // .html .css .scss .svg — tags/braces
  json: 2.9, // .json — many short punctuation tokens
  yaml: 3.4, // .yaml .yml
  prose: 3.9, // .md .mdx .txt — natural language
  config: 3.2, // dotfiles, .toml, .ini, lockfiles-as-text
  default: 3.6,
};

const EXT_TO_CATEGORY = new Map([
  ['.ts', 'code'], ['.tsx', 'code'], ['.js', 'code'], ['.jsx', 'code'],
  ['.mjs', 'code'], ['.mts', 'code'], ['.cjs', 'code'], ['.cts', 'code'],
  ['.glsl', 'shader'], ['.vert', 'shader'], ['.frag', 'shader'],
  ['.geom', 'shader'], ['.comp', 'shader'], ['.wgsl', 'shader'],
  ['.html', 'markup'], ['.htm', 'markup'], ['.css', 'markup'],
  ['.scss', 'markup'], ['.svg', 'markup'], ['.xml', 'markup'],
  ['.json', 'json'], ['.jsonc', 'json'], ['.gmf', 'json'],
  ['.yaml', 'yaml'], ['.yml', 'yaml'],
  ['.md', 'prose'], ['.mdx', 'prose'], ['.txt', 'prose'],
  ['.toml', 'config'], ['.ini', 'config'], ['.env', 'config'],
]);

const SCALE = (() => {
  const raw = process.env.CONTEXT_CPT_SCALE;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
})();

/** Resolve the extension (lowercased, with dot) from a path. */
export function extOf(relPath) {
  const base = relPath.split('/').pop() || relPath;
  // dotfiles (.gitignore, .nvmrc) have no real extension
  if (base.startsWith('.') && !base.slice(1).includes('.')) return base.toLowerCase();
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i).toLowerCase() : '';
}

/** Category bucket for an extension (drives which CPT ratio applies). */
export function categoryOf(ext) {
  if (EXT_TO_CATEGORY.has(ext)) return EXT_TO_CATEGORY.get(ext);
  // dotfiles without extension treated as config text
  if (ext.startsWith('.') && CPT.config) {
    if (['.gitignore', '.nvmrc', '.npmrc', '.clinerules', '.editorconfig'].includes(ext)) {
      return 'config';
    }
  }
  return 'default';
}

/** CPT ratio for a given extension. */
export function cptFor(ext) {
  return CPT[categoryOf(ext)] ?? CPT.default;
}

/**
 * Estimate token cost of `text` for a file with extension `ext`.
 * Returns an integer >= 0. Empty text => 0 tokens.
 *
 * The headline estimate is char/CPT. We also derive a "structural" estimate
 * (word + punctuation runs) purely as a sanity cross-check; it is returned in
 * the detailed form but does not drive the headline.
 */
export function estimateTokens(text, ext) {
  if (!text) return 0;
  const chars = text.length;
  const cpt = cptFor(ext);
  return Math.ceil((chars / cpt) * SCALE);
}

/**
 * Detailed estimate: { chars, charTokens, structuralTokens, cpt, category }.
 * `charTokens` is the headline. `structuralTokens` counts word-ish runs and
 * standalone punctuation — a rough independent measure used only to flag
 * gross divergence (e.g. minified blobs) in diagnostics.
 */
export function estimateDetailed(text, ext) {
  const chars = text ? text.length : 0;
  const category = categoryOf(ext);
  const cpt = cptFor(ext);
  const charTokens = chars === 0 ? 0 : Math.ceil((chars / cpt) * SCALE);
  let structuralTokens = 0;
  if (chars > 0) {
    const m = text.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g);
    // long identifiers BPE-split ~ every 4 chars; approximate that
    if (m) {
      for (const tok of m) {
        structuralTokens += tok.length > 6 ? Math.ceil(tok.length / 4) : 1;
      }
    }
    structuralTokens = Math.ceil(structuralTokens * SCALE);
  }
  return { chars, charTokens, structuralTokens, cpt, category };
}

/** Human-friendly token formatting: 1234 -> "1.2k", 1_200_000 -> "1.2M". */
export function fmtTokens(n) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0) + 'k';
  return (n / 1_000_000).toFixed(1) + 'M';
}
