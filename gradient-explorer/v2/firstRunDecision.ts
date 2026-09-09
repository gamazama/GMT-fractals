/**
 * firstRunDecision — what the shell should do about brightness on a given boot.
 *
 * Split out from main.tsx as a pure function purely so it can be pinned: the interesting
 * rule here is the one that was already wrong once, silently, for months. See
 * `FirstRunBrightness.tsx` for why the shell asks at all.
 *
 * The three inputs are the whole state: whether v2 has booted in this browser before, and
 * whether a brightness has ever been chosen — in THIS app or any other GMT app, since the
 * theme axes are shared (`gmt.brightness`, engine/store/colorSchemeStore.ts).
 *
 * @invariant a user who has already chosen a brightness is never asked and never
 *   overridden — proven by: npx tsx debug/test-ge-first-run.mts ("an app-gmt user keeps
 *   their brightness")
 */

/** What boot should do. `seed` = apply Light Grey; `ask` = also show the dialogue. */
export type FirstRunVerdict = 'ask' | 'quiet';

export interface FirstRunInput {
  /** Has v2 booted in this browser before (`gmt.ge.themeSeeded`)? */
  seeded: boolean;
  /** Has a brightness ever been chosen anywhere (`gmt.brightness`), or is it null? */
  chosenBrightness: string | null;
}

/**
 * `ask` means: apply Light Grey as the opening position AND show the dialogue. `quiet`
 * means touch nothing — either we have asked before, or the user already has a brightness
 * we have no business overwriting.
 */
export const decideFirstRun = ({ seeded, chosenBrightness }: FirstRunInput): FirstRunVerdict => {
  if (seeded) return 'quiet';
  if (chosenBrightness !== null) return 'quiet';
  return 'ask';
};
