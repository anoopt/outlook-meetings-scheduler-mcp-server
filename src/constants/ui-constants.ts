/**
 * UI-related constants for mcp-ui integration
 */

/**
 * Default number of upcoming meetings to show in the carousel
 */
export const DEFAULT_UPCOMING_MEETINGS_COUNT = 5;

/**
 * Fluent UI CDN URL for React components
 * Using Fluent UI v9 (Web Components)
 */
export const FLUENT_UI_CDN_URL = 'https://unpkg.com/@fluentui/web-components';

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
