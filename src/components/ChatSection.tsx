import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import {useEffect, useRef, useState, useCallback} from "react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface ChatSectionProps {
  confirmedName: string | null;
  participants: string[];
}

export function ChatSection({ confirmedName, participants }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  // Bottom sentinel
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(true); // auto-scroll only when user is at bottom


  const handleViewportScroll = useCallback(() => {
  const v = viewportRef.current;
  if (!v) return;
  const delta = v.scrollHeight - v.clientHeight - v.scrollTop;
  setPinned(delta < 4); // within 4px of bottom counts as "pinned"
}, []);

useEffect(() => {
  const v = viewportRef.current;
  if (!v) return;

  // If first message OR user is pinned, scroll to bottom AFTER DOM updates
  if (messages.length <= 1 || pinned) {
    requestAnimationFrame(() => {
      v.scrollTo({ top: v.scrollHeight, behavior: "smooth" });
    });
  }
}, [messages.length, confirmedName, pinned]);

useEffect(() => {
  const v = viewportRef.current;
  if (!v) return;
  const onScroll = () => handleViewportScroll();
  v.addEventListener("scroll", onScroll, { passive: true });
  handleViewportScroll(); // initialize pinned
  return () => v.removeEventListener("scroll", onScroll);
}, [handleViewportScroll]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !confirmedName) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: confirmedName,
      content: newMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!confirmedName) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-3">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Chat Unavailable</p>
              <p className="text-sm text-muted-foreground">
                Please confirm your name to join the chat
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-80 min-h-0">
          {/* Messages */}
          <ScrollArea 
          className="flex-1 min-h-0 pr-4 mb-4"
          viewportRef={viewportRef}
          >
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{message.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}