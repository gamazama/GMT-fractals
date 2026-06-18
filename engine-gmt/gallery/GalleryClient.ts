/**
 * Supabase client for the GMT online gallery.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time. Both are
 * client-safe — Row Level Security on the Supabase side is the boundary:
 * an anonymous request can only read rows where status='approved' AND
 * visibility='public', while a request carrying a session reads ALSO that
 * user's own rows at any status/visibility (the "owner reads own" policy).
 * That second policy is why a persisted session must not be conflated with a
 * public feed: use the `publicOnly` flag below for any feed (e.g. the picker's
 * Curated Gallery) that should show public rows only, regardless of who is
 * signed in.
 */
import { getSupabase, supabaseEnabled } from '../supabase';

const FUNCTION_BASE = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1';

export const galleryEnabled = supabaseEnabled;

/** Shared "Featured" badge colour cluster (cyan). Only the colour treatment is
 *  shared across the gallery surfaces (GalleryTile, MySubmissionsOverlay,
 *  Lightbox); each keeps its own layout classes (size / padding / position). */
export const GALLERY_FEATURED_BADGE = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';

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
  /** Immutable @handle for the uploader. Use this for bylines + profile
   *  links instead of `author` (which is the editable display_name and can
   *  be impersonated). Null for pre-2B curated rows. */
  username: string | null;
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
  'id,slug,title,description,formula,image_url,thumbnail_url,width,height,tags,featured,created_at,author,username,image_format,sky_url,user_id,visibility,status';

export interface ListGalleryOpts {
  limit?: number;
  offset?: number;
  formula?: string;
  tag?: string;
  featuredOnly?: boolean;
  /** Restrict to `visibility = 'public'` rows. Use for any feed that is
   *  meant to show only the public gallery (e.g. the picker's Curated
   *  Gallery). Defaults to false: callers that group owner-private rows
   *  client-side (GalleryPage) leave it off and rely on RLS to scope the
   *  private rows to the signed-in owner. Defence-in-depth — the SELECT
   *  RLS policy is the real boundary; this stops a private row from ever
   *  rendering in a public-only feed even if that policy regresses. */
  publicOnly?: boolean;
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

  if (opts.publicOnly) query = query.eq('visibility', 'public');
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

/**
 * Fetch a single submission's `gmf_data` payload by id, restricted to rows
 * owned by `userId`. Required to load a user's own submission into the
 * scene — `getGalleryItem` filters to status=approved and so won't return
 * pending/rejected rows the owner still has access to via RLS.
 *
 * Used by the FormulaPicker's My Submissions scene group.
 */
export async function getMySubmissionData(id: string, userId: string): Promise<string | null> {
  const { data, error } = await client()
    .from('gallery_items')
    .select('gmf_data')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.gmf_data ?? null) as string | null;
}

/**
 * Fetch a single approved gallery row by slug, including `gmf_data`.
 *
 * `publicOnly` defaults true: this is reached by the public deep-link path
 * (`?gallery=<slug>`) and the non-owner scene loader, so it must NOT surface
 * an approved-but-private row to a non-owner just because they know the slug.
 * Owners load their own private/pending rows via the user_id-scoped
 * `getMySubmissionData` instead — same defence-in-depth as listGallery's
 * `publicOnly` flag; RLS is the boundary, this stops a private row rendering
 * if that policy regresses.
 */
export async function getGalleryItem(
  slug: string,
  opts: { publicOnly?: boolean } = {},
): Promise<GalleryItem | null> {
  const publicOnly = opts.publicOnly ?? true;
  let query = client()
    .from('gallery_items')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved');
  if (publicOnly) query = query.eq('visibility', 'public');
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as GalleryItem | null;
}

/**
 * Fetch one approved scene by exact slug for a SHARED LINK — including
 * private/unlisted scenes. Private rows aren't readable via the normal RLS
 * path (and must not be: a relaxed policy would let anyone enumerate
 * `?visibility=eq.private`), so this routes through the `get_shared_scene`
 * SECURITY DEFINER RPC, which returns a single approved row matched by exact
 * slug. The slug is the capability — guessable by design: "private" means
 * unlisted (absent from the feed/search) but freely shareable by link.
 * Returns the full row incl `gmf_data`. See backend migration
 * 0002_shared_scene_rpc.sql.
 */
export async function getSharedScene(slug: string): Promise<GalleryItem | null> {
  const { data, error } = await client().rpc('get_shared_scene', { p_slug: slug });
  if (error) throw error;
  const rows = (data ?? []) as unknown as GalleryItem[];
  return rows[0] ?? null;
}
