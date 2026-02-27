/**
 * Common utility helpers for VAM Attendance
 */

/**
 * Format date to readable string
 * @param date - Date object or ISO string
 * @param format - 'short' | 'long' | 'full'
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Record<'short' | 'long' | 'full', Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };

  return d.toLocaleDateString('en-US', options[format]);
}

/**
 * Format time to HH:MM AM/PM
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Calculate attendance percentage
 */
export function calculateAttendancePercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

/**
 * Get attendance status badge color
 */
export function getAttendanceStatusColor(status: 'present' | 'absent' | 'late'): string {
  const colors = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status];
}

/**
 * Format percentage with % symbol
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format large numbers with K, M, B notation
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Sleep for given milliseconds (for async operations)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Get week number from date
 */
export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get day of week name
 */
export function getDayName(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Group array by key function
 */
export function groupBy<T>(array: T[], key: (item: T) => string | number): Record<string | number, T[]> {
  return array.reduce(
    (acc, item) => {
      const k = key(item);
      acc[k] = acc[k] || [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string | number, T[]>
  );
}

/**
 * Flatten nested array
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(array: T[], key?: (item: T) => any): T[] {
  if (!key) {
    return Array.from(new Set(array));
  }
  const seen = new Set();
  return array.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Sort array of objects by key
 */
export function sortByKey<T extends Record<string, any>>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Convert object to query string
 */
export function toQueryString(obj: Record<string, any>): string {
  return Object.keys(obj)
    .filter((key) => obj[key] !== null && obj[key] !== undefined)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

/**
 * Parse query string to object
 */
export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query);
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Get random element from array
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get initials from email
 */
export function getEmailInitials(email: string): string {
  const name = email.split('@')[0] || email;
  return getInitials(name);
}
