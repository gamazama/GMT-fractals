#!/usr/bin/env node
/**
 * PreToolUse guard — turns three prose rules into enforced ones.
 *
 *   docs/history/**   append-only  (rewrites denied, appends allowed)
 *   docs/adr/*.md     ask          (write-once, with two documented carve-outs)
 *   components/ui/**  no store     (the pure-primitive layer, currently 0 imports)
 *
 * Reads the PreToolUse JSON payload on stdin. Exits 0 always; prints a
 * hookSpecificOutput decision, or nothing to defer to normal permission flow.
 * @see CLAUDE.md "Documentation Conventions", .claude/rules/ui-and-panels.md
 */
import { readFileSync, existsSync } from 'node:fs';

const decide = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason },
  }));
  process.exit(0);
};
const defer = () => process.exit(0);

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  defer();
}

const tool = payload.tool_name;
const input = payload.tool_input || {};
const filePath = input.file_path || '';
if (!filePath || (tool !== 'Edit' && tool !== 'Write')) defer();

const p = filePath.split(String.fromCharCode(92)).join('/');

// Match a path segment whether the payload gave an absolute or a relative path.
const inDir = (seg) => p.includes('/' + seg + '/') || p.startsWith(seg + '/');

// ---------------------------------------------------------------- docs/history
// Append-only. An Edit whose new_string extends old_string is additive; anything
// else alters or removes text that is meant to be a historical record.
if (inDir('docs/history')) {
  if (tool === 'Edit') {
    const { old_string = '', new_string = '' } = input;
    if (new_string.startsWith(old_string)) defer();
    decide('deny',
      'docs/history/** is append-only reference (CLAUDE.md). This edit rewrites existing ' +
      'text rather than adding to it. Append instead, or record the correction in a new ' +
      'ADR under docs/adr/ and leave the historical text intact.');
  }
  if (tool === 'Write') {
    if (!existsSync(filePath)) defer();
    let prev = '';
    try { prev = readFileSync(filePath, 'utf8'); } catch { defer(); }
    if ((input.content || '').startsWith(prev)) defer();
    decide('deny',
      'docs/history/** is append-only reference (CLAUDE.md). This Write does not preserve ' +
      'the existing file as a prefix, so it rewrites history. Use Edit to append, or write ' +
      'a new ADR instead.');
  }
}

// -------------------------------------------------------------------- docs/adr
// Write-once, with two carve-outs CLAUDE.md documents explicitly. Too nuanced to
// auto-classify, so escalate to the user rather than deny.
if (inDir('docs/adr') && p.endsWith('.md')) {
  const isNew = tool === 'Write' && !existsSync(filePath);
  if (isNew) defer();
  decide('ask',
    'ADRs are write-once historical records (CLAUDE.md). Only two edits are sanctioned: ' +
    'prepending a "> **Update YYYY-MM-DD (...; decision unchanged):**" block when a rename ' +
    'or refactor invalidates a cited symbol, and stamping "Status: Superseded by ADR-NNNN". ' +
    'Anything else should be a NEW ADR that supersedes this one. Confirm which this is.');
}

// ------------------------------------------------------------- components/ui/**
// The un-trappable portal primitives. Purity here is what lets any app reuse them.
if (inDir('components/ui')) {
  const text = tool === 'Edit' ? (input.new_string || '') : (input.content || '');
  const hit = /from\s+['"][^'"]*\/store[/'"]/.test(text)
    ? 'an import from the store'
    : /\buseEngineStore\b|\buseFractalStore\b/.test(text)
      ? 'a direct store hook (useEngineStore / useFractalStore)'
      : null;
  if (hit) {
    decide('deny',
      `components/ui/** is the pure primitive layer — it currently has zero store imports, ` +
      `and this change adds ${hit}. UI primitives take state via props or opt-in React ` +
      `context (see components/contexts/), never by reaching into the store. ` +
      `Put the store-aware wrapper in components/ or the feature that owns the state.`);
  }
}

defer();
