import DOMPurify from 'dompurify';
import { z } from 'zod';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potential XSS vectors
  const sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
  
  // Additional cleaning
  return sanitized
    .trim()
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

// HTML content sanitization (for rich text)
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
    ALLOWED_ATTR: []
  });
};

// Validation schemas
export const habitSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .refine(val => sanitizeInput(val) === val, 'Invalid characters in title'),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val ? sanitizeInput(val) : undefined),
  
  difficulty: z.enum(['easy', 'medium', 'hard']),
  
  schedule_days: z.array(z.number().min(0).max(6))
    .min(1, 'At least one day must be selected')
    .max(7, 'Cannot select more than 7 days'),
  
  category: z.string()
    .max(50, 'Category must be less than 50 characters')
    .optional()
    .transform(val => val ? sanitizeInput(val) : undefined),
  
  reminder_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    .optional()
});

export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .refine(val => sanitizeInput(val) === val, 'Invalid characters in title'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .transform(val => val ? sanitizeInput(val) : undefined),
  
  priority: z.enum(['low', 'medium', 'high']),
  
  due_date: z.string()
    .datetime()
    .optional(),
  
  subtasks: z.array(z.string().max(200))
    .max(20, 'Cannot have more than 20 subtasks')
    .optional()
    .transform(val => val?.map(sanitizeInput))
});

export const profileSchema = z.object({
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .refine(val => sanitizeInput(val) === val, 'Invalid characters in display name'),
  
  bio: z.string()
    .max(300, 'Bio must be less than 300 characters')
    .optional()
    .transform(val => val ? sanitizeInput(val) : undefined),
  
  avatar_url: z.string()
    .url('Invalid URL')
    .optional()
    .refine(val => !val || val.startsWith('https://'), 'Avatar URL must use HTTPS'),
  
  privacy_level: z.enum(['public', 'friends', 'private'])
});

export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must be less than 500 characters')
    .transform(sanitizeInput),
  
  parent_id: z.string().uuid().optional()
});

export const notificationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .transform(sanitizeInput),
  
  message: z.string()
    .min(1, 'Message is required')
    .max(300, 'Message must be less than 300 characters')
    .transform(sanitizeInput),
  
  action_url: z.string()
    .url('Invalid URL')
    .optional()
    .refine(val => !val || val.startsWith('/') || val.startsWith('https://'), 'Invalid action URL')
});

// Rate limiting validation
export const rateLimitSchema = z.object({
  action: z.string(),
  timestamp: z.number(),
  count: z.number().min(0)
});

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
      'File must be a valid image (JPEG, PNG, WebP, or GIF)'
    ),
  
  purpose: z.enum(['avatar', 'attachment'])
});

// Search query validation
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query must be less than 100 characters')
    .transform(sanitizeInput)
    .refine(val => !/[<>\"']/g.test(val), 'Search query contains invalid characters'),
  
  filters: z.object({
    category: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    date_range: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional()
  }).optional()
});

// Validation helper functions
export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
};

// SQL injection prevention
export const sanitizeForSQL = (input: string): string => {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/xp_/gi, '') // Remove potential stored procedure calls
    .trim();
};

// URL validation and sanitization
export const sanitizeURL = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      ) {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
};

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email address too long')
  .transform(email => email.toLowerCase().trim());

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Export types
export type HabitInput = z.infer<typeof habitSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
