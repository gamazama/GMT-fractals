/**
 * Supabase client for the GMT online gallery.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time. Both are
 * client-safe — Row Level Security on the Supabase side enforces that the
 * anon role can only read approved gallery items.
 */
import { getSupabase, supabaseEnabled } from '../supabase';

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
  /** Only populated when the item is fetched individually via getGalleryItem.
   *  The listGallery query intentionally excludes this column so browse pages
   *  don't drag scene-blob bytes for every tile. */
  gmf_data?: string | null;
}

// Columns pulled by the browse-grid query. Excludes gmf_data to keep tile
// loads light — the click-to-open path re-queries the single row with
// gmf_data via getGalleryItem.
const LIST_COLUMNS =
  'id,slug,title,description,formula,image_url,thumbnail_url,width,height,tags,featured,created_at,author,image_format,sky_url,user_id,visibility';

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
