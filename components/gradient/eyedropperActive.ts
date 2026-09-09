/**
 * eyedropperActive — is the screen eyedropper open right now?
 *
 * The eyedropper is the browser's own `EyeDropper`, which samples what is actually PAINTED.
 * That makes the rest of the interface part of the instrument: anything drawn dimmed,
 * greyed or shrunk is sampled dimmed, greyed and shrunk. GE v2's hero greys its source
 * image and drops it to an 84 px thumbnail once the gradient stops being that image, which
 * is right while you are looking at it and wrong the moment you are picking OUT of it —
 * you would be sampling a desaturated thumbnail and getting a colour the photo does not
 * contain (§8b item 8).
 *
 * So the picker announces that it is picking, and surfaces that present an image can drop
 * their "this is no longer what you see" treatment for the duration. The rule the owner
 * asked to have written down: an image's presentation depends on what you are DOING with
 * it, not only on whether the gradient still derives from it.
 *
 * Engine-core, and deliberately so: `components/**` cannot import an app, so this cannot
 * live beside the v2 stores that read it (app → core is the allowed direction). Same plain
 * `useSyncExternalStore` module shape as `palette/store/armedTarget.ts`. Transient — not
 * DDFS, not persisted, no undo.
 */
import { useSyncExternalStore } from 'react';

let active = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void): (() => void) => {
    listeners.add(l);
    return () => { listeners.delete(l); };
};

/** Open/close. The picker MUST clear this in a finally — a cancelled pick rejects. */
export const setEyedropperActive = (on: boolean): void => {
    if (active === on) return;
    active = on;
    listeners.forEach((l) => l());
};

/** Imperative read, for non-React call sites. */
export const isEyedropperActive = (): boolean => active;

/** Is a screen pick in progress? Surfaces showing an image should present it faithfully. */
export const useEyedropperActive = (): boolean =>
    useSyncExternalStore(subscribe, () => active, () => active);
