/**
 * UI-related constants for mcp-ui integration
 */

/**
 * Default number of upcoming meetings to show
 */
export const DEFAULT_UPCOMING_MEETINGS_COUNT = 5;

/**
 * Meeting view modes
 */
export type MeetingViewMode = 'list' | 'carousel';

/**
 * Default view mode for upcoming meetings
 * Can be overridden by MEETINGS_VIEW_MODE environment variable
 */
export const DEFAULT_MEETINGS_VIEW_MODE: MeetingViewMode = 'list';

/**
 * Get the configured meetings view mode from environment
 */
export function getMeetingsViewMode(): MeetingViewMode {
  const envMode = process.env.MEETINGS_VIEW_MODE?.toLowerCase();
  if (envMode === 'carousel' || envMode === 'list') {
    return envMode;
  }
  return DEFAULT_MEETINGS_VIEW_MODE;
}

/**
 * UI resource URIs
 */
export const UI_RESOURCE_URIS = {
  UPCOMING_MEETINGS: 'ui://outlook-meetings/upcoming-meetings',
} as const;

/**
 * Preferred frame sizes for different UI components
 */
export const PREFERRED_FRAME_SIZES = {
  UPCOMING_MEETINGS: ['800px', '600px'] as [string, string],
} as const;
