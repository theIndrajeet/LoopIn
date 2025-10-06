import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/ChatMessage";
import { ItemPreviewCard } from "@/components/ItemPreviewCard";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PendingItem {
  id: string;
  type: "task" | "habit";
  data: any;
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingItems]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const newHistory = [
        ...conversationHistory,
        { role: "user", content: input },
      ];

      console.log("[AI Chat] Sending request:", { messageCount: newHistory.length });

      const { data, error } = await supabase.functions.invoke("ai-chat-assistant", {
        body: { messages: newHistory },
      });

      // Handle specific error types
      if (error) {
        console.error("[AI Chat] Edge function error:", error);
        if (error.message?.includes("429") || error.message?.includes("rate limit")) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (error.message?.includes("402") || error.message?.includes("payment")) {
          toast.error("AI service unavailable. Please try again later.");
        } else {
          toast.error(error.message || "Failed to send message");
        }
        return;
      }

      // Validate response data
      if (!data) {
        console.error("[AI Chat] No data in response");
        toast.error("Invalid response from AI. Please try again.");
        return;
      }

      console.log("[AI Chat] Response received:", { hasMessage: !!data.message, hasToolCalls: !!data.toolCalls });

      // Ensure message exists
      const messageContent = data.message || "Sorry, I couldn't generate a response.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: messageContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory([
        ...newHistory,
        { role: "assistant", content: messageContent },
      ]);

      // Handle tool calls for task/habit creation with safe parsing
      if (data.toolCalls && Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
        try {
          const newPendingItems = data.toolCalls
            .map((call: any) => {
              try {
                // Handle arguments that might already be parsed or need parsing
                const parsedArgs = typeof call.function.arguments === "string"
                  ? JSON.parse(call.function.arguments)
                  : call.function.arguments;

                if (!parsedArgs || typeof parsedArgs !== "object") {
                  console.error("[AI Chat] Invalid tool call arguments:", call);
                  return null;
                }

                return {
                  id: crypto.randomUUID(),
                  type: call.function.name === "create_task" ? "task" : "habit",
                  data: parsedArgs,
                };
              } catch (parseError) {
                console.error("[AI Chat] Failed to parse tool call:", call, parseError);
                return null;
              }
            })
            .filter(Boolean); // Remove any null items from failed parsing

          if (newPendingItems.length > 0) {
            setPendingItems((prev) => [...prev, ...newPendingItems]);
          }
        } catch (toolError) {
          console.error("[AI Chat] Error processing tool calls:", toolError);
          toast.error("Failed to process AI suggestions");
        }
      }
    } catch (error: any) {
      console.error("[AI Chat] Unexpected error:", error);
      toast.error(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (itemId: string) => {
    const item = pendingItems.find((i) => i.id === itemId);
    if (!item) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (item.type === "task") {
        const { error } = await supabase.from("tasks").insert({
          user_id: user.id,
          title: item.data.title,
          description: item.data.description,
          priority: item.data.priority || "medium",
          due_date: item.data.due_date,
        });
        if (error) throw error;
        toast.success("Task created successfully!");
      } else {
        const { error } = await supabase.from("habits").insert({
          user_id: user.id,
          title: item.data.title,
          difficulty: item.data.difficulty || "medium",
          schedule_days: item.data.schedule_days || [1, 2, 3, 4, 5],
          category: item.data.category,
        });
        if (error) throw error;
        toast.success("Habit created successfully!");
      }

      setPendingItems((prev) => prev.filter((i) => i.id !== itemId));

      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `✓ ${item.type === "task" ? "Task" : "Habit"} added successfully!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast.error(error.message || "Failed to add item");
    }
  };

  const handleCancelItem = (itemId: string) => {
    setPendingItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.info("Item cancelled");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-elevated/80 backdrop-blur-heavy border-b border-border/40 shadow-soft">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Create tasks & habits with AI
            </p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="h-[calc(100vh-180px)] p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-4xl">✨</div>
              <h2 className="text-xl font-semibold">Start a conversation</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Try saying things like:
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>"Add buy groceries to my list"</p>
                <p>"I want to start meditating daily"</p>
                <p>"Remind me to call mom tomorrow"</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {pendingItems.map((item) => (
                <ItemPreviewCard
                  key={item.id}
                  item={item}
                  onAdd={() => handleAddItem(item.id)}
                  onCancel={() => handleCancelItem(item.id)}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="fixed bottom-20 left-0 right-0 bg-elevated/80 backdrop-blur-heavy border-t border-border/40 p-4 shadow-elevated">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
