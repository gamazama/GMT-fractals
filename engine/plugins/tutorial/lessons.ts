/**
 * Lesson registry — apps register their lessons via `tutor.registerLessons`.
 * The Help plugin's `tutorials` option reads from here to surface menu
 * entries with completion checkmarks.
 */

import type { TutorialLesson } from './types';

const _lessons = new Map<number, TutorialLesson>();
const _subs = new Set<() => void>();

export function registerLesson(lesson: TutorialLesson): void {
    _lessons.set(lesson.id, lesson);
    _subs.forEach((fn) => fn());
}
export function registerLessons(lessons: TutorialLesson[]): void {
    lessons.forEach((l) => _lessons.set(l.id, l));
    _subs.forEach((fn) => fn());
}
export function getLesson(id: number): TutorialLesson | undefined {
    return _lessons.get(id);
}
export function listLessons(): TutorialLesson[] {
    return Array.from(_lessons.values()).sort((a, b) => a.id - b.id);
}
export function subscribeLessons(fn: () => void): () => void {
    _subs.add(fn);
    return () => { _subs.delete(fn); };
}
