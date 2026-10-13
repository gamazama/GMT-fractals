// What the dialog shows when a run has ended, for a runner that says so
// (`status.setResult(...)` in types.ts): a few plain lines and, when the
// runner hands one, a command line with a Copy button - an ffmpeg call
// for a folder of frames. "Back" returns to the form.
//
// Shown only between the end of a run and the next Start; a runner that
// never calls `setResult` never sees it. The command is selectable text
// as well: `navigator.clipboard` is refused in an insecure context and
// in a document without focus, and then the button says so.

import React, { useState } from 'react';
import Button from '../../../components/Button';
import { CopyIcon } from '../../../components/Icons';
import type { RenderDialogResult } from './types';

export const ResultView: React.FC<{ result: RenderDialogResult; onBack: () => void }> = ({ result, onBack }) => {
    const [copied, setCopied] = useState<'no' | 'yes' | 'refused'>('no');
    const copy = (): void => {
        const write = navigator.clipboard?.writeText(result.command ?? '');
        if (!write) { setCopied('refused'); return; }
        write.then(() => setCopied('yes'), () => setCopied('refused'));
    };

    return (
        <div data-render-result className="flex flex-col h-full p-2 gap-2">
            <div className="space-y-1 text-[11px] text-fg-secondary leading-snug">
                {result.lines.map((line, i) => <div key={i}>{line}</div>)}
            </div>

            {result.command && (
                <>
                    <code
                        data-render-command
                        className="block p-1.5 bg-surface-sunken rounded border border-line/10 text-[10px] font-mono text-fg-tertiary break-all select-text"
                    >
                        {result.command}
                    </code>
                    <div className="flex">
                        <Button
                            onClick={copy}
                            label={copied === 'yes' ? 'Copied' : copied === 'refused' ? 'Could not copy: select the line instead' : 'Copy'}
                            icon={<CopyIcon />}
                        />
                    </div>
                </>
            )}

            <div className="mt-auto pt-2 flex">
                <Button onClick={onBack} label="Back" />
            </div>
        </div>
    );
};
