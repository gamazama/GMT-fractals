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
  isMySubsOpen: boolean;
  filter: GalleryFilter;
  // Snapshot of engine pause state at open time so we can restore on close.
  prevPaused: boolean | null;
  // Monotonic counter — bumped after successful submit / approve / delete
  // to invalidate the cached browse query and force useGalleryItems to refetch.
  refreshTick: number;
  /** Pre-built image source for the submit modal. When set, the modal uses
   *  this PNG/JPEG instead of capturing a fresh viewport snapshot. Used by
   *  the bucket-render-complete prompt to submit the rendered image. */
  submitSource: Blob | null;

  openGallery: () => void;
  closeGallery: () => void;
  openSubmit: () => void;
  /** Open the submit modal preset to a specific source blob (e.g. a bucket
   *  render output). Modal converts to JPEG if needed via its existing
   *  capture/transcode path. */
  openSubmitWith: (source: Blob) => void;
  closeSubmit: () => void;
  openMySubmissions: () => void;
  closeMySubmissions: () => void;
  setFilter: (filter: GalleryFilter) => void;
  bumpRefresh: () => void;
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  isOpen: false,
  isSubmitOpen: false,
  isMySubsOpen: false,
  filter: {},
  prevPaused: null,
  refreshTick: 0,
  submitSource: null,

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

  openSubmit: () => set({ isSubmitOpen: true, submitSource: null }),
  openSubmitWith: (source) => set({ isSubmitOpen: true, submitSource: source }),
  closeSubmit: () => set({ isSubmitOpen: false, submitSource: null }),

  openMySubmissions: () => set({ isMySubsOpen: true }),
  closeMySubmissions: () => set({ isMySubsOpen: false }),

  setFilter: (filter) => set({ filter }),
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
