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
    const { existingHabits = [], userPrompt = "", usePreferences = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let userContext = "";
    
    // Fetch user preferences if requested
    if (usePreferences && authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (prefs) {
            const currentHour = new Date().getHours();
            const daypart = currentHour < 12 ? 'morning' : 
                           currentHour < 17 ? 'afternoon' : 
                           currentHour < 21 ? 'evening' : 'late';

            userContext = `
User context:
- Goals: ${prefs.primary_goals?.join(', ') || 'general improvement'}
- Schedule: ${prefs.schedule_type || 'flexible'}
- Energy level: ${prefs.energy_level || 'medium'}
- Time of day: ${daypart}
- Struggles: ${prefs.main_struggles?.join(', ') || 'none specified'}

Adjust suggestions based on:
- If energy_level is 'low', prioritize easy/medium habits
- For ${daypart} time, suggest ${daypart}-appropriate activities
- Align with user's stated goals: ${prefs.primary_goals?.join(', ')}
`;
          }
        }
      } catch (e) {
        console.error('Error fetching preferences:', e);
        // Continue without preferences
      }
    }

    const systemPrompt = `You are a habit formation coach. Generate 5 actionable daily habit suggestions.
${userContext}

Rules:
- Each habit must be specific and measurable
- Include time duration if applicable (e.g., "15 min", "10 min")
- Mix difficulty levels (easy, medium, hard) appropriately
- Avoid duplicates with existing habits: ${existingHabits.join(', ')}
- Make suggestions practical for daily completion
- Include appropriate emoji that matches the habit
- Assign a category (morning, fitness, wellness, learning, productivity)
- Max 2 habits from the same category for diversity`;

    const userMessage = userPrompt 
      ? `Generate 5 habit suggestions based on: ${userPrompt}`
      : "Generate 5 diverse habit suggestions covering different aspects of daily life";

    console.log('Calling AI with user context:', userContext ? 'WITH preferences' : 'WITHOUT preferences');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_habits",
            description: "Return 5 habit suggestions with emojis",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                      emoji: { type: "string" },
                      category: { type: "string" }
                    },
                    required: ["title", "difficulty", "emoji"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_habits" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI quota reached. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in suggest-habits:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
