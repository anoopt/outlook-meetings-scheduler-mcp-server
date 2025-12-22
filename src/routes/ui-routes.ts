import { Request, Response } from 'express';
import { generateUpcomingMeetingsListHTML } from '../utils/html/meetings-list.js';
import { generateUpcomingMeetingsCarouselHTML } from '../utils/html/meetings-carousel.js';
import { getMeetingsViewMode } from '../constants/ui-constants.js';

/**
 * Store for temporarily holding meeting data
 * In a production environment, this would be replaced with a proper cache/database
 */
const meetingsCache = new Map<string, any[]>();

/**
 * Store meetings data and return a unique ID
 */
export function storeMeetingsData(meetings: any[]): string {
  const id = `meetings-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  meetingsCache.set(id, meetings);
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    meetingsCache.delete(id);
  }, 5 * 60 * 1000);
  
  return id;
}

/**
 * Handler for the upcoming meetings page
 * Renders either list or carousel view based on MEETINGS_VIEW_MODE env variable
 */
export function handleUpcomingMeetingsPage(req: Request, res: Response): void {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    res.status(400).send('Missing or invalid meeting data ID');
    return;
  }
  
  const meetings = meetingsCache.get(id);
  
  if (!meetings) {
    res.status(404).send('Meeting data not found or expired');
    return;
  }
  
  // Get view mode from environment
  const viewMode = getMeetingsViewMode();
  
  // Generate HTML based on view mode
  const html = viewMode === 'carousel' 
    ? generateUpcomingMeetingsCarouselHTML(meetings)
    : generateUpcomingMeetingsListHTML(meetings);
    
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * Setup UI routes for the Express app
 */
export function setupUIRoutes(app: any): void {
  // Upcoming meetings page (supports both list and carousel views)
  app.get('/ui/upcoming-meetings', handleUpcomingMeetingsPage);
}
