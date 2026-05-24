/**
 * @engine-gmt/feedback — "Send Feedback" plumbing for the Help menu.
 *
 * Pattern mirrors @engine/help's SupportModalHost: the modal can't live
 * inside the menu popover (popover unmounts on item-click and takes the
 * modal's React state with it), so we hoist visibility to a module
 * singleton and render <FeedbackOverlay /> at the app root.
 *
 * Usage in app boot:
 *
 *   import { feedbackMenuItem, FeedbackOverlay } from '../engine-gmt/feedback';
 *
 *   installHelp({
 *       extraItems: [feedbackMenuItem()],
 *       ...
 *   });
 *
 *   // …in App.tsx render tree:
 *   <FeedbackOverlay />
 */
export { FeedbackOverlay, openFeedback, feedbackMenuItem } from './installFeedback';
export { submitFeedback, FeedbackError } from './FeedbackClient';
export type { FeedbackCategory, FeedbackInput } from './FeedbackClient';
