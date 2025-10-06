import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-6 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn("flex gap-3 max-w-[85%]", isUser && "flex-row-reverse")}>
        {/* Avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 transition-all duration-300 hover:scale-[1.02]",
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-elegant"
              : "bg-card border border-border/50 text-foreground shadow-soft"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <p
            className={cn(
              "text-[10px] mt-2 opacity-60",
              isUser ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
