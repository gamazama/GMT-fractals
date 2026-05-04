/**
 * Admin client for the moderate-gallery-item Edge Function. Reads the
 * X-Submit-Token from localStorage (same key as the submission flow)
 * and exposes one function per moderation action.
 */
import { getSubmitToken } from './submitGalleryItem';
import { GalleryItem } from './GalleryClient';

const MODERATE_URL = 'https://ehoacsxzeruhajosexzb.supabase.co/functions/v1/moderate-gallery-item';

/** Pending + approved + rejected — admin view of the full table (minus gmf_data). */
export interface ModerationItem extends GalleryItem {
    status: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
}

async function call<T>(body: unknown): Promise<T> {
    const token = getSubmitToken();
    if (!token) throw new Error('No admin submit token in localStorage');
    const res = await fetch(MODERATE_URL, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'X-Submit-Token': token },
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
    }
    return res.json() as Promise<T>;
}

export async function listAllForModeration(): Promise<ModerationItem[]> {
    const r = await call<{ items: ModerationItem[] }>({ action: 'list' });
    return r.items;
}

export async function approve(slug: string): Promise<ModerationItem> {
    const r = await call<{ item: ModerationItem }>({ action: 'approve', slug });
    return r.item;
}

export async function reject(slug: string): Promise<ModerationItem> {
    const r = await call<{ item: ModerationItem }>({ action: 'reject', slug });
    return r.item;
}

export async function setFeatured(slug: string, value: boolean): Promise<ModerationItem> {
    const r = await call<{ item: ModerationItem }>({ action: 'set-featured', slug, value });
    return r.item;
}

export async function deleteItem(slug: string): Promise<{ slug: string; r2Failures: number }> {
    const r = await call<{ deleted: { slug: string; r2Keys: string[]; r2Failures: number } }>({ action: 'delete', slug });
    return { slug: r.deleted.slug, r2Failures: r.deleted.r2Failures };
}
