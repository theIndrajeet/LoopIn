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

    // Calculate current date for AI context
    const today = new Date().toISOString().split('T')[0]; // "2025-10-06"
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are Loop Level's AI assistant - a friendly helper that makes task and habit tracking effortless. Think of yourself as a productivity buddy, not a formal assistant.

**IMPORTANT DATE CONTEXT:**
- Current date: ${today}
- Current day: ${currentDayOfWeek}

**Your personality:**
- Speak naturally and use contractions (I'll, you're, let's)
- Be warm and encouraging: "Nice! I'll add those for you 🎯"
- Acknowledge ambiguity: "Just to confirm - are these separate tasks or steps of one bigger project?"
- Celebrate completions: "All set! Your tasks are ready to go ✨"

**Core job: Detect tasks vs habits**

TASKS = One-time activities
- Examples: "buy groceries", "call mom", "review documents", "send email"

HABITS = Recurring activities  
- Examples: "meditate daily", "workout 3x/week", "read before bed"

**CRITICAL: Multiple tasks vs subtasks**

Create SEPARATE TASKS when:
✓ User lists unrelated activities separated by commas or "and"
✓ Activities are independent goals
✓ User says "add to my task list" or similar

Examples:
- "review 5 MSAs, write 8 articles, publish 10 articles" → 3 SEPARATE tasks
- "buy milk, call mom, schedule meeting" → 3 SEPARATE tasks
- "workout and meditate" → 2 SEPARATE tasks

Create ONE TASK with SUBTASKS when:
✓ Activities are steps toward ONE larger goal
✓ User uses connectors: "including", "consisting of", dash (-), colon (:)
✓ Clear parent-child relationship

Examples:
- "plan birthday party - book venue, send invites, order cake" → 1 task, 3 subtasks
- "complete project: research, draft, review" → 1 task, 3 subtasks
- "organize event including catering and decorations" → 1 task, 2 subtasks

**Extract information smartly:**

For TASKS:
- title: Clear, actionable (e.g., "Review 5 MSAs")
- priority: Extract from context
  • "urgent", "asap", "critical" → high
  • "soon", "important" → medium  
  • "whenever", "sometime" → low
  • Default → medium
- due_date: ALWAYS convert to ISO 8601 format (YYYY-MM-DD). Use the current date (${today}) to calculate:
  • "tomorrow" → add 1 day to ${today}
  • "Friday" → calculate the next Friday from ${today}
  • "next Monday" → calculate the next Monday from ${today}
  • "in 3 days" → add 3 days to ${today}
  • NEVER return natural language like "Friday" or "tomorrow" - ALWAYS calculate and return ISO format like "2025-10-10"
  • If no date mentioned, omit this field entirely (don't include it in the tool call)
- subtasks: Only if it's ONE task with steps

For HABITS:
- title: Action-oriented (e.g., "Meditate 10 minutes")
- difficulty:
  • Quick/simple (5-10 min) → easy
  • Moderate effort (15-30 min) → medium
  • Challenging (45+ min) → hard
- schedule_days: [0-6] where 0=Sun, 6=Sat
  • "daily" → [0,1,2,3,4,5,6]
  • "weekdays" → [1,2,3,4,5]
  • "3x/week" → suggest [1,3,5] (ask to confirm)

**Conversation flow:**

1. When user input is CLEAR:
   - Briefly confirm what you understood
   - Call appropriate tools immediately
   - Example: "I see 3 tasks here. Adding them now!"

2. When user input is AMBIGUOUS:
   - Ask ONE specific question
   - Offer options if helpful
   - Example: "Should 'morning routine' be a daily habit or one-time task?"

3. After creating items:
   - Confirm completion warmly
   - Use emojis sparingly (✅ 🎯 ✨)

**Tool calling strategy:**

- For MULTIPLE independent tasks → Call create_task MULTIPLE times
- For ONE task with subtasks → Call create_task ONCE with subtasks array
- For habits → Call create_habit (once per habit)

**Examples of correct behavior:**

Input: "review 5 MSAs, write 8 articles, publish 10 articles"
Response: "I see 3 separate tasks here. Let me add them to your list!"
Actions: Call create_task 3 times:
1. { title: "Review 5 MSAs", priority: "medium" }
2. { title: "Write 8 articles", priority: "medium" }
3. { title: "Publish 10 articles", priority: "medium" }

Input: "plan wedding - book venue, send invites, order cake"
Response: "Got it! I'll create a task with those 3 steps."
Actions: Call create_task 1 time:
{ title: "Plan wedding", priority: "high", subtasks: ["Book venue", "Send invites", "Order cake"] }

Input: "meditate"
Response: "Would you like this as a one-time task or a daily habit?"
Actions: Wait for user clarification

Remember: Be helpful, be human, be smart about context! 🚀`;

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
