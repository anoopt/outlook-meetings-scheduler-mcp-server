/**
 * Configuration for the UI server
 * This should point to where the React app is being served
 */

// Default to localhost for development
// In production, this should be set via environment variable
export const UI_SERVER_URL = process.env.UI_SERVER_URL || 'http://localhost:5173';

/**
 * Create a UI resource URL for events
 * @param events Array of event objects
 * @returns URL string for the events UI
 */
export function createEventsUIUrl(events: any[]): string {
  const eventsParam = encodeURIComponent(JSON.stringify(events));
  return `${UI_SERVER_URL}/events?events=${eventsParam}`;
}

/**
 * Create a UI resource URL for people
 * @param people Array of person objects
 * @returns URL string for the people UI
 */
export function createPeopleUIUrl(people: any[]): string {
  const peopleParam = encodeURIComponent(JSON.stringify(people));
  return `${UI_SERVER_URL}/people?people=${peopleParam}`;
}
