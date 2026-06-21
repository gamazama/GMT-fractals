/**
 * Standalone Zustand store for the gallery overlay.
 *
 * Kept out of engineStore because the gallery is pure UI + network — it
 * doesn't participate in the render loop or scene state. Cross-cuts into
 * engineStore only to pause/resume rendering while the overlay is open.
 */
import { create } from 'zustand';
import { pushUiPause, popUiPause } from '../../hooks/useRenderPause';

interface GalleryFilter {
  formula?: string;
  tag?: string;
}

interface GalleryStore {
  isOpen: boolean;
  isSubmitOpen: boolean;
  isMySubsOpen: boolean;
  filter: GalleryFilter;
  // Monotonic counter — bumped after successful submit / approve / delete
  // to invalidate the cached browse query and force useGalleryItems to refetch.
  refreshTick: number;
  /** Pre-built image source for the submit modal. When set, the modal uses
   *  this PNG/JPEG instead of capturing a fresh viewport snapshot. Used by
   *  the bucket-render-complete prompt to submit the rendered image. */
  submitSource: Blob | null;
  /** Deep-link target — when set, GalleryPage fetches the matching item by
   *  slug and opens its lightbox once the overlay is mounted. Cleared after
   *  the lightbox opens (or the fetch fails) so refreshing doesn't reopen. */
  pendingLightboxSlug: string | null;

  openGallery: () => void;
  closeGallery: () => void;
  /** Open the gallery overlay AND queue a lightbox open for `slug`. Used by
   *  the `?gallery=<slug>` URL handler and any future share-link UI. */
  openGalleryAtSlug: (slug: string) => void;
  clearPendingLightbox: () => void;
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
  refreshTick: 0,
  submitSource: null,
  pendingLightboxSlug: null,

  openGallery: () => {
    if (get().isOpen) return;
    set({ isOpen: true });
    pushUiPause(); // pause render while the overlay covers the viewport
  },

  closeGallery: () => {
    if (!get().isOpen) return;
    set({ isOpen: false, pendingLightboxSlug: null });
    popUiPause();
  },

  openGalleryAtSlug: (slug) => {
    set({ pendingLightboxSlug: slug });
    if (!get().isOpen) {
      set({ isOpen: true });
      pushUiPause();
    }
  },

  clearPendingLightbox: () => set({ pendingLightboxSlug: null }),

  openSubmit: () => set({ isSubmitOpen: true, submitSource: null }),
  openSubmitWith: (source) => set({ isSubmitOpen: true, submitSource: source }),
  closeSubmit: () => set({ isSubmitOpen: false, submitSource: null }),

  openMySubmissions: () => set({ isMySubsOpen: true }),
  closeMySubmissions: () => set({ isMySubsOpen: false }),

  setFilter: (filter) => set({ filter }),
  bumpRefresh: () => set((s) => ({ refreshTick: s.refreshTick + 1 })),
}));
