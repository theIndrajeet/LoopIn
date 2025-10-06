import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  timestamp: number;
  context?: string;
  retryCount?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

interface UseErrorHandlerOptions {
  enableRetry?: boolean;
  enableToast?: boolean;
  enableLogging?: boolean;
  retryConfig?: Partial<RetryConfig>;
  onError?: (error: ErrorInfo) => void;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') return true;
    if (error?.status >= 500 && error?.status < 600) return true;
    return false;
  }
};

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const {
    enableRetry = true,
    enableToast = true,
    enableLogging = true,
    retryConfig = {},
    onError
  } = options;

  const config = { ...defaultRetryConfig, ...retryConfig };
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const logError = useCallback((error: ErrorInfo) => {
    if (enableLogging) {
      console.error(`[ErrorHandler] ${error.context || 'Unknown'}:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        retryCount: error.retryCount
      });
    }
  }, [enableLogging]);

  const showErrorToast = useCallback((error: ErrorInfo) => {
    if (enableToast) {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [enableToast]);

  const handleError = useCallback((
    error: any,
    context?: string,
    retryFn?: () => Promise<any>
  ): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      message: error?.message || 'An unknown error occurred',
      code: error?.code || error?.name,
      status: error?.status || error?.statusCode,
      timestamp: Date.now(),
      context: context || 'Unknown',
      retryCount: 0
    };

    logError(errorInfo);
    showErrorToast(errorInfo);
    
    setErrors(prev => [...prev.slice(-9), errorInfo]); // Keep last 10 errors
    
    if (onError) {
      onError(errorInfo);
    }

    return errorInfo;
  }, [logError, showErrorToast, onError]);

  const retryWithBackoff = useCallback(async <T>(
    fn: () => Promise<T>,
    context: string,
    retryId?: string
  ): Promise<T> => {
    const id = retryId || `${context}-${Date.now()}`;
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Clear any pending retry timeout
        const timeout = retryTimeouts.current.get(id);
        if (timeout) {
          clearTimeout(timeout);
          retryTimeouts.current.delete(id);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < config.maxRetries && config.retryCondition?.(error)) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );
          
          console.log(`[ErrorHandler] Retrying ${context} in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
          
          // Wait before retrying
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, delay);
            retryTimeouts.current.set(id, timeout);
          });
        } else {
          break;
        }
      }
    }

    // All retries failed
    const errorInfo = handleError(lastError, context);
    errorInfo.retryCount = config.maxRetries;
    throw lastError;
  }, [config, handleError]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((timestamp: number) => {
    setErrors(prev => prev.filter(error => error.timestamp !== timestamp));
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  return {
    errors,
    handleError,
    retryWithBackoff,
    clearErrors,
    clearError
  };
};

// Hook for API error handling with automatic retry
export const useAPIErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { handleError, retryWithBackoff } = useErrorHandler(options);

  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    context: string,
    enableRetry: boolean = true
  ): Promise<T> => {
    try {
      if (enableRetry) {
        return await retryWithBackoff(apiFunction, context);
      } else {
        return await apiFunction();
      }
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }, [handleError, retryWithBackoff]);

  return { apiCall };
};

// Hook for Supabase-specific error handling
export const useSupabaseErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { handleError, retryWithBackoff } = useErrorHandler(options);

  const supabaseCall = useCallback(async <T>(
    supabaseQuery: () => Promise<{ data: T; error: any }>,
    context: string,
    enableRetry: boolean = true
  ): Promise<T> => {
    const executeQuery = async () => {
      const { data, error } = await supabaseQuery();
      
      if (error) {
        const supabaseError = new Error(error.message);
        (supabaseError as any).code = error.code;
        (supabaseError as any).status = error.status;
        throw supabaseError;
      }
      
      return data;
    };

    try {
      if (enableRetry) {
        return await retryWithBackoff(executeQuery, context);
      } else {
        return await executeQuery();
      }
    } catch (error) {
      handleError(error, context);
      throw error;
    }
  }, [handleError, retryWithBackoff]);

  return { supabaseCall };
};

// Hook for network error handling
export const useNetworkErrorHandler = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkErrors, setNetworkErrors] = useState<ErrorInfo[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkErrors([]);
      toast({
        title: "Connection restored",
        description: "You're back online!",
        variant: "default"
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection lost",
        description: "You're offline. Some features may not work.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNetworkError = useCallback((error: any, context: string) => {
    const errorInfo: ErrorInfo = {
      message: error?.message || 'Network error occurred',
      code: error?.code || 'NETWORK_ERROR',
      timestamp: Date.now(),
      context,
      retryCount: 0
    };

    setNetworkErrors(prev => [...prev.slice(-4), errorInfo]);
  }, []);

  return {
    isOnline,
    networkErrors,
    handleNetworkError
  };
};

// Hook for error boundary integration
export const useErrorBoundary = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  return {
    error,
    resetError,
    captureError
  };
};
