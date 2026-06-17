/**
 * Quick pixel-diff between two PNGs. Used to verify shader patches are
 * radiance-neutral despite snapshot drift causing exact-hash mismatch.
 *
 * Usage: npx tsx debug/helpers/image-diff.mts <a.png> <b.png> [<c.png> ...]
 *
 * Computes pairwise MAE/RMSE/maxErr. Prints a small table.
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
    const paths = process.argv.slice(2).map(p => resolve(p));
    if (paths.length < 2) {
        console.error('Need at least 2 PNG paths');
        process.exit(1);
    }

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.goto('about:blank');

    const dataUrls = paths.map(p => `data:image/png;base64,${readFileSync(p).toString('base64')}`);

    const script = `(async (urls) => {
        function load(url) {
            return new Promise(function (ok, err) {
                const img = new Image();
                img.onload = function () { ok(img); };
                img.onerror = err;
                img.src = url;
            });
        }
        const imgs = await Promise.all(urls.map(load));
        const W = imgs[0].naturalWidth, H = imgs[0].naturalHeight;
        function rgba(img) {
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, W, H);
            return ctx.getImageData(0, 0, W, H).data;
        }
        const datas = imgs.map(rgba);
        const out = [];
        for (let i = 0; i < datas.length; i++) {
            for (let j = i+1; j < datas.length; j++) {
                const a = datas[i], b = datas[j];
                let sumAbs = 0, sumSq = 0, maxErr = 0;
                for (let p = 0; p < W*H; p++) {
                    const k = p*4;
                    for (let c = 0; c < 3; c++) {
                        const d = Math.abs(a[k+c] - b[k+c]);
                        sumAbs += d; sumSq += d*d;
                        if (d > maxErr) maxErr = d;
                    }
                }
                const N = W*H*3;
                out.push({ i, j, mae: sumAbs/N, rmse: Math.sqrt(sumSq/N), maxErr });
            }
        }
        return { W, H, out };
    })(${JSON.stringify(dataUrls)})`;

    const result = await page.evaluate(script) as any;
    await browser.close();

    console.log(`Resolution: ${result.W}x${result.H}`);
    console.log('');
    console.log('idx  file');
    paths.forEach((p, i) => console.log(`${i.toString().padStart(2)}   ${p.split(/[\\/]/).pop()}`));
    console.log('');
    console.log('a vs b   MAE/255    RMSE/255   maxErr');
    for (const r of result.out) {
        console.log(`${r.i} vs ${r.j}    ${r.mae.toFixed(3).padStart(7)}    ${r.rmse.toFixed(3).padStart(7)}    ${r.maxErr.toString().padStart(4)}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
