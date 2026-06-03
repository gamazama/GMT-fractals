/**
 * paletteOverlayStore — open/close state for the app-gmt Palette Picker overlay, lifted
 * out of the topbar button so it can be opened programmatically (e.g. the Favients
 * panel's "Palettes" button).
 */

import { create } from 'zustand';

interface PaletteOverlayState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const usePaletteOverlayStore = create<PaletteOverlayState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
