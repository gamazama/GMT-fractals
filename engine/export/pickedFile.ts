/**
 * engine/export/pickedFile.ts - a file the user picked (`showSaveFilePicker`), as a video
 * encoder may be handed it: a stream that FORWARDS to the file, and a way to throw the file away.
 *
 * PURPOSE
 *   `MainThreadEncoder.start` (engine/export/videoEncoder.ts) locks the stream it is handed -
 *   mediabunny takes its writer - and `cancel()` does not let go. A runner that hands over the
 *   file's own stream can, after a cancel, neither close nor abort it: the half-written file stays
 *   open for as long as the page does (fluid-toy's Discard did exactly that until 2026-10-11: its
 *   `stream.close()` threw on the lock and the throw was swallowed). So the encoder gets a stream
 *   of the runner's own that passes every write on, and the runner keeps the file.
 *   Two runners need it - the deep zoomer's (deep-zoom/routeRender.tsx, where it was written
 *   first) and fluid-toy's (fluid-toy/components/RenderDialog/exportRunner.ts) - and this is the
 *   one copy.
 *
 * THE SEAM
 *   const picked = forwardToPickedFile(handle, await handle.createWritable());
 *   await encoder.start({ ..., mp4FastStart: false }, picked.stream);
 *   ...
 *   await encoder.finish();                         // the last bytes, the index, the file CLOSED
 *   // or, to keep nothing:
 *   encoder.cancel(); await picked.discard();       // the file ABORTED, and removed if it is empty
 *
 * PITFALLS
 *   - A WRITE CARRIES ITS POSITION. mediabunny hands `{ type: 'write', position, data }` and, for
 *     an MP4 written as it goes, comes back to the front of the file at the end (the size of the
 *     media data). The forward passes the chunk on as it is: the file's stream must take a write at
 *     a position, which a File System Access stream does.
 *   - `discard()` IS NOT `close()`. An aborted File System Access stream drops its swap file: a
 *     NEW file is left empty (and removed, where the browser can: `remove()` is Chromium's own), a
 *     file that was picked to be REPLACED keeps what it held before.
 *   - AFTER `discard()` NO WRITE REACHES THE FILE: the encoder's muxer may still be working
 *     through frames it had been handed, and their bytes are dropped here.
 *   - GMT'S EXPORT WORKER does the same thing in its own way and does not use this file: its
 *     stream has crossed to a worker, where there is a writer but no handle (grep `fileWriter` in
 *     engine-gmt/engine/worker/WorkerExporter.ts).
 *
 * @assumption Measured in the two apps that use it, Chrome on the real GPU, 2026-10-11, the
 *   picker stood in for by a real File System Access file in the origin's private file system
 *   (debug/scratch/gmt-export/, git-ignored: gmt-video.mts with APP=fluid-toy.html for fluid-toy,
 *   step 4; dz-video-render.mts - a copy of debug/scratch/r6b/video-render.mts - steps 3, 5 and 6
 *   for the deep zoomer, run again after the move here and green as before it). Discard: a new
 *   file aborted and removed; where the handle has no `remove()` an empty file is left; a file
 *   picked to be replaced keeps its bytes. BROKEN ON PURPOSE once in fluid-toy's runner (the
 *   cancel path closing the stream instead of calling `discard()`): "aborted false, closed false".
 *   NO STANDING GUARD: no smoke starts a render into a picked file.
 */

/** The part of a File System Access file stream a video uses. (The project's DOM types do not
 *  declare the API; the real stream fits this shape.) */
export interface SaveFileStream {
    write(chunk: unknown): Promise<void>;
    close(): Promise<void>;
    abort(): Promise<void>;
}

/** The part of a File System Access file handle a video uses. */
export interface SaveFileHandle {
    readonly name: string;
    getFile(): Promise<Blob>;
    createWritable(): Promise<SaveFileStream>;
    /** Chromium's own (not in the standard): the file deleted. */
    remove?(): Promise<void>;
}

export type SaveFilePicker = (options: {
    id?: string;
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<SaveFileHandle>;

export interface PickedFile {
    /** What the encoder is handed, in place of the file's own stream. Closing it closes the file. */
    readonly stream: WritableStream<unknown>;
    /** Nothing of this run stays: the half-written file is dropped (what was in a file picked to
     *  be replaced stays as it was), and the empty file the picker made is taken away where the
     *  browser can. Cancel the encoder first. Never rejects. */
    discard(): Promise<void>;
}

export function forwardToPickedFile(handle: SaveFileHandle, file: SaveFileStream): PickedFile {
    let dropped = false;
    return {
        stream: new WritableStream<unknown>({
            write: (chunk) => (dropped ? undefined : file.write(chunk)),
            close: () => file.close(),
        }),
        async discard() {
            dropped = true;
            try {
                await file.abort();
                if ((await handle.getFile()).size === 0) await handle.remove?.();
            } catch { /* closed already, or the file is gone: there is nothing left to take away */ }
        },
    };
}
