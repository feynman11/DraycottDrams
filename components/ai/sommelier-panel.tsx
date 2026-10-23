import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SommelierPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Which Islay should we try next?",
  "What pairs with a sherried Speyside?",
  "Explain cask strength",
];

export function SommelierPanel({ isOpen, onClose }: SommelierPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI sommelier. I can help you discover whiskies, provide recommendations, or answer questions about whisky tasting and production. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = api.ai.chat.useMutation();

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, chatMutation.isPending, isOpen]);

  const handleSendMessage = async (text = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        context: messages.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title="AI Sommelier" description="Chat with the club's AI sommelier" className="md:w-[420px]">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4 pr-16">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles size={16} />
          </span>
          <div>
            <h2 className="font-semibold leading-tight text-foreground">AI Sommelier</h2>
            <p className="text-xs text-muted-foreground">Your whisky expert</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4" role="log" aria-live="polite">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex animate-rise-in", message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-muted text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={cn("mt-1 text-[10px] tabular-nums", message.role === 'user' ? "text-primary-foreground/70" : "text-subtle")}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex justify-start" aria-label="The sommelier is typing">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary animate-typing"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {messages.length === 1 && !chatMutation.isPending && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form
          className="flex gap-2 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+var(--safe-bottom))]"
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about whisky…"
            aria-label="Message"
            autoComplete="off"
            disabled={chatMutation.isPending}
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || chatMutation.isPending}>
            <Send size={16} />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
