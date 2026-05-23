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
  filter: GalleryFilter;
  // Snapshot of engine pause state at open time so we can restore on close.
  prevPaused: boolean | null;
  // Monotonic counter — bumped after successful submit / approve / delete
  // to invalidate the cached browse query and force useGalleryItems to refetch.
  refreshTick: number;

  openGallery: () => void;
  closeGallery: () => void;
  openSubmit: () => void;
  closeSubmit: () => void;
  setFilter: (filter: GalleryFilter) => void;
  bumpRefresh: () => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  isOpen: false,
  isSubmitOpen: false,
  filter: {},
  prevPaused: null,
  refreshTick: 0,

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

  setFilter: (filter) => set({ filter }),
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
