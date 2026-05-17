import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PORT = Number(process.env.SMOKE_PORT) || 3499;
const URL = process.env.ENGINE_URL || `http://localhost:${PORT}`;
const seedJson = JSON.parse(readFileSync('debug/bench-perf-timeline-seed.json', 'utf8'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
try {
    await page.goto(`${URL}/app-gmt.html`, { timeout: 30000 });
    await page.waitForFunction(`window.__gmtProxy && window.__gmtProxy.isBooted && window.__gmtProxy.hasCompiledShader`, undefined, { timeout: 30000 });
    // Load the seed directly from the local file (vite doesn't serve debug/ JSON).
    // The seed IS the sequence (not nested under .sequence).
    await page.evaluate((seq: any) => {
        const a = (window as any).useAnimationStore;
        if (a && a.getState().setSequence) {
            a.getState().setSequence(seq);
        }
    }, seedJson);
    // Open the timeline via the 'T' shortcut so TimelineHost mounts and exposes
    // __timelineSetMode (per bench-perf-timeline's openTimeline).
    await page.mouse.click(800, 540);
    await page.evaluate(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    await page.keyboard.press('t');
    await page.waitForFunction(`typeof window.__timelineSetMode === 'function'`, undefined, { timeout: 5000 });
    await page.evaluate(`window.__timelineSetMode && window.__timelineSetMode('Graph')`);
    // Give the GraphCanvas time to mount, then reset cache stats
    await page.evaluate(`new Promise(r => setTimeout(r, 1500))`);
    await page.evaluate(() => {
        const s = (window as any).__polylineCacheStats?.();
        if (s) {
            s.hits = 0;
            s.missNoEntry = 0;
            s.missViewKey = 0;
            s.missKeysRef = 0;
            s.sets = 0;
            s.lastMissDetail = '';
        }
        const d = (window as any).__drawStats?.();
        if (d) {
            d.backCalls = 0;
            d.overlayCalls = 0;
        }
    });
    // Play for ~2s
    await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        a.getState().seek(0);
        a.getState().play();
    });
    await page.evaluate(`new Promise(r => setTimeout(r, 2000))`);
    await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        a.getState().pause();
    });
    const stats = await page.evaluate(() => (window as any).__polylineCacheStats?.());
    const draws = await page.evaluate(() => (window as any).__drawStats?.());
    console.log('POLYLINE CACHE STATS after 2s graph-play:');
    console.log(JSON.stringify(stats, null, 2));
    console.log('DRAW STATS:');
    console.log(JSON.stringify(draws, null, 2));

    const env = await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        const s = a?.getState();
        return {
            hasStore: !!a,
            hasSetSequence: typeof s?.setSequence === 'function',
            trackCount: s?.sequence ? Object.keys(s.sequence.tracks ?? {}).length : null,
            keyCount: s?.sequence
                ? Object.values(s.sequence.tracks ?? {}).reduce((n: number, t: any) => n + (t.keyframes?.length ?? 0), 0)
                : null,
            timelineMode: (window as any).__timelineGetMode?.(),
            isPlaying: s?.isPlaying,
            currentFrame: s?.currentFrame,
            graphCanvasInDom: !!document.querySelector('canvas.cursor-crosshair'),
        };
    });
    console.log('ENV:', JSON.stringify(env, null, 2));
} finally {
    await browser.close();
}
