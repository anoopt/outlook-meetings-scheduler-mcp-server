import { randomBytes } from 'crypto';
import { logger } from '../logger.js';

/**
 * Simple in-memory data store for UI data
 * This allows us to pass short IDs in URLs instead of large JSON payloads
 */

interface StoredData {
  data: any;
  timestamp: number;
}

// In-memory store with TTL
const dataStore = new Map<string, StoredData>();

// TTL for stored data (30 minutes)
const DATA_TTL_MS = 30 * 60 * 1000;

/**
 * Generate a short unique ID
 */
function generateId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Store data and return a short ID
 */
export function storeData(data: any): string {
  const id = generateId();
  dataStore.set(id, {
    data,
    timestamp: Date.now(),
  });
  logger.info(`Stored data with ID: ${id}, size: ${JSON.stringify(data).length} chars`);
  
  // Clean up expired entries
  cleanupExpired();
  
  return id;
}

/**
 * Retrieve data by ID
 */
export function getData(id: string): any | null {
  const stored = dataStore.get(id);
  if (!stored) {
    logger.info(`Data not found for ID: ${id}`);
    return null;
  }
  
  // Check if expired
  if (Date.now() - stored.timestamp > DATA_TTL_MS) {
    dataStore.delete(id);
    logger.info(`Data expired for ID: ${id}`);
    return null;
  }
  
  logger.info(`Retrieved data for ID: ${id}`);
  return stored.data;
}

/**
 * Clean up expired entries
 */
function cleanupExpired(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, stored] of dataStore.entries()) {
    if (now - stored.timestamp > DATA_TTL_MS) {
      dataStore.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired data entries`);
  }
}
