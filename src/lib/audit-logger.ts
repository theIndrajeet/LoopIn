import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'data' | 'security' | 'admin' | 'system';
}

export class AuditLogger {
  private static instance: AuditLogger;
  private queue: AuditLogEntry[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
      AuditLogger.instance.startBatchProcessor();
    }
    return AuditLogger.instance;
  }

  private startBatchProcessor() {
    setInterval(() => {
      this.flushQueue();
    }, this.flushInterval);
  }

  private async flushQueue() {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(batch.map(entry => ({
          ...entry,
          timestamp: entry.timestamp || new Date().toISOString()
        })));

      if (error) {
        console.error('Failed to write audit logs:', error);
        // Re-queue failed entries
        this.queue.unshift(...batch);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Re-queue failed entries
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private getClientInfo() {
    return {
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent
    };
  }

  private getClientIP(): string {
    // In a real app, this would be set by the server
    // For client-side, we can't reliably get the real IP
    return 'client-side';
  }

  async log(entry: Omit<AuditLogEntry, 'timestamp' | 'ip_address' | 'user_agent'>) {
    try {
      const fullEntry: AuditLogEntry = {
        ...entry,
        ...this.getClientInfo(),
        timestamp: new Date().toISOString()
      };

      // Add to queue for batch processing
      this.queue.push(fullEntry);

      // For critical events, flush immediately
      if (entry.severity === 'critical') {
        await this.flushQueue();
      }
    } catch (error) {
      // Silently fail in production to prevent app crashes
      if (process.env.NODE_ENV === 'development') {
        console.error('Audit logging error:', error);
      }
    }
  }

  // Convenience methods for different types of events
  async logAuth(action: string, userId?: string, details?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'auth',
      details,
      severity: action.includes('failed') ? 'high' : 'medium',
      category: 'auth'
    });
  }

  async logDataChange(action: string, resourceType: string, resourceId: string, userId?: string, details?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      severity: 'low',
      category: 'data'
    });
  }

  async logSecurity(action: string, userId?: string, details?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'security',
      details,
      severity: 'high',
      category: 'security'
    });
  }

  async logAdmin(action: string, userId?: string, details?: Record<string, any>) {
    await this.log({
      user_id: userId,
      action,
      resource_type: 'admin',
      details,
      severity: 'high',
      category: 'admin'
    });
  }

  async logSystem(action: string, details?: Record<string, any>) {
    await this.log({
      action,
      resource_type: 'system',
      details,
      severity: 'medium',
      category: 'system'
    });
  }

  // Force flush queue (useful for app shutdown)
  async forceFlush() {
    await this.flushQueue();
  }
}

// Create singleton instance
export const auditLogger = AuditLogger.getInstance();

// Specific audit functions for common actions
export const auditActions = {
  // Authentication
  loginSuccess: (userId: string) => 
    auditLogger.logAuth('login_success', userId),
  
  loginFailed: (email: string, reason: string) => 
    auditLogger.logAuth('login_failed', undefined, { email, reason }),
  
  logout: (userId: string) => 
    auditLogger.logAuth('logout', userId),
  
  signupSuccess: (userId: string) => 
    auditLogger.logAuth('signup_success', userId),
  
  signupFailed: (email: string, reason: string) => 
    auditLogger.logAuth('signup_failed', undefined, { email, reason }),
  
  passwordReset: (email: string) => 
    auditLogger.logAuth('password_reset_requested', undefined, { email }),

  // Data operations
  habitCreated: (userId: string, habitId: string, habitData: any) =>
    auditLogger.logDataChange('habit_created', 'habit', habitId, userId, habitData),
  
  habitUpdated: (userId: string, habitId: string, changes: any) =>
    auditLogger.logDataChange('habit_updated', 'habit', habitId, userId, changes),
  
  habitDeleted: (userId: string, habitId: string) =>
    auditLogger.logDataChange('habit_deleted', 'habit', habitId, userId),
  
  taskCreated: (userId: string, taskId: string, taskData: any) =>
    auditLogger.logDataChange('task_created', 'task', taskId, userId, taskData),
  
  taskCompleted: (userId: string, taskId: string) =>
    auditLogger.logDataChange('task_completed', 'task', taskId, userId),
  
  profileUpdated: (userId: string, changes: any) =>
    auditLogger.logDataChange('profile_updated', 'profile', userId, userId, changes),

  // Security events
  rateLimitExceeded: (userId: string, action: string) =>
    auditLogger.logSecurity('rate_limit_exceeded', userId, { action }),
  
  suspiciousActivity: (userId: string, activity: string, details: any) =>
    auditLogger.logSecurity('suspicious_activity', userId, { activity, ...details }),
  
  unauthorizedAccess: (userId: string, resource: string) =>
    auditLogger.logSecurity('unauthorized_access', userId, { resource }),
  
  dataExport: (userId: string, dataType: string) =>
    auditLogger.logSecurity('data_export', userId, { dataType }),

  // Admin actions
  adminBroadcast: (userId: string, notificationData: any) =>
    auditLogger.logAdmin('admin_broadcast', userId, notificationData),
  
  userBanned: (adminId: string, targetUserId: string, reason: string) =>
    auditLogger.logAdmin('user_banned', adminId, { targetUserId, reason }),
  
  dataDeleted: (adminId: string, dataType: string, count: number) =>
    auditLogger.logAdmin('data_deleted', adminId, { dataType, count }),

  // System events
  errorOccurred: (error: Error, context?: any) =>
    auditLogger.logSystem('error_occurred', { 
      error: error.message, 
      stack: error.stack?.substring(0, 1000),
      context 
    }),
  
  performanceIssue: (metric: string, value: number, threshold: number) =>
    auditLogger.logSystem('performance_issue', { metric, value, threshold }),
  
  serviceStarted: (service: string) =>
    auditLogger.logSystem('service_started', { service }),
  
  serviceError: (service: string, error: string) =>
    auditLogger.logSystem('service_error', { service, error })
};

// Hook for using audit logger in components
export const useAuditLogger = () => {
  return {
    auditLogger,
    auditActions
  };
};

// Error boundary integration
export const logErrorToAudit = (error: Error, errorInfo: any) => {
  auditActions.errorOccurred(error, {
    componentStack: errorInfo.componentStack?.substring(0, 1000),
    timestamp: new Date().toISOString()
  });
};

// Performance monitoring integration
export const logPerformanceToAudit = (metric: string, value: number, threshold?: number) => {
  if (threshold && value > threshold) {
    auditActions.performanceIssue(metric, value, threshold);
  }
};
