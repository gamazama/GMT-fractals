/**
 * @engine-gmt/feedback — "Send Feedback" plumbing for the Help menu.
 *
 * Feedback is a dockable panel ('Feedback' in the panel manifest). The Help
 * menu item calls openFeedback() to toggle it open; no app-root overlay needed.
 *
 * Usage in app boot:
 *
 *   import { feedbackMenuItem } from '../engine-gmt/feedback';
 *
 *   installHelp({
 *       extraItems: [feedbackMenuItem()],
 *       ...
 *   });
 */
export { openFeedback, closeFeedback, feedbackMenuItem } from './installFeedback';
export { submitFeedback, FeedbackError } from './FeedbackClient';
export type { FeedbackCategory, FeedbackInput } from './FeedbackClient';
