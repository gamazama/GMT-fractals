/**
 * Guard: no tracked text file carries a NUL or stray control byte.
 *
 * A single NUL makes grep treat a source file as binary and print only
 * "Binary file matches" — the file goes invisible to every grep-driven
 * audit while still compiling fine. The overnight audit hit this three
 * times, always by accident: one instance hid components/CategoryPickerMenu.tsx
 * from an entire run, another hid a palette guard. The class is silent
 * blindness and the check is cheap, so it is a standing check now.
 *
 * Scans every `git ls-files` path with a text extension for 0x00 and any C0
 * control byte other than TAB, LF, CR, FF and ESC (ANSI colour in tooling).
 * A UTF-8 BOM is reported but not failed.
 *
 * Run: `npm run check:text-bytes`   (~1 s)
 *
 * Falsified 2026-09-02 by committing-nothing: a scratch `debug/_nul.ts`
 * containing one 0x00 was added to the index (`git add -N`), the check went
 * red naming it with its byte offset, and the file was removed. Baseline on
 * the clean tree: 2821 files, 0 findings.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TEXT = /\.(ts|tsx|mts|mjs|cjs|js|json|md|css|html|glsl|frag|vert|txt|yml|yaml|toml)$/i;
const ALLOWED = new Set([9, 10, 13, 12, 27]);

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => TEXT.test(f));
const findings = [];
let boms = 0;
for (const f of files) {
    let b;
    try { b = readFileSync(f); } catch { continue; }
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) boms++;
    for (let i = 0; i < b.length; i++) {
        const c = b[i];
        if (c < 0x20 && !ALLOWED.has(c)) { findings.push(`${f}: byte 0x${c.toString(16).padStart(2, '0')} at offset ${i}`); break; }
    }
}

console.log(`check:text-bytes — ${files.length} tracked text files scanned${boms ? `, ${boms} with a UTF-8 BOM (allowed)` : ''}`);
if (findings.length) {
    console.log(`\n  ✗ ${findings.length} file(s) carry a NUL or stray control byte — invisible to grep until fixed:`);
    for (const x of findings) console.log('      ' + x);
    process.exit(1);
}
console.log('  ✓ no NUL or stray control bytes');
