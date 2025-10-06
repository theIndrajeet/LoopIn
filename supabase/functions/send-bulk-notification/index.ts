import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notification } = await req.json();

    if (!notification?.title || !notification?.body) {
      throw new Error('Notification title and body are required');
    }

    console.log('📢 Admin broadcast request:', {
      title: notification.title,
      body: notification.body.substring(0, 50) + '...'
    });

    // Get all active push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    console.log(`📊 Found ${subscriptions?.length || 0} push subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          total: 0, 
          sent: 0, 
          message: 'No active subscriptions found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:heyjeetttt@gmail.com';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    // Import web-push library
    const webpush = await import('https://esm.sh/web-push@3.6.6');
    
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    let sentCount = 0;
    const errors = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notification)
        );

        sentCount++;
        console.log(`✅ Sent to user ${sub.user_id}`);
      } catch (error: any) {
        console.error(`❌ Failed to send to ${sub.user_id}:`, error.message);
        errors.push({ 
          user_id: sub.user_id, 
          error: error.message,
          status: error.statusCode 
        });
        
        // If subscription is invalid (410 Gone or 404 Not Found), remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️ Removing invalid subscription for user ${sub.user_id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    }

    console.log(`📊 Broadcast complete: ${sentCount}/${subscriptions.length} sent successfully`);

    // Store broadcast log for admin
    await supabase.from('admin_logs').insert({
      action: 'broadcast_notification',
      details: {
        title: notification.title,
        body: notification.body,
        total_subscriptions: subscriptions.length,
        successful_sends: sentCount,
        failed_sends: errors.length
      },
      created_at: new Date().toISOString()
    }).catch(err => {
      console.log('Note: Could not log to admin_logs table (table may not exist):', err.message);
    });

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions.length,
        sent: sentCount,
        failed: errors.length,
        errors: errors.slice(0, 5), // Return first 5 errors only
        message: `Successfully sent to ${sentCount} out of ${subscriptions.length} users`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-bulk-notification:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Check server logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
