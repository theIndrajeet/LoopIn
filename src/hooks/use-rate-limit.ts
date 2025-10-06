import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  attempts: number;
  windowStart: number;
  isBlocked: boolean;
  blockUntil?: number;
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000, blockDurationMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour
  habitCreate: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 habits per minute
  taskCreate: { maxAttempts: 20, windowMs: 60 * 1000 }, // 20 tasks per minute
  notification: { maxAttempts: 5, windowMs: 60 * 1000 }, // 5 notifications per minute
  friendRequest: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 friend requests per hour
  comment: { maxAttempts: 30, windowMs: 60 * 1000 }, // 30 comments per minute
  search: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 searches per minute
  apiCall: { maxAttempts: 1000, windowMs: 60 * 1000 }, // 1000 API calls per minute
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 }, // 3 attempts per hour
  adminBroadcast: { maxAttempts: 5, windowMs: 60 * 60 * 1000 } // 5 broadcasts per hour
};

export const useRateLimit = (action: string, customConfig?: RateLimitConfig) => {
  const config = customConfig || defaultConfigs[action] || defaultConfigs.apiCall;
  const stateRef = useRef<RateLimitState>({
    attempts: 0,
    windowStart: Date.now(),
    isBlocked: false
  });

  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const checkRateLimit = useCallback((): { allowed: boolean; remainingAttempts: number; resetTime: number } => {
    const now = Date.now();
    const state = stateRef.current;

    // Check if currently blocked
    if (state.isBlocked && state.blockUntil && now < state.blockUntil) {
      const remaining = Math.ceil((state.blockUntil - now) / 1000);
      setRemainingTime(remaining);
      setIsBlocked(true);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: state.blockUntil
      };
    }

    // Reset block if expired
    if (state.isBlocked && state.blockUntil && now >= state.blockUntil) {
      state.isBlocked = false;
      state.blockUntil = undefined;
      state.attempts = 0;
      state.windowStart = now;
      setIsBlocked(false);
      setRemainingTime(0);
    }

    // Check if window has expired
    if (now - state.windowStart > config.windowMs) {
      state.attempts = 0;
      state.windowStart = now;
    }

    // Check if limit exceeded
    if (state.attempts >= config.maxAttempts) {
      if (config.blockDurationMs) {
        state.isBlocked = true;
        state.blockUntil = now + config.blockDurationMs;
        setIsBlocked(true);
        setRemainingTime(Math.ceil(config.blockDurationMs / 1000));
      }
      
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: state.windowStart + config.windowMs
      };
    }

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - state.attempts,
      resetTime: state.windowStart + config.windowMs
    };
  }, [config]);

  const recordAttempt = useCallback(() => {
    const state = stateRef.current;
    const now = Date.now();

    // Reset window if expired
    if (now - state.windowStart > config.windowMs) {
      state.attempts = 0;
      state.windowStart = now;
    }

    state.attempts++;
  }, [config.windowMs]);

  const reset = useCallback(() => {
    const state = stateRef.current;
    state.attempts = 0;
    state.windowStart = Date.now();
    state.isBlocked = false;
    state.blockUntil = undefined;
    setIsBlocked(false);
    setRemainingTime(0);
  }, []);

  const attempt = useCallback(async <T>(
    fn: () => Promise<T>
  ): Promise<{ success: true; data: T } | { success: false; error: string; retryAfter?: number }> => {
    const rateCheck = checkRateLimit();
    
    if (!rateCheck.allowed) {
      const retryAfter = isBlocked ? remainingTime : Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
      return {
        success: false,
        error: isBlocked 
          ? `Action blocked. Try again in ${retryAfter} seconds.`
          : `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      };
    }

    recordAttempt();

    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      throw error; // Re-throw the original error
    }
  }, [checkRateLimit, recordAttempt, isBlocked, remainingTime]);

  return {
    attempt,
    checkRateLimit,
    recordAttempt,
    reset,
    isBlocked,
    remainingTime,
    config
  };
};

// Global rate limiting for API calls
class GlobalRateLimit {
  private static instance: GlobalRateLimit;
  private limits: Map<string, RateLimitState> = new Map();

  static getInstance(): GlobalRateLimit {
    if (!GlobalRateLimit.instance) {
      GlobalRateLimit.instance = new GlobalRateLimit();
    }
    return GlobalRateLimit.instance;
  }

  checkGlobalLimit(userId: string, action: string): boolean {
    const key = `${userId}:${action}`;
    const config = defaultConfigs[action] || defaultConfigs.apiCall;
    const now = Date.now();
    
    let state = this.limits.get(key);
    if (!state) {
      state = {
        attempts: 0,
        windowStart: now,
        isBlocked: false
      };
      this.limits.set(key, state);
    }

    // Check if blocked
    if (state.isBlocked && state.blockUntil && now < state.blockUntil) {
      return false;
    }

    // Reset block if expired
    if (state.isBlocked && state.blockUntil && now >= state.blockUntil) {
      state.isBlocked = false;
      state.blockUntil = undefined;
      state.attempts = 0;
      state.windowStart = now;
    }

    // Reset window if expired
    if (now - state.windowStart > config.windowMs) {
      state.attempts = 0;
      state.windowStart = now;
    }

    // Check limit
    if (state.attempts >= config.maxAttempts) {
      if (config.blockDurationMs) {
        state.isBlocked = true;
        state.blockUntil = now + config.blockDurationMs;
      }
      return false;
    }

    state.attempts++;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.limits.entries()) {
      // Remove old entries (older than 1 hour)
      if (now - state.windowStart > 60 * 60 * 1000) {
        this.limits.delete(key);
      }
    }
  }
}

export const globalRateLimit = GlobalRateLimit.getInstance();

// Cleanup old entries every 10 minutes
setInterval(() => {
  globalRateLimit.cleanup();
}, 10 * 60 * 1000);

// Hook for IP-based rate limiting (for server-side use)
export const useIPRateLimit = () => {
  const checkIPLimit = useCallback((ip: string, action: string): boolean => {
    // This would typically be implemented with Redis or a database
    // For now, we'll use the same in-memory approach
    return globalRateLimit.checkGlobalLimit(ip, action);
  }, []);

  return { checkIPLimit };
};
