/**
 * Standalone Zustand store for the gallery overlay.
 *
 * Kept out of engineStore because the gallery is pure UI + network — it
 * doesn't participate in the render loop or scene state. Cross-cuts into
 * engineStore only to pause/resume rendering while the overlay is open.
 */
import { create } from 'zustand';
import { useEngineStore } from '../../store/engineStore';

interface GalleryFilter {
  formula?: string;
  tag?: string;
}

interface GalleryStore {
  isOpen: boolean;
  isSubmitOpen: boolean;
  isAdminOpen: boolean;
  filter: GalleryFilter;
  // Snapshot of engine pause state at open time so we can restore on close.
  prevPaused: boolean | null;

  openGallery: () => void;
  closeGallery: () => void;
  openSubmit: () => void;
  closeSubmit: () => void;
  openAdmin: () => void;
  closeAdmin: () => void;
  setFilter: (filter: GalleryFilter) => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  isOpen: false,
  isSubmitOpen: false,
  isAdminOpen: false,
  filter: {},
  prevPaused: null,

  openGallery: () => {
    if (get().isOpen) return;
    const s = useEngineStore.getState() as any;
    set({ isOpen: true, prevPaused: s.isPaused ?? false });
    s.setIsPaused?.(true);
  },

  closeGallery: () => {
    if (!get().isOpen) return;
    const { prevPaused } = get();
    set({ isOpen: false, prevPaused: null });
    if (prevPaused !== null) {
      (useEngineStore.getState() as any).setIsPaused?.(prevPaused);
    }
  },

  openSubmit: () => set({ isSubmitOpen: true }),
  closeSubmit: () => set({ isSubmitOpen: false }),

  openAdmin: () => set({ isAdminOpen: true }),
  closeAdmin: () => set({ isAdminOpen: false }),

  setFilter: (filter) => set({ filter }),
}));
