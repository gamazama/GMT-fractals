/**
 * host-contract-types - the compile-time half of `host-contract.mts`.
 *
 * The host contract (`deep-zoom/host/DeepZoomHost.ts`) may not load the renderer, so it declares
 * the view / telemetry / path shapes again instead of re-exporting the module's. This file is
 * what keeps the two from drifting: every entry of `proofs` is typed by a comparison of the two
 * declarations, and assigning `true` to one that came out `false` is a type error naming the
 * entry. Nothing here runs.
 *
 * It is a `.ts` file on purpose. `tsconfig.json` includes `**\/*.ts` and not `.mts`, so
 * `npm run typecheck` reads this file and would not read the same lines inside the `.mts` check.
 * `host-contract.mts` loads it (so knip reaches it through the `debug/deep-zoom-checks/*.mts`
 * entry) and also type-checks it alone, so the check goes red on a drift without a whole-repo tsc.
 *
 * This is the one file outside `deep-zoom/host/` that names `deep-zoom/renderer`, types only.
 * It is not part of the shell; the "renderer is loaded only under deep-zoom/host/" rule is about
 * `deep-zoom/**`.
 */
import type {
    DzPath as ModulePath,
    DzSense as ModuleSense,
    DzSenseOptions as ModuleSenseOptions,
    DzSettings as ModuleSettings,
    DzTelemetry as ModuleTelemetry,
    DzView as ModuleView,
} from '../../deep-zoom/renderer';
import type { DzParams, DzPath, DzSense, DzSenseOptions, DzTelemetry, DzView } from '../../deep-zoom/host/DeepZoomHost';

/** true only when A and B are the same type: an added, removed, renamed, retyped or newly optional
 *  field on either side, at any depth, makes it false. */
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
/** true when a value of From can be handed to something that wants To. */
type Fits<From, To> = [From] extends [To] ? true : false;
/** An interface as a plain object type (what a spread `{ ...settings }` produces). */
type Flat<T> = { [K in keyof T]: T[K] };

export const proofs: {
    /** A module view is a contract view and back: `getView` / `setView` need no conversion. */
    viewModuleToContract: Fits<ModuleView, DzView>;
    viewContractToModule: Fits<DzView, ModuleView>;
    viewSame: Same<ModuleView, DzView>;
    telemetryModuleToContract: Fits<ModuleTelemetry, DzTelemetry>;
    telemetryContractToModule: Fits<DzTelemetry, ModuleTelemetry>;
    telemetrySame: Same<ModuleTelemetry, DzTelemetry>;
    pathModuleToContract: Fits<ModulePath, DzPath>;
    pathContractToModule: Fits<DzPath, ModulePath>;
    pathSame: Same<ModulePath, DzPath>;
    /** What the ray probe answers, and its options: `sense` passes both through untouched. */
    senseSame: Same<ModuleSense, DzSense>;
    senseOptionsSame: Same<ModuleSenseOptions, DzSenseOptions>;
    /** Stage 1: `getParams()` returns a spread copy of the module's settings as `DzParams`. */
    settingsFitParams: Fits<Flat<ModuleSettings>, DzParams>;
} = {
    viewModuleToContract: true,
    viewContractToModule: true,
    viewSame: true,
    telemetryModuleToContract: true,
    telemetryContractToModule: true,
    telemetrySame: true,
    pathModuleToContract: true,
    pathContractToModule: true,
    pathSame: true,
    senseSame: true,
    senseOptionsSame: true,
    settingsFitParams: true,
};
