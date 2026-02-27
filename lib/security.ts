/**
 * Security utilities for VAM Attendance
 * Protects against common web vulnerabilities including React2Shell
 */

import { z } from "zod";

/**
 * Input validation schemas for common data types
 */
export const ValidationSchemas = {
  // Email validation
  email: z.string().email("Invalid email format").max(255),

  // Password validation (min 8 chars, complexity required)
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[0-9]/, "Password must contain number"),

  // User names
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),

  // Class names
  className: z
    .string()
    .min(1, "Class name required")
    .max(100, "Class name too long")
    .regex(/^[a-zA-Z0-9\s'-]+$/, "Class name contains invalid characters"),

  // Session description
  description: z.string().max(1000, "Description too long").optional(),

  // Notes
  notes: z.string().max(500, "Notes too long").optional(),

  // UUID
  uuid: z.string().uuid("Invalid UUID format"),

  // Attendance status
  attendanceStatus: z.enum(["present", "absent", "late"]),
};

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .substring(0, 1000); // Limit length
}

/**
 * Validate and sanitize email
 */
export function validateAndSanitizeEmail(email: string): string {
  const sanitized = sanitizeInput(email);
  try {
    return ValidationSchemas.email.parse(sanitized.toLowerCase());
  } catch {
    throw new Error("Invalid email address");
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
  try {
    ValidationSchemas.password.parse(password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize name
 */
export function validateAndSanitizeName(name: string): string {
  const sanitized = sanitizeInput(name);
  try {
    return ValidationSchemas.name.parse(sanitized);
  } catch {
    throw new Error("Invalid name format");
  }
}

/**
 * Validate UUID
 */
export function validateUUID(id: string): boolean {
  try {
    ValidationSchemas.uuid.parse(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate attendance status
 */
export function validateAttendanceStatus(
  status: string
): status is "present" | "absent" | "late" {
  try {
    ValidationSchemas.attendanceStatus.parse(status);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prevent SQL injection by validating query parameters
 */
export function validateQueryParam(param: string, maxLength: number = 255): string {
  const sanitized = sanitizeInput(param);
  if (sanitized.length > maxLength) {
    throw new Error(`Parameter exceeds maximum length of ${maxLength}`);
  }
  return sanitized;
}

/**
 * Prevent command injection by blocking shell metacharacters
 */
export function preventCommandInjection(input: string): boolean {
  const dangerousChars = /[;&|`$(){}[\]<>\\^~]/g;
  return !dangerousChars.test(input);
}

/**
 * Validate file uploads
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[] = ["text/csv", "application/json"],
  maxSize: number = 5 * 1024 * 1024 // 5MB default
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Rate limiting helper for API routes
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requestTimes = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = requestTimes.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Content Security Policy headers
 */
export const cspHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://*.supabase.co; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'",
};

/**
 * Security headers middleware
 */
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  ...cspHeaders,
};

export default {
  ValidationSchemas,
  sanitizeInput,
  validateAndSanitizeEmail,
  validatePassword,
  validateAndSanitizeName,
  validateUUID,
  validateAttendanceStatus,
  validateQueryParam,
  preventCommandInjection,
  validateFileUpload,
  RateLimiter,
  securityHeaders,
};
