
import { HelpSection } from '../../types/help';
import { GETTING_STARTED_TOPICS } from './topics/getting_started';
import { GENERAL_TOPICS } from './topics/general';
import { FORMULA_TOPICS } from './topics/formulas';
import { FORMULA_LIBRARY } from './topics/formula_library';
import { PARAM_TOPICS } from './topics/parameters';
import { UI_TOPICS } from './topics/ui';
import { TIMELINE_TOPICS } from './topics/timeline';
import { LIGHTING_TOPICS } from './topics/lighting';
import { RENDERING_TOPICS } from './topics/rendering';
import { COLORING_TOPICS } from './topics/coloring';
import { GRAPH_TOPICS } from './topics/graph';
import { SCENE_TOPICS } from './topics/scene';
import { EFFECTS_TOPICS } from './topics/effects';
import { AUDIO_TOPICS } from './topics/audio';

/**
 * Aggregated help topics.
 *
 * Do NOT import this module from main-bundle code. It pulls in ~3400 lines of
 * markdown-in-TS (~100KB+ minified). Use `loadHelpTopics()` / `useHelpTopics()`
 * from `./registry` instead — those dynamic-import this file as a separate
 * chunk so main-bundle boot stays lean.
 */
export const HELP_TOPICS: Record<string, HelpSection> = {
    ...GETTING_STARTED_TOPICS,
    ...GENERAL_TOPICS,
    ...FORMULA_TOPICS,
    ...FORMULA_LIBRARY,
    ...PARAM_TOPICS,
    ...UI_TOPICS,
    ...TIMELINE_TOPICS,
    ...LIGHTING_TOPICS,
    ...RENDERING_TOPICS,
    ...COLORING_TOPICS,
    ...GRAPH_TOPICS,
    ...SCENE_TOPICS,
    ...EFFECTS_TOPICS,
    ...AUDIO_TOPICS
};
