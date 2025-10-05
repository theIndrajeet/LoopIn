import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { isToday as isTodayDateFns, isSameDay, startOfDay } from 'date-fns';

/**
 * Detects the user's timezone from browser settings
 */
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Detects the user's locale from browser settings
 */
export const detectLocale = (): string => {
  return navigator.language || 'en-US';
};

/**
 * Converts a UTC date to the user's timezone
 */
export const convertToUserTimezone = (date: Date | string, timezone: string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, timezone);
};

/**
 * Checks if a date is today in the user's timezone
 */
export const isToday = (date: Date | string, timezone: string): boolean => {
  const userDate = convertToUserTimezone(date, timezone);
  const userNow = convertToUserTimezone(new Date(), timezone);
  return isTodayDateFns(userDate) && isSameDay(userDate, userNow);
};

/**
 * Gets the start of today in the user's timezone as an ISO string
 */
export const getStartOfTodayInTimezone = (timezone: string): string => {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const startOfDayZoned = startOfDay(zonedNow);
  return fromZonedTime(startOfDayZoned, timezone).toISOString();
};

/**
 * Common timezone options organized by region
 */
export const TIMEZONE_OPTIONS = [
  // Asia
  { label: 'India - Kolkata (IST, UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'India - Mumbai (IST, UTC+5:30)', value: 'Asia/Kolkata' }, // Same as Kolkata
  { label: 'Singapore (UTC+8)', value: 'Asia/Singapore' },
  { label: 'Hong Kong (UTC+8)', value: 'Asia/Hong_Kong' },
  { label: 'Bangkok (UTC+7)', value: 'Asia/Bangkok' },
  { label: 'Dubai (UTC+4)', value: 'Asia/Dubai' },
  { label: 'Tokyo (UTC+9)', value: 'Asia/Tokyo' },
  { label: 'Seoul (UTC+9)', value: 'Asia/Seoul' },
  
  // Europe
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
  { label: 'Moscow (UTC+3)', value: 'Europe/Moscow' },
  
  // Americas
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'Denver (MST/MDT)', value: 'America/Denver' },
  { label: 'Toronto (EST/EDT)', value: 'America/Toronto' },
  { label: 'Mexico City (CST/CDT)', value: 'America/Mexico_City' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
  
  // Pacific
  { label: 'Auckland (NZST/NZDT)', value: 'Pacific/Auckland' },
  { label: 'Sydney (AEDT/AEST)', value: 'Australia/Sydney' },
  
  // Default
  { label: 'UTC', value: 'UTC' },
];
