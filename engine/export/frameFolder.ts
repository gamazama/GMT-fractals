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
 *   - `lookForFrames(folder, indices)` says which of a render's frames are in the folder already
 *     and of what size (or sizes): what a runner needs to ASK, before it renders, whether to
 *     replace them, to go on from them, or to leave. The asking is the runner's
 *     (`status.ask` of the render dialog); this file only looks.
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
 *   - `has` cannot tell this render's frame from another render's that used the same name, nor
 *     a frame of the render before from one a cancelled OVERWRITE has already replaced: the same
 *     name, and (at the same size) nothing in the file to tell them apart. Whether to go on from
 *     what is there is the user's decision; the sink only answers what is in the folder.
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
 * @invariant `lookForFrames` counts exactly the frames asked for that are there (not a missing
 *   one, not an empty file, not a frame outside the set asked, not another name's file) and lists
 *   each size they say once - proven by: npm run test:frame-folder ("look: it counts the frames
 *   there - not an empty file, not a frame outside the range, not another name's", "look: frames of
 *   one size say that size, once", "look: frames of two sizes say both, each once, in the order
 *   met"). Falsified 2026-10-11, two breaks: the count taken before the "not there" test -> the
 *   first of those red, with "look: an empty folder ..." and "look: a frame that is not a PNG
 *   ..."; a size pushed every time it is met -> the other two red, and the PNG line again.
 * @assumption The rest of `lookForFrames` - the answers in the order asked, a stop that ends it
 *   early, that it makes no file - is the same test's other four "look: ..." lines, which pass
 *   and were not broken on purpose.
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

/** What of a set of frames is in the folder (`lookForFrames`). */
export interface FramesFound {
    /** One answer a frame, in the order asked: the frame is there, as `has` says it. Shorter than
     *  what was asked only when the look was stopped. */
    there: boolean[];
    /** How many of them are there. */
    count: number;
    /** The sizes the frames there say they have (`pngSize`), each size once, in the order met. A
     *  frame that is not a PNG says none, so this can be empty with frames there. */
    sizes: Array<{ width: number; height: number }>;
}

/**
 * Which of the frames `indices` are in the folder, and of what size: what a caller has to know
 * before it renders, to ask whether to go on from the frames there or to replace them. It asks for
 * exactly those frames under the sink's own name - a frame outside `indices`, or another name's
 * file, is not looked at - and it makes no file. `stop`, asked before each frame, ends the look
 * early with the answers so far. One read a frame, one after another.
 */
export async function lookForFrames(folder: FrameFolder, indices: number[], stop?: () => boolean): Promise<FramesFound> {
    const found: FramesFound = { there: [], count: 0, sizes: [] };
    for (const index of indices) {
        if (stop?.()) break;
        const file = await folder.read(index);
        found.there.push(file !== null);
        if (!file) continue;
        found.count++;
        const size = await pngSize(file);
        if (size && !found.sizes.some((s) => s.width === size.width && s.height === size.height)) found.sizes.push(size);
    }
    return found;
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
