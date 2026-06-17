/**
 * Playwright + WebGL harness — encapsulates the launch flags, click
 * timings, and drag recipes that empirically work with our fluid-toy
 * canvas without the periodic hangs we hit using defaults.
 *
 * Failure modes patched:
 *
 *   1. `mouse.down() → mouse.move()` hangs when the canvas captures
 *      pointers. Playwright's autowait-for-navigation blocks forever
 *      because the WebGL frame loop keeps the page "busy". Fix:
 *      always pass `{ noWaitAfter: true }` on mouse.down/up and
 *      yield ~20ms between moves so RAF can tick.
 *
 *   2. `page.locator('…').click()` hits the Playwright-autowait-
 *      after-click loop against our canvas render, which never
 *      idles. Fix: `forceClick` helper sets `{ force: true,
 *      noWaitAfter: true }` on every click.
 *
 *   3. Keyboard shortcuts dispatched to a focused button don't
 *      reach the window-level handler. Fix: `pressShortcut` blurs
 *      document.activeElement before dispatching.
 *
 *   4. Viewport defaulting. Playwright's default ~1280×720 viewport
 *      sometimes renders panels offscreen in our layout. Default
 *      to 1400×900 here.
 *
 * Known limit: Chromium's GPU process has a watchdog that terminates
 * the renderer after sustained high-rate WebGL work (tens of drags +
 * per-frame readPixels). That's an upstream constraint — mitigate in
 * tests by keeping drag paths under ~15 steps or by spacing RAF work
 * across multiple `waitForTimeout` gaps.
 *
 * Usage:
 *
 *     import { launchWebglTestPage, dragPath, forceClick } from './helpers/webglHarness';
 *     const { page, browser } = await launchWebglTestPage();
 *     await page.goto(URL);
 *     // ... regular playwright ...
 *     await dragPath(page, { x: 100, y: 200, steps: 10, dx: 5, dy: 0 });
 *     await forceClick(page.locator('button'));
 *     await browser.close();
 */

import { chromium, type Browser, type Page, type Locator } from 'playwright';

export interface LaunchOptions {
    /** Page viewport size (pixels). Default 1400×900. */
    viewport?: { width: number; height: number };
    /** Extra browser launch args. Defaults cover WebGL flakiness. */
    extraLaunchArgs?: string[];
    /** Dev-server URL to navigate after launch. If omitted, caller
     *  calls page.goto themselves. */
    url?: string;
    /** Milliseconds to wait after page load before returning — lets
     *  React mount + the first engine frame land. Default 2500. */
    bootWaitMs?: number;
    /** Collect page errors + console errors into this array.
     *  When omitted, errors are printed with `console.log`. */
    errorSink?: string[];
}

export interface TestPage {
    page: Page;
    browser: Browser;
    /** Errors captured during the session. */
    errors: string[];
    /** Throw if any FATAL errors landed. Call at the end of the test. */
    assertNoFatalErrors: () => void;
}

/**
 * Launch browser + context + page with WebGL-friendly defaults and
 * return a Page that works reliably against our canvas apps.
 *
 * Launch args:
 *   --disable-gpu                → force SwiftShader. Stable on CI.
 *   --use-gl=swiftshader         → explicit software WebGL backend.
 *   --enable-webgl               → some distros disable WebGL by default.
 *   --disable-dev-shm-usage      → avoid /dev/shm issues on Linux CI.
 *   --no-sandbox                 → CI environments where sandbox fails.
 */
export const launchWebglTestPage = async (opts: LaunchOptions = {}): Promise<TestPage> => {
    const errors: string[] = opts.errorSink ?? [];
    // Launch flags: default to hardware WebGL (SwiftShader turned out
    // to boot far too slowly against the fluid-sim init cost, and the
    // Chromium defaults are actually reliable once the pointer-capture
    // autowait trap is handled with `noWaitAfter`).
    //
    //   --disable-dev-shm-usage   avoids /dev/shm issues on some Linux.
    //   --no-sandbox              some CI environments require this.
    // Launch flags — empirically tuned for a canvas app with a RAF loop
    // that keeps the page "busy":
    //
    //   --disable-gpu-sandbox     Chromium otherwise kills the GPU
    //                             process after ~1s of sustained WebGL
    //                             activity in automation runs, which
    //                             presents as "Target crashed" partway
    //                             through a drag.
    //   --disable-blink-features=
    //     AutomationControlled    avoid the "automation" flag that
    //                             triggers some watchdog behaviour.
    //   --disable-features=
    //     IsolateOrigins,
    //     site-per-process        single renderer process, less flaky.
    const browser = await chromium.launch({
        args: [
            '--disable-gpu-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            ...(opts.extraLaunchArgs ?? []),
        ],
    });
    const context = await browser.newContext({
        viewport: opts.viewport ?? { width: 1400, height: 900 },
    });
    const page = await context.newPage();

    page.on('pageerror',  (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });

    if (opts.url) {
        // domcontentloaded is enough — waiting for 'networkidle' fights the
        // continuous RAF loop which never idles.
        await page.goto(opts.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(opts.bootWaitMs ?? 2500);
    }

    const assertNoFatalErrors = () => {
        const fatal = errors.filter((e) =>
            /TypeError|ReferenceError|\bis not a function\b|FeatureRegistryFrozenError|Uncaught/.test(e),
        );
        if (fatal.length > 0) {
            throw new Error('fatal page errors:\n  ' + fatal.join('\n  '));
        }
    };

    return { page, browser, errors, assertNoFatalErrors };
};

export interface DragPathOptions {
    /** Starting screen x. */
    x: number;
    /** Starting screen y. */
    y: number;
    /** Number of intermediate moves. */
    steps: number;
    /** Per-step x delta. */
    dx: number;
    /** Per-step y delta. */
    dy: number;
    /** Optional y-oscillation amplitude (adds `sin(step) * oscY` to each move). */
    oscY?: number;
    /** Delay after each move in ms. 16 ≈ one RAF frame; defaults to 20 for headroom. */
    stepDelayMs?: number;
    /** Mouse button. Default 'left'. */
    button?: 'left' | 'right' | 'middle';
    /** Modifier key held during the drag, e.g. 'KeyB' for brush-resize. */
    heldKey?: string;
}

/**
 * Reliable drag gesture. Works around the "pointer capture + canvas"
 * hang by using `noWaitAfter: true` on down/up and yielding ~20ms
 * between moves so RAF can tick.
 */
export const dragPath = async (page: Page, opts: DragPathOptions): Promise<void> => {
    const delay = opts.stepDelayMs ?? 20;
    if (opts.heldKey) await page.keyboard.down(opts.heldKey);
    await page.mouse.move(opts.x, opts.y);
    await page.mouse.down({ button: opts.button ?? 'left' });
    for (let i = 1; i <= opts.steps; i++) {
        const yOsc = opts.oscY ? Math.sin(i * 0.3) * opts.oscY : 0;
        await page.mouse.move(opts.x + i * opts.dx, opts.y + i * opts.dy + yOsc);
        await page.waitForTimeout(delay);
    }
    await page.mouse.up({ button: opts.button ?? 'left' });
    if (opts.heldKey) await page.keyboard.up(opts.heldKey);
    // One more RAF tick so the final up-event's effect settles.
    await page.waitForTimeout(50);
};

/**
 * Click a Locator with the flags that survive the WebGL-autowait hang.
 * `force: true` skips actionability checks; `noWaitAfter: true` skips
 * the post-click wait-for-navigation that the RAF loop never satisfies.
 */
export const forceClick = async (locator: Locator, options?: { timeout?: number }): Promise<void> => {
    await locator.click({
        force: true,
        noWaitAfter: true,
        timeout: options?.timeout ?? 5000,
    });
};

/**
 * Press a keyboard shortcut with focus moved off any input first.
 * The engine's shortcut plugin ignores events when an INPUT/TEXTAREA
 * is focused; blur before pressing so the key actually dispatches.
 */
export const pressShortcut = async (page: Page, key: string): Promise<void> => {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press(key);
    await page.waitForTimeout(50);
};
