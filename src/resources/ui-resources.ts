/**
 * Configuration for the UI server
 * This should point to where the React app is being served
 */

import { storeData } from '../utils/data-store.js';
import { logger } from '../logger.js';

// Default to localhost for development
// In production, this should be set via environment variable
export const UI_SERVER_URL = process.env.UI_SERVER_URL || 'http://localhost:5173';

/**
 * Create a UI resource URL for events
 * Events are expected to already be enriched with attendee photos
 * @param events Array of event objects (already enriched with attendee data)
 * @returns URL string for the events UI
 */
export function createEventsUIUrl(events: any[]): string {
  // Store events data and get a short ID
  const dataId = storeData(events);
  logger.info(`Created events UI URL with data ID: ${dataId}`);
  return `${UI_SERVER_URL}/events?dataId=${dataId}`;
}

/**
 * Simplify person data to reduce payload size (keeps photo if present)
 */
function simplifyPeople(people: any[]): any[] {
  return people.map(person => {
    const simplified = {
      id: person.id,
      displayName: person.displayName,
      mail: person.mail || person.userPrincipalName || person.emailAddresses?.[0]?.address,
      jobTitle: person.jobTitle,
      department: person.department,
      officeLocation: person.officeLocation,
      businessPhones: person.businessPhones?.slice(0, 1),
      photoDataUrl: person.photoDataUrl, // Include photo data URL if present
    };
    logger.info(`Simplified person: ${person.displayName}, hasPhotoDataUrl: ${!!person.photoDataUrl}`);
    return simplified;
  });
}

/**
 * Create a UI resource URL for people
 * @param people Array of person objects (may include photoDataUrl property)
 * @returns URL string for the people UI
 */
export function createPeopleUIUrl(people: any[]): string {
  const simplifiedPeople = simplifyPeople(people);
  // Store people data and get a short ID
  const dataId = storeData(simplifiedPeople);
  logger.info(`Created people UI URL with data ID: ${dataId}`);
  return `${UI_SERVER_URL}/people?dataId=${dataId}`;
}
