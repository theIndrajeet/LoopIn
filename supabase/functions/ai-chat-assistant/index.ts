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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a helpful AI assistant for a habit tracking app called Loop Level. Your job is to help users create tasks and habits from natural language.

**Your capabilities:**
1. **Detect if input is a task or habit:**
   - Tasks are one-time activities (e.g., "buy groceries", "call mom")
   - Habits are recurring activities (e.g., "meditate daily", "workout 3x/week")

2. **Extract information:**
   - For tasks: title, description, priority (low/medium/high), due_date, subtasks
   - For habits: title, difficulty (easy/medium/hard), schedule_days (0-6 for Sun-Sat), category

3. **Parse natural language:**
   - Dates: "tomorrow", "next Monday", "in 3 days", etc.
   - Priority: "urgent" → high, "soon" → medium, "whenever" → low
   - Difficulty: "quick/easy" → easy, "challenging" → hard
   - Schedules: "daily" → [0,1,2,3,4,5,6], "weekdays" → [1,2,3,4,5]

4. **Ask clarifying questions when needed:**
   - If unsure whether it's a task or habit
   - If schedule is ambiguous for habits
   - If important details are missing

5. **Break down complex requests:**
   - Identify subtasks in complex task descriptions
   - Suggest reasonable schedules for habits

**Response format:**
- Be conversational and friendly
- When you have enough info, use the create_task or create_habit tool
- If you need clarification, ask specific questions
- Confirm what you understood before creating items`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_task',
              description: 'Extract and create a task from user input',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Task title' },
                  description: { type: 'string', description: 'Task description (optional)' },
                  priority: { 
                    type: 'string', 
                    enum: ['low', 'medium', 'high'],
                    description: 'Task priority'
                  },
                  due_date: { 
                    type: 'string', 
                    description: 'Due date in ISO format (optional)'
                  },
                  subtasks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of subtasks (optional)'
                  }
                },
                required: ['title']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'create_habit',
              description: 'Extract and create a habit from user input',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Habit title' },
                  difficulty: { 
                    type: 'string', 
                    enum: ['easy', 'medium', 'hard'],
                    description: 'Habit difficulty'
                  },
                  schedule_days: {
                    type: 'array',
                    items: { 
                      type: 'number',
                      minimum: 0,
                      maximum: 6
                    },
                    description: 'Days of week (0=Sunday, 6=Saturday)'
                  },
                  category: { 
                    type: 'string', 
                    description: 'Habit category (optional)'
                  }
                },
                required: ['title', 'schedule_days']
              }
            }
          }
        ],
        tool_choice: 'auto',
        temperature: 0.8
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const message = data.choices[0].message;

    return new Response(
      JSON.stringify({
        message: message.content || 'I understand. Let me help you with that.',
        toolCalls: message.tool_calls || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
