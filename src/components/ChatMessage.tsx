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
        "flex w-full mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex flex-col max-w-[65%]">
        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-2.5 transition-colors duration-200",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-[20px] rounded-br-[4px] ml-auto"
              : "bg-gray-100 dark:bg-gray-800 text-foreground rounded-[20px] rounded-bl-[4px]"
          )}
        >
          <p className="text-[15px] leading-[1.4] font-normal whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] mt-1 text-gray-500 dark:text-gray-400",
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
