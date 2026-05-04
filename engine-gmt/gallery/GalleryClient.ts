/**
 * Supabase client for the GMT online gallery.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY at build time. Both are
 * client-safe — Row Level Security on the Supabase side enforces that the
 * anon role can only read approved gallery items.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const galleryEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!galleryEnabled) {
    throw new Error('Gallery: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

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
  /** Only populated when the item is fetched individually via getGalleryItem.
   *  The listGallery query intentionally excludes this column so browse pages
   *  don't drag scene-blob bytes for every tile. */
  gmf_data?: string | null;
}

// Columns pulled by the browse-grid query. Excludes gmf_data to keep tile
// loads light — the click-to-open path re-queries the single row with
// gmf_data via getGalleryItem.
const LIST_COLUMNS =
  'id,slug,title,description,formula,image_url,thumbnail_url,width,height,tags,featured,created_at,author,image_format,sky_url';

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
