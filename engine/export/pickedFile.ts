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
 *   - AN ENCODER ON ANOTHER THREAD (GMT's export worker) gets `handOverPickedFile` instead. The
 *     file's stream cannot cross to a worker; what crosses forwards to it, and the worker ends a
 *     cancelled session by aborting its end (grep `fileWriter` in
 *     engine-gmt/engine/worker/WorkerExporter.ts), which arrives here a moment LATER. The worker has
 *     a writer and no handle, so until 2026-10-12 a discarded GMT video left the empty file the
 *     picker had made. `discard()` there waits for that abort (the file cannot be removed while
 *     its stream is open), aborts the file itself if the worker never lets go, and then takes
 *     the empty file away as `forwardToPickedFile` does.
 *   - THE PICKER MAKES THE FILE, not the first write: a picked name is an empty file on disk from
 *     the moment the picker answers. There is no later moment to make it at; it can only be
 *     removed, and only where the browser has `remove()` (Chromium). Without it an empty file is
 *     left, and `discard()` says so ('empty') for the runner to tell the user.
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
 * @assumption `handOverPickedFile().discard()` removes nothing before the other thread's abort has
 *   arrived, removes an empty file, keeps one that holds bytes, answers 'empty' where the handle
 *   has no `remove()`, and aborts the file itself when the other thread never does - `npm run
 *   test:export-naming` (the "[14] ..." lines, fakes for the handle and the stream), green and not
 *   broken on purpose. In app-gmt, 2026-10-12, the same stand-in file system
 *   (debug/scratch/small-three/gmt-four.mts, git-ignored), an H.264 video interrupted after 12
 *   frames and discarded: no file under the picked name (before: one of 0 bytes); a file of
 *   4,321 bytes picked to be replaced keeps them; a handle with no `remove()` leaves the empty
 *   file and the toast says so.
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

/** What `HandedOverFile.discard` left under the picked name: nothing ('removed'), the bytes a
 *  file picked to be replaced held before ('kept'), or an empty file this browser cannot remove
 *  ('empty'). */
export type DiscardedFile = 'removed' | 'kept' | 'empty';

export interface HandedOverFile {
    /** What the other thread's encoder is handed in place of the file's own stream: every call
     *  goes on to the file, and the file's end (closed, or aborted) is noted here. */
    readonly stream: SaveFileStream;
    /** Nothing of this run stays, as `PickedFile.discard`. Call it AFTER the other thread was told
     *  to cancel: it waits for that thread to let go of the file, for `patienceMs` at most, and
     *  aborts the file itself if it has not. Never rejects. */
    discard(): Promise<DiscardedFile>;
}

/** A picked file for an encoder on another thread (see PITFALLS: AN ENCODER ON ANOTHER THREAD). */
export function handOverPickedFile(handle: SaveFileHandle, file: SaveFileStream, patienceMs = 3000): HandedOverFile {
    let ended = false;
    let letGo: () => void = () => undefined;
    const released = new Promise<void>((resolve) => { letGo = resolve; });
    const end = (): void => { ended = true; letGo(); };
    return {
        stream: {
            write: (chunk) => file.write(chunk),
            close: () => file.close().finally(end),
            abort: () => file.abort().finally(end),
        },
        async discard() {
            await Promise.race([released, new Promise<void>((resolve) => { setTimeout(resolve, patienceMs); })]);
            // The other thread never let go (it crashed, or never took the stream): the file is still ours to drop.
            if (!ended) await file.abort().catch(() => undefined);
            let size: number;
            try { size = (await handle.getFile()).size; } catch { return 'removed'; }   // there is no such file
            if (size > 0) return 'kept';
            if (!handle.remove) return 'empty';
            try { await handle.remove(); return 'removed'; } catch { return 'empty'; }
        },
    };
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
