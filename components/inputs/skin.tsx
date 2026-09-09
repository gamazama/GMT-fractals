/**
 * InputSkin — a second look for the scalar inputs, chosen by CONTEXT so a host paints every
 * slider under it without touching the callers (AutoFeaturePanel, Slider, the Mix face).
 *
 *   'default' — the studio's boxed slider: a filled header with the value cell, a 20 px
 *               track with a bracket thumb and a reset strip. app-gmt, unchanged.
 *   'soft'    — Gradient Explorer v2's language (owner, 2026-09-07: "a different skin that
 *               will match our visual language here"): no box — the label and value on one
 *               quiet line, a 10 px rounded bar under it with a rounded fill and a round
 *               thumb, the default value a thin tick. Same gestures, same drag hook.
 *
 * Genericize, don't fork (CLAUDE.md): this is a skin on the master ScalarInput, never a
 * parallel slider. Provide it with <InputSkinProvider skin="soft"> around a subtree.
 */
import React, { createContext, useContext } from 'react';

export type InputSkin = 'default' | 'soft';

const InputSkinContext = createContext<InputSkin>('default');

export const InputSkinProvider: React.FC<{ skin: InputSkin; children: React.ReactNode }> = ({ skin, children }) => (
  <InputSkinContext.Provider value={skin}>{children}</InputSkinContext.Provider>
);

export const useInputSkin = (): InputSkin => useContext(InputSkinContext);
