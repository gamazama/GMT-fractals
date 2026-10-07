#!/usr/bin/env node
/**
 * sync-deep-zoom-core — refresh the vendored deep-zoom renderer.
 *
 * The renderer's master copy is one HTML file in the `mandelbulb_deepzoom` repo. The engine's
 * deep-zoom tool serves a copy from `public/deep-zoom-core/index.html` (Vite copies `public/`
 * verbatim, so the inline script is untouched). This script overwrites that copy.
 *
 *   npm run sync:deep-zoom-core
 *   DEEPZOOM_SRC=/path/to/index.html npm run sync:deep-zoom-core     (a file or its folder)
 *
 * The copy differs from the master by ONE line: an HTML comment after the DOCTYPE saying it is a
 * synced copy (grep SYNC_MARK), so nobody edits the 260 KB file in place and loses it to the next
 * sync. The page's behaviour is unchanged.
 *
 * It writes clean UTF-8: a leading BOM is dropped and the copy is refused if the source holds a
 * NUL byte (`npm run check:text-bytes` would fail on it once the file is tracked). It also checks
 * the two things the shell depends on, `window.__dz` and the `?embed=1` switch, and exits
 * non-zero if either is missing, so a stale master cannot be vendored silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SRC = 'H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html';
const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.resolve(here, '..', 'public', 'deep-zoom-core', 'index.html');

let src = process.env.DEEPZOOM_SRC || DEFAULT_SRC;
if (fs.existsSync(src) && fs.statSync(src).isDirectory()) src = path.join(src, 'index.html');

if (!fs.existsSync(src)) {
    console.error(`sync-deep-zoom-core: source not found: ${src}`);
    console.error('Set DEEPZOOM_SRC to the mandelbulb_deepzoom index.html (or its folder).');
    process.exit(1);
}

let buf = fs.readFileSync(src);
let droppedBom = false;
if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.subarray(3);
    droppedBom = true;
}
if (buf.includes(0)) {
    console.error(`sync-deep-zoom-core: ${src} contains a NUL byte; refusing to vendor it.`);
    process.exit(1);
}

const text = buf.toString('utf8');
const missing = [];
if (!/window\.__dz\s*=/.test(text)) missing.push('window.__dz (the host handle)');
if (!/['"]embed['"]/.test(text)) missing.push('the ?embed=1 switch');
if (missing.length) {
    console.error(`sync-deep-zoom-core: ${src} is missing ${missing.join(' and ')}.`);
    console.error('The deep-zoom shell cannot drive this version of the renderer. Nothing was copied.');
    process.exit(1);
}

const SYNC_MARK = '<!-- SYNCED COPY - do not edit; master: mandelbulb_deepzoom/index.html; refresh with: npm run sync:deep-zoom-core -->';
const doctype = /^\s*<!doctype html>[^\n]*\n/i.exec(text);
if (!doctype) {
    console.error(`sync-deep-zoom-core: ${src} does not start with <!DOCTYPE html>. Nothing was copied.`);
    process.exit(1);
}
const eol = doctype[0].endsWith('\r\n') ? '\r\n' : '\n';
buf = Buffer.from(doctype[0] + SYNC_MARK + eol + text.slice(doctype[0].length), 'utf8');

const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, buf);

const lines = text.split('\n').length;
const state = before === null ? 'created' : before.equals(buf) ? 'unchanged' : 'updated';
console.log(`sync-deep-zoom-core: ${state}`);
console.log(`  from ${src}`);
console.log(`  to   ${dest}`);
console.log(`  ${buf.length} bytes, ${lines} lines${droppedBom ? ', BOM dropped' : ''}`);
