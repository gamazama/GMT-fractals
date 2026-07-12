/**
 * ParamMapper — the shared param→uniform-slot mapping primitive: a slot-assignment
 * table (ParamTable), the per-param slot dropdown (SlotPicker), and the slot
 * presentation vocabulary (slotLabel / groupedSlotOptions). Extracted from the
 * Formula Workshop so the Workshop and the weave editor consume ONE mapper UI.
 *
 * Occupancy/conflict logic lives in engine-gmt/utils/uniformSlots.ts (the slot
 * vocabulary owner); this module is the UI layer over it.
 */

export { ParamTable } from './ParamTable';
export type { ParamMapping } from './ParamTable';
export { SlotPicker } from './SlotPicker';
export { slotLabel, slotOptionsForType, groupedSlotOptions } from './slotOptions';
export type { SlotGroup } from './slotOptions';
