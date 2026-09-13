/**
 * catalogPacks — WHICH catalogue packs exist, which source bundles each holds, and whether
 * each is published. The one table both sides read: the bake (`debug/palette-packs.mts` →
 * `debug/bake-palette-catalog.mts`) decides where a pack's files go and what the upload
 * manifest lists, and the app (`catalogLoader.PALETTE_GROUPS`) registers exactly the packs
 * that are not `false`.
 *
 * THE PUBLISH SWITCH (owner, 2026-09-13: make the answer "a one-line change"). Changing one
 * value in `PACK_PUBLISH` and re-baking is the whole decision:
 *   'repo'     tracked in public/palette/, always loaded (core only)
 *   'cdn'      uploaded to R2 by default; desktop hosts may load it at boot
 *   'optional' uploaded to R2 like 'cdn' (it is published), but never loaded at boot by any
 *              host: reachable only by ticking it under "Optional packs" in Filters ▸ Sources
 *   false      NOT FOR PUBLICATION: written outside public/ (palette-lab/out/unpublished/),
 *              never registered in the app, never in the upload manifest. Its gradients stay
 *              in the GX Global catalogue signature list.
 *
 * Separating a set into a pack does not change its terms; `publish` is where the bake puts
 * it, not a licence. Labels, notes and licence tags live in `debug/palette-packs.mts` and
 * palette-lab's `bundles/manifest.json`.
 */

export type PackPublish = 'repo' | 'cdn' | 'optional' | false;

export const PACK_PUBLISH = {
  core: 'repo',
  softology: 'cdn',
  cptcity: 'cdn',
  elvensword: 'cdn',
  // Owner, 2026-09-13 (final): PUBLISHED as a separate, labelled, credited pack, OFF by default
  // in the app. false here withdraws it everywhere (not uploaded, not registered) — one line,
  // then re-bake.
  noncommercial: 'optional',
  unpublished: false,
} as const satisfies Record<string, PackPublish>;

export type PackId = keyof typeof PACK_PUBLISH;

/** Source bundles per pack. Every bundle is in exactly one pack. Order = load / list order. */
export const PACK_BUNDLES: Record<PackId, readonly string[]> = {
  core: ['uigradients', 'colorbrewer', 'matplotlib', 'pypalettes'],
  softology: ['softology'],
  cptcity: ['cptcity'],
  elvensword: ['elvensword'],
  noncommercial: ['cptcity-nc', 'pypalettes-nc', 'softology-nc'],
  unpublished: ['cptcity-noredist', 'pypalettes-nolicence', 'cptcity-jm'],
};

export const PACK_IDS = Object.keys(PACK_PUBLISH) as PackId[];
