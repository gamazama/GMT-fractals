/**
 * Supabase client for the GMT online gallery.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time. Both are
 * client-safe — Row Level Security on the Supabase side enforces that the
 * anon role can only read approved gallery items.
 */
import { getSupabase, supabaseEnabled } from '../supabase';

const FUNCTION_BASE = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1';

export const galleryEnabled = supabaseEnabled;

const client = getSupabase;

export interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  formula: string;
  image_url: string;
  thumbnail_url: string;
  width: number | null;
  height: number | null;
  tags: string[];
  featured: boolean;
  created_at: string;
  author: string | null;
  image_format: 'jpg' | 'png';
  /** Externalized env-map URL. Loader injects this into
   *  preset.materials.envMapData before applying so the scene's sky comes
   *  back without storing megabytes of base64 inside gmf_data. */
  sky_url: string | null;
  /** uuid of the uploader's profile, or null for pre-2B curated rows. Used
   *  by the lightbox's "More from @user" strip. */
  user_id: string | null;
  /** 'public' | 'private'. Phase 2B added visibility per-submission. */
  visibility: 'public' | 'private';
  /** Moderation status. Browse query only returns 'approved'; owner-side
   *  My Submissions surfaces all three. */
  status: 'pending' | 'approved' | 'rejected';
  /** Only populated when the item is fetched individually via getGalleryItem.
   *  The listGallery query intentionally excludes this column so browse pages
   *  don't drag scene-blob bytes for every tile. */
  gmf_data?: string | null;
}

// Columns pulled by the browse-grid query. Excludes gmf_data to keep tile
// loads light — the click-to-open path re-queries the single row with
// gmf_data via getGalleryItem.
const LIST_COLUMNS =
  'id,slug,title,description,formula,image_url,thumbnail_url,width,height,tags,featured,created_at,author,image_format,sky_url,user_id,visibility,status';

export interface ListGalleryOpts {
  limit?: number;
  offset?: number;
  formula?: string;
  tag?: string;
  featuredOnly?: boolean;
}

export async function listGallery(opts: ListGalleryOpts = {}): Promise<GalleryItem[]> {
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  let query = client()
    .from('gallery_items')
    .select(LIST_COLUMNS)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.formula) query = query.eq('formula', opts.formula);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.featuredOnly) query = query.eq('featured', true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as GalleryItem[];
}

/**
 * List the signed-in user's OWN submissions (any status, any visibility).
 * Uses the engine-gmt store's current session implicitly via the shared
 * supabase client — RLS allows owners to read all of their rows including
 * pending / rejected (see "owner reads own pending" policy in plan 41 §5.1).
 */
export async function listMySubmissions(userId: string): Promise<GalleryItem[]> {
  const { data, error } = await client()
    .from('gallery_items')
    .select(LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GalleryItem[];
}

/** Owner-side delete of a submission. Routes through the
 *  delete-my-submission Edge Function which handles BOTH the DB row
 *  and the R2 object cleanup (scenes/thumbs/skies) under one
 *  ownership-checked transaction. */
export async function deleteMySubmission(id: string, _userId: string): Promise<void> {
  const { data: { session } } = await client().auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${FUNCTION_BASE}/delete-my-submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    let msg = `Delete failed (${res.status})`;
    try { const body = await res.json(); if (body?.error) msg = body.error; } catch {}
    throw new Error(msg);
  }
}

/** Owner-side visibility update — flips public↔private. Owner can also
 *  patch title / description / tags via RLS. .select() forces a return
 *  so RLS no-ops surface as an error instead of silent success. */
export async function updateMyVisibility(id: string, userId: string, visibility: 'public' | 'private'): Promise<void> {
  const { data, error } = await client()
    .from('gallery_items')
    .update({ visibility })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No rows updated — check that the owner RLS policies are in place.');
  }
}

export async function getGalleryItem(slug: string): Promise<GalleryItem | null> {
  const { data, error } = await client()
    .from('gallery_items')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as GalleryItem | null;
}
