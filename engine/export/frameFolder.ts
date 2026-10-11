/**
 * engine/export/frameFolder.ts - a folder of frames: one file a frame, written as each is made.
 *
 * PURPOSE
 *   A rendered sequence kept as numbered image files in a folder the user picks is the lossless
 *   master of a video, and it can be RESUMED: a frame that is already there need not be rendered
 *   again. This file is the sink for that - where the frames go - and nothing more. It makes no
 *   frame and knows no renderer.
 *
 * THE SEAM
 *   - `pickFrameFolder(name)` asks the user for the folder (the File System Access API's directory
 *     picker) and resolves a `FrameFolder`, or null when the user backs out. CALL IT INSIDE THE
 *     CLICK that starts the render, before the handler's first `await`: the browser refuses the
 *     picker anywhere else.
 *   - `frameFolder(dir, name)` is the same sink over a directory handle the caller already holds
 *     (a test's fake handle; a handle kept from an earlier run).
 *   - `canPickFrameFolder()` says whether this browser has the picker. Where it has not, the
 *     caller shows `FRAME_FOLDER_UNSUPPORTED` and keeps the option off. There is no fallback here.
 *   - Who uses it: a runner of the generic render dialog that opted in with `frameFolder`
 *     (`engine/plugins/RenderDialog`); the deep zoomer's (`deep-zoom/routeRender.ts`) is the first.
 *
 * NAMES
 *   `<name>_<index>.<ext>`, the index zero-padded to `FRAME_FOLDER_DIGITS` (five), which is what
 *   `ffmpeg -i <name>_%05d.<ext>` reads; an index of six digits is written in full. The name is
 *   made safe first (`safeFrameName`): letters, digits, `-` and `_` only, so that it is a legal
 *   file name everywhere and needs no quoting on a command line.
 *   THE INDEX IS THE CALLER'S. Hand it the timeline frame number, not a count of frames written:
 *   then a frame keeps its file whatever range is rendered the next time.
 *
 * PITFALLS
 *   - `has(index)` means "the file exists and holds something". A write cut off by a closed tab
 *     can leave an EMPTY file (the entry is created first, the bytes are swapped in when the
 *     stream closes), and that frame has to be rendered again: an empty file is not there.
 *   - `has` cannot tell this render's frame from another render's that used the same name.
 *     Whether to resume is the user's decision; the sink only answers what is in the folder.
 *     `read(index)` hands back the file itself, for a caller that wants to look (its size, say).
 *   - A failed write REJECTS and reaches the caller: the folder was deleted, the disk is full,
 *     the permission was taken back. Nothing is swallowed and nothing is retried here.
 *   - The permission lasts as long as the tab. A handle kept past a reload has to ask again.
 *
 * @invariant A frame's file is `<safe name>_<index padded to five>.<ext>`; `has` is false for a
 *   missing file and for an empty one and true for one with bytes, so a resumed run renders
 *   exactly the frames that are not there; `write` puts the bytes under the frame's own name and
 *   a failing write rejects with the handle's own error; `pngSize` is the size in a PNG's own
 *   header; `pickFrameFolder` resolves null when the user backs out and throws the plain line
 *   where there is no picker - proven by: npm run test:frame-folder (the "name: ...", "has: ...",
 *   "write: ...", "png: ...", "pick: ..." lines). Falsified 2026-10-11: see the test's header.
 */

/** How many digits a frame's index is padded to: `%05d` in an ffmpeg pattern. */
export const FRAME_FOLDER_DIGITS = 5;

/** The one line a caller shows where the browser has no directory picker. */
export const FRAME_FOLDER_UNSUPPORTED = 'This browser cannot write into a folder. Chrome and Edge can.';

/** The part of a File System Access directory handle this file uses. (The project's DOM types do
 *  not declare the picker; a real `FileSystemDirectoryHandle` fits this shape.) */
export interface FrameFolderDirectory {
    readonly name: string;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<{
        getFile(): Promise<Blob>;
        createWritable(): Promise<{
            write(data: Blob): Promise<void>;
            close(): Promise<void>;
            abort?(): Promise<void>;
        }>;
    }>;
}

export interface FrameFolder {
    /** The folder's own name, for a line that says where the frames went. */
    readonly folder: string;
    /** The safe base name every file shares. */
    readonly name: string;
    /** The file name of frame `index`. */
    fileName(index: number): string;
    /** The frame is in the folder: its file exists and is not empty. */
    has(index: number): Promise<boolean>;
    /** The frame's file, or null when it is not there (missing, or empty). */
    read(index: number): Promise<Blob | null>;
    /** Write the frame, replacing a file of that name. Rejects when the write fails. */
    write(index: number, data: Blob): Promise<void>;
}

/** A base name that is legal as a file name everywhere and needs no quoting: letters, digits, `-`
 *  and `_`; anything else becomes `_`. An empty result is `frame`. */
export function safeFrameName(name: string): string {
    return name.replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '') || 'frame';
}

/** The sink over a directory handle. `ext` without the dot. */
export function frameFolder(dir: FrameFolderDirectory, name: string, ext = 'png'): FrameFolder {
    const base = safeFrameName(name);
    const fileName = (index: number): string =>
        `${base}_${String(Math.max(0, Math.trunc(index))).padStart(FRAME_FOLDER_DIGITS, '0')}.${ext}`;
    const read = async (index: number): Promise<Blob | null> => {
        try {
            const file = await (await dir.getFileHandle(fileName(index))).getFile();
            return file.size > 0 ? file : null;
        } catch {
            return null;   // not there. A folder that can no longer be read fails at the write, where it is reported.
        }
    };
    return {
        folder: dir.name,
        name: base,
        fileName,
        read,
        has: async (index) => (await read(index)) !== null,
        async write(index, data) {
            const stream = await (await dir.getFileHandle(fileName(index), { create: true })).createWritable();
            try {
                await stream.write(data);
            } catch (err) {
                await stream.abort?.().catch(() => undefined);   // drop the half-written swap file
                throw err;
            }
            await stream.close();
        },
    };
}

/**
 * The width and height a PNG file says it has (its IHDR chunk), or null when the bytes do not
 * begin as a PNG does. For a caller that resumes: a frame already in the folder says what size the
 * rest have to be.
 */
export async function pngSize(png: Blob): Promise<{ width: number; height: number } | null> {
    const head = new DataView(await png.slice(0, 24).arrayBuffer());
    if (head.byteLength < 24 || head.getUint32(0) !== 0x89504e47 || head.getUint32(12) !== 0x49484452) return null;
    return { width: head.getUint32(16), height: head.getUint32(20) };
}

type DirectoryPicker = (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FrameFolderDirectory>;
const directoryPicker = (): DirectoryPicker | null => {
    const pick = typeof window === 'undefined' ? undefined : (window as unknown as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;
    return typeof pick === 'function' ? pick : null;
};

/** This browser can ask for a folder to write into. */
export const canPickFrameFolder = (): boolean => directoryPicker() !== null;

/**
 * Ask the user for the folder. Null: the user backed out. Throws `FRAME_FOLDER_UNSUPPORTED` where
 * there is no picker, and the picker's own error when it fails. Inside the click (see THE SEAM).
 */
export async function pickFrameFolder(name: string, ext = 'png'): Promise<FrameFolder | null> {
    const pick = directoryPicker();
    if (!pick) throw new Error(FRAME_FOLDER_UNSUPPORTED);
    try {
        // `id`: the browser opens the picker where the last frame folder was, which is where a resumed render goes.
        return frameFolder(await pick.call(window, { id: 'frame-folder', mode: 'readwrite' }), name, ext);
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return null;
        throw err;
    }
}
