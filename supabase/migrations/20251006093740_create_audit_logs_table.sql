-- Create audit logs table for security and compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    category TEXT CHECK (category IN ('auth', 'data', 'security', 'admin', 'system')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON public.audit_logs(ip_address);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_severity ON public.audit_logs(category, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_timestamp ON public.audit_logs(resource_type, resource_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can view all audit logs
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.email = 'heyjeetttt@gmail.com'
        )
    );

-- Users can view their own audit logs (limited fields)
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        auth.uid() = user_id 
        AND category IN ('auth', 'data')
        AND severity IN ('low', 'medium')
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Function to clean up old audit logs (keep for 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.audit_logs 
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$;

-- Function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    category TEXT,
    severity TEXT,
    count BIGINT,
    unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.category,
        al.severity,
        COUNT(*) as count,
        COUNT(DISTINCT al.user_id) as unique_users
    FROM public.audit_logs al
    WHERE al.timestamp BETWEEN start_date AND end_date
    GROUP BY al.category, al.severity
    ORDER BY count DESC;
END;
$$;

-- Function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    user_id_param UUID,
    time_window INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS TABLE (
    pattern TEXT,
    count BIGINT,
    severity_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    failed_logins BIGINT;
    rapid_actions BIGINT;
    unusual_ips BIGINT;
BEGIN
    -- Check for multiple failed logins
    SELECT COUNT(*) INTO failed_logins
    FROM public.audit_logs
    WHERE user_id = user_id_param
        AND action = 'login_failed'
        AND timestamp > NOW() - time_window;

    IF failed_logins >= 5 THEN
        RETURN QUERY SELECT 'multiple_failed_logins'::TEXT, failed_logins, 'high'::TEXT;
    END IF;

    -- Check for rapid successive actions
    SELECT COUNT(*) INTO rapid_actions
    FROM public.audit_logs
    WHERE user_id = user_id_param
        AND category = 'data'
        AND timestamp > NOW() - INTERVAL '5 minutes';

    IF rapid_actions >= 50 THEN
        RETURN QUERY SELECT 'rapid_actions'::TEXT, rapid_actions, 'medium'::TEXT;
    END IF;

    -- Check for multiple IP addresses
    SELECT COUNT(DISTINCT ip_address) INTO unusual_ips
    FROM public.audit_logs
    WHERE user_id = user_id_param
        AND timestamp > NOW() - time_window
        AND ip_address IS NOT NULL;

    IF unusual_ips >= 5 THEN
        RETURN QUERY SELECT 'multiple_ips'::TEXT, unusual_ips, 'medium'::TEXT;
    END IF;

    RETURN;
END;
$$;

-- Create a view for security dashboard
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    category,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM public.audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), category, severity
ORDER BY hour DESC;

-- Grant necessary permissions
GRANT SELECT ON security_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_stats TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity TO authenticated;

-- Schedule cleanup job (this would typically be done with pg_cron in production)
-- For now, we'll just create the function and it can be called manually or via a scheduled job

COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit log for security and compliance tracking';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than 1 year to manage storage';
COMMENT ON FUNCTION get_audit_stats IS 'Returns audit log statistics for a given time period';
COMMENT ON FUNCTION detect_suspicious_activity IS 'Analyzes user activity patterns to detect potential security issues';
COMMENT ON VIEW security_dashboard IS 'Real-time security monitoring dashboard view';
