/**
 * firstRunDecision — what the shell should do about brightness on a given boot.
 *
 * Split out from main.tsx as a pure function purely so it can be pinned: the interesting
 * rule here is the one that was already wrong once, silently, for months. See
 * `FirstRunBrightness.tsx` for why the shell asks at all.
 *
 * The inputs are the whole state: whether v2 has booted in this browser before, whether a
 * brightness has ever been chosen — in THIS app or any other GMT app, since the theme axes
 * are shared (`gmt.brightness`, engine/store/colorSchemeStore.ts) — and whether this page was
 * opened by GMT's Explorer button.
 *
 * A TRIP FROM GMT (owner, 2026-09-24) neither asks nor seeds. A default GMT user has never
 * chosen a brightness either (GMT writes `gmt.brightness` only when it is changed), so the
 * rule above would ask them — over the gradient they just brought — and the preset it applies
 * is shared, so GMT would open in the Explorer's look on its next boot. The Explorer opens
 * looking like the GMT the user just left, and nothing is marked (`marksSeeded`), so the
 * first visit that is NOT a trip still asks.
 *
 * @invariant a user who has already chosen a brightness is never asked and never
 *   overridden — proven by: npx tsx debug/test-ge-first-run.mts ("an app-gmt user keeps
 *   their brightness")
 * @invariant a trip from GMT is not asked, applies no preset and does not mark the browser
 *   seen — proven by: npx tsx debug/test-ge-first-run.mts ("a GMT trip is not asked",
 *   "...and marks nothing, so the first standalone visit still asks")
 */

/** What boot should do. `ask` = apply the opening preset AND show the dialogue. */
export type FirstRunVerdict = 'ask' | 'quiet';

export interface FirstRunInput {
  /** Has v2 booted in this browser before (`gmt.ge.themeSeeded`)? */
  seeded: boolean;
  /** Has a brightness ever been chosen anywhere (`gmt.brightness`), or is it null? */
  chosenBrightness: string | null;
  /** Was this page opened by GMT's Explorer button (`?from=gmt`, fromGmt.ts `openedByGmtButton`)? */
  fromGmt: boolean;
}

/**
 * `ask` means: apply the opening preset (Grey) AND show the dialogue. `quiet` means touch
 * nothing — we have asked before, the user already has a brightness we have no business
 * overwriting, or they are on a trip from GMT.
 */
export const decideFirstRun = ({ seeded, chosenBrightness, fromGmt }: FirstRunInput): FirstRunVerdict => {
  if (fromGmt) return 'quiet';
  if (seeded) return 'quiet';
  if (chosenBrightness !== null) return 'quiet';
  return 'ask';
};

/**
 * Should boot write the "v2 has booted here" flag (`gmt.ge.themeSeeded`)? Once per browser —
 * but never on a trip from GMT, so a user whose first visit was a trip is still asked on the
 * first visit that is not one.
 */
export const marksSeeded = ({ seeded, fromGmt }: FirstRunInput): boolean => !seeded && !fromGmt;
