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
export { openFeedback, closeFeedback, useFeedbackOpen, feedbackMenuItem, registerFeedbackUI, feedbackPanelEntry } from './installFeedback';
// For hosts without a panel router — render it in your own surface while useFeedbackOpen().
export { FeedbackPanel } from './FeedbackPanel';
// A viewport JPEG inside a JSON attachment; modern-screenshot is import()ed on first use.
export { captureViewportJpeg, FEEDBACK_NO_CAPTURE_ATTR } from './feedbackScreenshot';
export type { ScreenshotResult, ScreenshotOptions } from './feedbackScreenshot';
export { submitFeedback, FeedbackError, configureFeedback, getFeedbackAttachments } from './FeedbackClient';
export type { FeedbackCategory, FeedbackInput, FeedbackAttachment, FeedbackConfig, FeedbackFile } from './FeedbackClient';
