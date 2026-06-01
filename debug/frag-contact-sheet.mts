/**
 * frag-contact-sheet.mts — composite all rendered frag PNGs into contact-sheet
 * grids + an HTML index, from the PNGs in the gallery output dir.
 *
 * Usage: npx tsx debug/frag-contact-sheet.mts [--dir=debug/scratch/frag-gallery] [--cols=8] [--tile=180]
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';

function arg(flag: string, def?: string) {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const DIR  = arg('--dir', 'debug/scratch/frag-gallery')!;
const COLS = parseInt(arg('--cols', '8')!, 10);
const TILE = parseInt(arg('--tile', '180')!, 10);
const PER_SHEET = parseInt(arg('--persheet', '64')!, 10);  // tiles per sheet image

async function main() {
    const pngs = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && !f.startsWith('_sheet')).sort();
    console.log(`${pngs.length} PNGs in ${DIR}`);
    if (!pngs.length) { console.log('nothing to composite'); return; }

    const browser = await chromium.launch();
    const page = await browser.newContext({ viewport: { width: 1600, height: 1600 } }).then(c => c.newPage());

    const sheets: string[] = [];
    for (let s = 0; s * PER_SHEET < pngs.length; s++) {
        const batch = pngs.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
        const tiles = batch.map(f => ({
            label: f.replace(/\.png$/, '').replace(/^[^_]*_/, '').slice(0, 24),
            dataUrl: 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64'),
        }));
        const grid: string = await page.evaluate(async ({ tiles, COLS, TILE }) => {
            const labelH = 16, pad = 3, cw = TILE + pad * 2, ch = TILE + labelH + pad * 2;
            const rows = Math.ceil(tiles.length / COLS);
            const cvs = document.createElement('canvas'); cvs.width = COLS * cw; cvs.height = rows * ch;
            const ctx = cvs.getContext('2d')!; ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, cvs.width, cvs.height);
            for (let i = 0; i < tiles.length; i++) {
                const cx = (i % COLS) * cw + pad, cy = Math.floor(i / COLS) * ch + pad;
                const img = new Image(); img.src = tiles[i].dataUrl;
                await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
                ctx.drawImage(img, cx, cy, TILE, TILE);
                ctx.fillStyle = '#c9d1d9'; ctx.font = '11px monospace';
                ctx.fillText(tiles[i].label, cx + 1, cy + TILE + 12);
            }
            return cvs.toDataURL('image/png');
        }, { tiles, COLS, TILE });
        const out = path.join(DIR, `_sheet_${String(s).padStart(2, '0')}.png`);
        fs.writeFileSync(out, Buffer.from(grid.replace(/^data:image\/png;base64,/, ''), 'base64'));
        sheets.push(path.basename(out));
        console.log(`wrote ${out} (${batch.length} tiles)`);
    }
    await browser.close();

    // HTML index linking every individual PNG.
    const html = `<!doctype html><meta charset=utf8><title>Frag Gallery</title>
<style>body{background:#0d1117;color:#c9d1d9;font:13px monospace;margin:12px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.c{background:#161b22;padding:4px;border-radius:4px}.c img{width:100%;display:block}.c div{font-size:11px;word-break:break-all;margin-top:3px}</style>
<h2>Frag Workshop Gallery — ${pngs.length} formulas</h2>
<div class=g>${pngs.map(f => `<div class=c><img src="${f}" loading=lazy><div>${f.replace(/\.png$/, '')}</div></div>`).join('')}</div>`;
    fs.writeFileSync(path.join(DIR, 'index.html'), html);
    console.log(`wrote ${path.join(DIR, 'index.html')} + ${sheets.length} contact sheets`);
}
main().catch(e => { console.error(e); process.exit(1); });
