// classify.mjs
// The taxonomy that decides, for every tracked file, three things:
//   1. tier        — which part of the system it belongs to (for rollups)
//   2. contextClass — what KIND of context it is (its role/value to a reader)
//   3. loadPolicy   — HOW an agent should treat it when collecting context
//
// loadPolicy is the "good context vs not necessary" filter the protocol exists
// to provide. See docs/policy/context-loading-protocol.md for the full rules.
//
// Zero dependencies. Pure functions of the repo-relative path.

import { extOf } from './tokens.mjs';

// ---------------------------------------------------------------------------
// Load policies — ordered cheapest-first / highest-leverage-first.
// ---------------------------------------------------------------------------
export const LOAD_POLICY = {
  READ_FIRST: 'read-first', // orientation: load at the start of (almost) any task
  READ_FOR_AREA: 'read-for-area', // architecture/docs for the subsystem you touch
  ON_DEMAND: 'on-demand', // source of truth; load targeted, prefer its module doc first
  REFERENCE_ONLY: 'reference-only', // legacy/historical; load only if explicitly relevant
  SKIP: 'skip', // data/fixtures/assets; not context unless the task is about them
  NEVER: 'never', // generated/binary; never load as text
};

export const CONTEXT_CLASS = {
  ORIENT: 'orient', // nav/meta docs that tell you where everything is
  ARCHITECTURE: 'architecture', // how/why docs (engine/, specs, adr, modules, policy)
  REFERENCE_LEGACY: 'reference-legacy', // docs/gmt, docs/archive — historical
  SOURCE: 'source', // application/engine code — the truth
  SOURCE_TOOLING: 'source-tooling', // scripts, harnesses, build config
  CONFIG: 'config', // package.json, tsconfig, dotfiles
  DATA: 'data', // fixtures, presets, .gmf, public json
  ASSET: 'asset', // images, fonts, media, binaries
  GENERATED: 'generated', // dist, build info, lockfiles
};

// ---------------------------------------------------------------------------
// Tier — coarse ownership bucket. Drives the per-tier cost rollup.
// ---------------------------------------------------------------------------
const TIER_PREFIXES = [
  ['engine/', 'engine-core'],
  ['engine-gmt/', 'engine-gmt'],
  ['app-gmt/', 'app-gmt'],
  ['fluid-toy/', 'fluid-toy'],
  ['fractal-toy/', 'fractal-toy'],
  ['demo/', 'demo'],
  ['mesh-export/', 'mesh-export'],
  ['docs/', 'docs'],
  ['debug/', 'tooling'],
  ['plans/', 'tooling'],
  ['shaders/', 'gmt-app'],
  ['public/', 'public'],
];

// Root-level dirs that make up the GMT re-port's React/state layer.
const GMT_APP_DIRS = new Set([
  'components', 'store', 'hooks', 'utils', 'data', 'types',
]);

// The minimal "boot fresh on this repo" orientation set — nav + rules only.
// Deliberately excludes the heavy running logs (HANDOFF.md ~22k, CHANGELOG_DEV
// ~44k, HEALTH.md): those are read-for-area, not part of cheap orientation.
const ROOT_META_FILES = new Set([
  'CLAUDE.md', 'AGENTS.md', 'CODEBASE_MAP.md',
  'README.md', 'CONTRIBUTING.md', '.clinerules',
]);

const CONFIG_BASENAMES = new Set([
  'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.node.json',
  'knip.json', 'vite.config.ts', 'postcss.config.js', 'tailwind.config.js',
  '.gitignore', '.nvmrc', '.npmrc', '.editorconfig', '.env', '.env.local',
]);

export function tierOf(relPath) {
  for (const [prefix, tier] of TIER_PREFIXES) {
    if (relPath.startsWith(prefix)) return tier;
  }
  const top = relPath.split('/')[0];
  if (relPath.includes('/') && GMT_APP_DIRS.has(top)) return 'gmt-app';
  return 'root';
}

// ---------------------------------------------------------------------------
// Binary / asset / generated detection.
// ---------------------------------------------------------------------------
const ASSET_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp', '.avif',
  '.webm', '.mp4', '.mov', '.mkv', '.avi', '.m4v', '.3gp', '.mp3', '.wav', '.ogg', '.flac',
  '.ttf', '.woff', '.woff2', '.otf', '.eot',
  '.zip', '.gz', '.tar', '.7z', '.bin', '.glb', '.gltf', '.obj', '.ply', '.stl',
  '.exr', '.hdr', '.dds', '.ktx', '.tga', '.blend', '.wasm', '.pdf', '.vdb',
]);

// Pure data / fixtures / snapshots — skip unless the task is literally about them.
const DATA_EXTS = new Set([
  '.json', '.jsonc', '.jsonl', '.ndjson', '.gmf', '.csv', '.tsv', '.yaml', '.yml',
]);

// Path segments marking example/reference input corpora (not our source).
const REFERENCE_CONTAINS = ['/reference/'];

// Extensionless legal/meta files — text, but never worth loading as context.
const LEGAL_BASENAMES = new Set(['LICENSE', 'LICENCE', 'COPYING', 'NOTICE', 'AUTHORS', 'PATENTS']);

const GENERATED_PREFIXES = ['dist/', 'node_modules/', 'build/', 'coverage/', '.vite/'];
const GENERATED_SUFFIXES = ['.tsbuildinfo', '.lock', '.snap', '.map'];
const GENERATED_BASENAMES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

// ---------------------------------------------------------------------------
// Core classifier.
// ---------------------------------------------------------------------------
export function classifyFile(relPath) {
  const ext = extOf(relPath);
  const base = relPath.split('/').pop() || relPath;
  const tier = tierOf(relPath);

  // 1. Generated / build output — never load.
  for (const p of GENERATED_PREFIXES) {
    if (relPath.startsWith(p)) {
      return mk(tier, CONTEXT_CLASS.GENERATED, LOAD_POLICY.NEVER, ext, `generated:${p}`);
    }
  }
  if (GENERATED_BASENAMES.has(base) || GENERATED_SUFFIXES.some((s) => base.endsWith(s))) {
    return mk(tier, CONTEXT_CLASS.GENERATED, LOAD_POLICY.NEVER, ext, 'generated:artifact');
  }

  // 2. Binary assets — never load as text.
  if (ASSET_EXTS.has(ext)) {
    return mk(tier, CONTEXT_CLASS.ASSET, LOAD_POLICY.NEVER, ext, `asset:${ext}`);
  }

  // 2a. Legal / extensionless meta files — text, but never context.
  if (LEGAL_BASENAMES.has(base.toUpperCase())) {
    return mk(tier, CONTEXT_CLASS.DATA, LOAD_POLICY.SKIP, ext, 'legal-meta');
  }

  // 2b. Reference/example corpora (imported fixtures, not our source).
  if (REFERENCE_CONTAINS.some((c) => relPath.includes(c))) {
    return mk(tier, CONTEXT_CLASS.DATA, LOAD_POLICY.REFERENCE_ONLY, ext, 'reference-corpus');
  }

  // 3. Root-level orientation / meta docs — read first.
  if (!relPath.includes('/') && ROOT_META_FILES.has(base)) {
    return mk(tier, CONTEXT_CLASS.ORIENT, LOAD_POLICY.READ_FIRST, ext, 'orient:root-meta');
  }

  // 4. Docs tree.
  if (relPath.startsWith('docs/')) {
    // Machine-state files living under docs/ (audit state dumps etc.) are data.
    if (DATA_EXTS.has(ext)) {
      return mk(tier, CONTEXT_CLASS.DATA, LOAD_POLICY.SKIP, ext, 'docs-state-data');
    }
    if (base === 'DOCS_INDEX.md' || base === 'FEATURE_STATUS.md') {
      return mk(tier, CONTEXT_CLASS.ORIENT, LOAD_POLICY.READ_FIRST, ext, 'orient:docs-index');
    }
    if (relPath.startsWith('docs/gmt/') || relPath.startsWith('docs/archive/')) {
      return mk(tier, CONTEXT_CLASS.REFERENCE_LEGACY, LOAD_POLICY.REFERENCE_ONLY, ext, 'legacy-docs');
    }
    // engine/, modules/, specs/, adr/, policy/, research/, animation-refactor/, *.md
    return mk(tier, CONTEXT_CLASS.ARCHITECTURE, LOAD_POLICY.READ_FOR_AREA, ext, 'architecture-docs');
  }

  // 5. Per-app READMEs and in-tree markdown that orients (e.g. app-gmt/README.md).
  if (ext === '.md') {
    if (base.toLowerCase() === 'readme.md') {
      return mk(tier, CONTEXT_CLASS.ORIENT, LOAD_POLICY.READ_FIRST, ext, 'orient:app-readme');
    }
    // plans/*.md and other in-tree notes are architecture-ish design context
    return mk(tier, CONTEXT_CLASS.ARCHITECTURE, LOAD_POLICY.READ_FOR_AREA, ext, 'in-tree-notes');
  }

  // 6. Config — must beat the data-extension rule (tsconfig.json etc. are .json).
  if (CONFIG_BASENAMES.has(base) || ext === '.toml' || ext === '.ini') {
    return mk(tier, CONTEXT_CLASS.CONFIG, LOAD_POLICY.ON_DEMAND, ext, 'config');
  }

  // 7. Static/public assets and any data extension (snapshots, manifests,
  //    presets, inventories, coverage) — skip unless the task is about the data.
  //    Placed BEFORE the tooling catch-all so debug/ and plans/ snapshots
  //    (huge .json/.yaml dumps) are not mistaken for tooling source.
  if (relPath.startsWith('public/') || tier === 'public') {
    return mk(tier, CONTEXT_CLASS.DATA, LOAD_POLICY.SKIP, ext, 'public-asset');
  }
  if (DATA_EXTS.has(ext)) {
    return mk(tier, CONTEXT_CLASS.DATA, LOAD_POLICY.SKIP, ext, `data:${ext}`);
  }

  // 8. Tooling: actual scripts under debug/, plans/*/scripts/, and *.config.ts.
  if (tier === 'tooling' || base.endsWith('.config.ts') || base.endsWith('.config.js')) {
    return mk(tier, CONTEXT_CLASS.SOURCE_TOOLING, LOAD_POLICY.ON_DEMAND, ext, 'tooling-script');
  }

  // 9. Shaders and source code — the truth, loaded on demand and targeted.
  if (['.glsl', '.vert', '.frag', '.geom', '.comp', '.wgsl'].includes(ext)) {
    return mk(tier, CONTEXT_CLASS.SOURCE, LOAD_POLICY.ON_DEMAND, ext, 'shader-source');
  }
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.css', '.scss', '.html'].includes(ext)) {
    return mk(tier, CONTEXT_CLASS.SOURCE, LOAD_POLICY.ON_DEMAND, ext, 'app-source');
  }

  // 10. Fallback — unknown text, treat as on-demand source.
  return mk(tier, CONTEXT_CLASS.SOURCE, LOAD_POLICY.ON_DEMAND, ext, 'fallback');
}

function mk(tier, contextClass, loadPolicy, ext, reason) {
  return { tier, contextClass, loadPolicy, ext, reason };
}

// Whether a file counts toward the "loadable context" budget (everything an
// agent might reasonably read as text). Excludes generated/binary.
export function isLoadable(loadPolicy) {
  return loadPolicy !== LOAD_POLICY.NEVER;
}

// Whether a file is part of the minimal orientation bundle.
export function isOrientation(loadPolicy) {
  return loadPolicy === LOAD_POLICY.READ_FIRST;
}

// Whether a file is context an agent would normally read to understand or work
// on the code: orientation + architecture + source-of-truth. Excludes data
// fixtures (skip), legacy reference, and generated/binary. This is the honest
// "what it costs to actually comprehend the app" denominator.
export function isContextWorthy(loadPolicy) {
  return (
    loadPolicy === LOAD_POLICY.READ_FIRST ||
    loadPolicy === LOAD_POLICY.READ_FOR_AREA ||
    loadPolicy === LOAD_POLICY.ON_DEMAND
  );
}
