import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviterName } = await req.json();

    if (!email || !inviterName) {
      throw new Error('Email and inviter name are required');
    }

    console.log('📧 Sending friend invite:', { email, inviterName });

    // For now, just return success since we don't have email service configured
    // In a real app, you would integrate with SendGrid, Resend, or similar
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully (demo mode)',
        email,
        inviterName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-friend-invite:', error);
    
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
