/**
 * Date/Time Formulas
 * Based on specs/12-standard-library.md
 */

import { registerFormula } from '../index';

export function registerDatetimeFormulas(): void {
  // dateFromString - Parse date string into Date object
  registerFormula('@toddle/dateFromString', (args, ctx) => {
    const date = args.date as string;
    if (typeof date !== 'string') return null;

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return null;

    return parsed;
  });

  // dateFromTimestamp - Create Date from Unix timestamp (milliseconds)
  registerFormula('@toddle/dateFromTimestamp', (args, ctx) => {
    const timestamp = Number(args.timestamp ?? 0);
    if (isNaN(timestamp)) return null;

    return new Date(timestamp);
  });

  // formatDate - Format date using Intl.DateTimeFormat
  registerFormula('@toddle/formatDate', (args, ctx) => {
    const { date, format, locale } = args;

    // Handle date input
    let dateObj: Date | null = null;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return null;

    const localeStr = typeof locale === 'string' ? locale : undefined;

    // If format string is provided, use it to build options
    if (typeof format === 'string') {
      // Map format patterns to Intl options
      const options: Intl.DateTimeFormatOptions = {};

      // Check for common format patterns
      if (format.includes('YYYY') || format.includes('YY') || format.includes('yyyy') || format.includes('yy')) {
        options.year = format.includes('YYYY') || format.includes('yyyy') ? 'numeric' : '2-digit';
      }
      if (format.includes('MM') || format.includes('M')) {
        options.month = format.includes('MM') ? '2-digit' : 'numeric';
      }
      if (format.includes('DD') || format.includes('dd') || format.includes('D') || format.includes('d')) {
        options.day = format.includes('DD') || format.includes('dd') ? '2-digit' : 'numeric';
      }
      if (format.includes('HH') || format.includes('hh') || format.includes('H') || format.includes('h')) {
        options.hour = format.includes('HH') || format.includes('hh') ? '2-digit' : 'numeric';
      }
      if (format.includes('mm') || format.includes('m')) {
        options.minute = format.includes('mm') ? '2-digit' : 'numeric';
      }
      if (format.includes('ss') || format.includes('s')) {
        options.second = format.includes('ss') ? '2-digit' : 'numeric';
      }

      // Named formats
      if (format === 'full') {
        options.dateStyle = 'full';
      } else if (format === 'long') {
        options.dateStyle = 'long';
      } else if (format === 'medium') {
        options.dateStyle = 'medium';
      } else if (format === 'short') {
        options.dateStyle = 'short';
      }

      try {
        return new Intl.DateTimeFormat(localeStr, options).format(dateObj);
      } catch {
        return dateObj.toLocaleDateString(localeStr);
      }
    }

    // Default format
    try {
      return dateObj.toLocaleDateString(localeStr);
    } catch {
      return dateObj.toISOString();
    }
  });

  // now - Current date/time
  registerFormula('@toddle/now', (args, ctx) => {
    return new Date();
  });

  // timestamp - Date to Unix timestamp (milliseconds)
  registerFormula('@toddle/timestamp', (args, ctx) => {
    const { date } = args;

    // Handle date input
    let dateObj: Date | null = null;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return null;

    return dateObj.getTime();
  });
}
