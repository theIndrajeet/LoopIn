import { cn } from "@/lib/utils";

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
        "flex w-full mb-3 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex flex-col max-w-[70%]">
        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-3 backdrop-blur-subtle transition-all duration-200",
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md shadow-glow-primary ml-auto"
              : "bg-card/70 border border-border/50 text-card-foreground rounded-2xl rounded-bl-md shadow-soft"
          )}
        >
          <p className="text-[15px] leading-relaxed font-normal whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] mt-1.5 text-muted-foreground",
            isUser ? "text-right mr-2" : "ml-2"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};
