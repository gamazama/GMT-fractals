// A question the runner puts to the user while a run is starting
// (`status.ask(...)` in types.ts): a few plain lines, and a button for
// each answer. Shown in place of the form or the progress until one is
// pressed; the shell (index.tsx) settles the runner's promise with the
// button's `id`, or with the question's `cancel` when the dialog is
// closed under it.
//
// Nothing here knows what is asked. The first user (2026-10-11) is a
// runner that found frames of the render it was asked for already in the
// folder: overwrite them, continue from them, or cancel.

import React from 'react';
import Button from '../../../components/Button';
import type { RenderDialogQuestion } from './types';

export const QuestionView: React.FC<{ question: RenderDialogQuestion; onAnswer: (id: string) => void }> = ({ question, onAnswer }) => (
    <div data-render-question className="flex flex-col h-full p-2 gap-2">
        <div className="space-y-1.5 text-[11px] text-fg-secondary leading-snug">
            {question.lines.map((line, i) => <div key={i}>{line}</div>)}
        </div>

        <div className="mt-auto pt-2 flex gap-2">
            {question.options.map((option) => (
                <Button
                    key={option.id}
                    data-render-answer={option.id}
                    onClick={() => onAnswer(option.id)}
                    label={option.label}
                    title={option.title}
                    active={!!option.primary}
                />
            ))}
        </div>
    </div>
);
