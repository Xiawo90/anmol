import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Sparkles, BookOpen, Calculator, Languages, User, Loader2, ArrowUp, History, Trash2, Plus, MessageSquare, ImagePlus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';

type Message = { role: "user" | "assistant"; content: string; image?: string };
type ChatSession = {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
};

const AI_HELPER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-helper`;

export default function StudentAIHelper() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = [
    { icon: BookOpen, label: 'Explain a concept', prompt: 'Can you explain the concept of ' },
    { icon: Calculator, label: 'Help with math', prompt: 'Help me solve this math problem: ' },
    { icon: Languages, label: 'Language help', prompt: 'Help me understand this sentence: ' },
    { icon: Sparkles, label: 'Study tips', prompt: 'Give me study tips for ' },
  ];

  // Check AI helper enabled setting
  useEffect(() => {
    const checkAiEnabled = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ai_helper_enabled')
        .maybeSingle();
      
      // Default to enabled if no setting exists
      setAiEnabled(data?.value === false ? false : true);
    };
    checkAiEnabled();
  }, []);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    const handleScroll = () => {
      setShowScrollTop(scrollArea.scrollTop > 100);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, []);

  const loadChatSessions = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setChatSessions((data || []).map(session => ({
        ...session,
        messages: (session.messages as unknown as Message[]) || []
      })));
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveCurrentChat = async (messagesToSave: Message[]) => {
    if (!user || messagesToSave.length === 0) return;

    try {
      if (currentSessionId) {
        // Update existing session
        const { error } = await supabase
          .from('ai_chat_history')
          .update({ 
            messages: messagesToSave as unknown as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSessionId);
        
        if (error) throw error;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('ai_chat_history')
          .insert({
            user_id: user.id,
            messages: messagesToSave as unknown as any
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentSessionId(data.id);
        }
      }
      
      // Refresh chat sessions
      loadChatSessions();
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowHistory(false);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('ai_chat_history')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        startNewChat();
      }
      
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const scrollToTop = () => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    scrollArea?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSessionTitle = (session: ChatSession) => {
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '');
    }
    return 'New conversation';
  };

  const streamChat = async (userMessages: Message[]) => {
    // Get the current session for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Please log in to use the AI helper");
    }

    const resp = await fetch(AI_HELPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: userMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${resp.status}`);
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch { /* ignore */ }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read image');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    if ((!message.trim() && !selectedImage) || isLoading) return;
    
    const userMsg: Message = { 
      role: "user", 
      content: message.trim() || (selectedImage ? "Please analyze this image" : ""),
      ...(selectedImage && { image: selectedImage })
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setMessage('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      await streamChat(newMessages);
      // Save chat after AI responds - get latest messages from state
      setMessages(prev => {
        saveCurrentChat(prev);
        return prev;
      });
    } catch (error) {
      console.error("AI Helper error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get AI response");
      // Remove the user message if there was an error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: JSX.Element[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag key={`list-${elements.length}`} className={`ml-4 space-y-1 ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}>
            {listItems}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    const renderLatex = (latex: string, displayMode: boolean = false): string => {
      try {
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: displayMode,
          trust: true,
          strict: false,
        });
      } catch (e) {
        console.error('KaTeX error:', e);
        return latex;
      }
    };

    const formatLine = (line: string): string => {
      // Display math: $$...$$
      line = line.replace(/\$\$([^$]+)\$\$/g, (_, latex) => {
        return `<div class="my-3 text-center overflow-x-auto">${renderLatex(latex.trim(), true)}</div>`;
      });
      
      // Inline math: $...$
      line = line.replace(/\$([^$]+)\$/g, (_, latex) => {
        return renderLatex(latex.trim(), false);
      });
      
      // Bold: **text** or __text__
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
      line = line.replace(/__(.*?)__/g, '<strong class="font-semibold text-foreground">$1</strong>');
      // Italic: *text* or _text_
      line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      line = line.replace(/_([^_]+)_/g, '<em>$1</em>');
      // Inline code: `code`
      line = line.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
      // Hash headers in middle of text: remove #
      line = line.replace(/#{1,6}\s*/g, '');
      return line;
    };

    lines.forEach((line, i) => {
      const trimmedLine = line.trim();

      // Headers: # ## ### etc
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        flushList();
        const level = headerMatch[1].length;
        const text = formatLine(headerMatch[2]);
        const headerClasses = {
          1: 'text-lg font-bold mt-4 mb-2',
          2: 'text-base font-bold mt-3 mb-2',
          3: 'text-base font-semibold mt-2 mb-1',
          4: 'text-sm font-semibold mt-2 mb-1',
          5: 'text-sm font-medium mt-1 mb-1',
          6: 'text-sm font-medium mt-1 mb-1',
        };
        elements.push(
          <div key={i} className={headerClasses[level as keyof typeof headerClasses]} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ADD_TAGS: ['span'], ADD_ATTR: ['class', 'style'] }) }} />
        );
        return;
      }

      // Bullet lists: - or * or •
      if (/^[-*•]\s+/.test(trimmedLine)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        const text = formatLine(trimmedLine.replace(/^[-*•]\s+/, ''));
        listItems.push(
          <li key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ADD_TAGS: ['span'], ADD_ATTR: ['class', 'style'] }) }} />
        );
        return;
      }

      // Numbered lists: 1. 2. etc
      if (/^\d+[.)]\s+/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        const text = formatLine(trimmedLine.replace(/^\d+[.)]\s+/, ''));
        listItems.push(
          <li key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ADD_TAGS: ['span'], ADD_ATTR: ['class', 'style'] }) }} />
        );
        return;
      }

      // Empty line
      if (trimmedLine === '') {
        flushList();
        elements.push(<div key={i} className="h-2" />);
        return;
      }

      // Regular paragraph
      flushList();
      const text = formatLine(trimmedLine);
      elements.push(
        <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { ADD_TAGS: ['span'], ADD_ATTR: ['class', 'style'] }) }} />
      );
    });

    flushList();
    return <div className="space-y-1">{elements}</div>;
  };

  if (aiEnabled === false) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Bot className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-2">AI Helper is Currently Disabled</h2>
          <p className="text-muted-foreground max-w-md">
            The AI Study Helper has been temporarily disabled by your school administrator. Please check back later.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">AI Study Helper</h1>
            <p className="text-muted-foreground">Get help with your studies using AI</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
            <Button
              variant={showHistory ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              History
            </Button>
          </div>
        </div>

        {/* Chat History Sidebar */}
        {showHistory && (
          <Card className="animate-fade-in">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Saved Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : chatSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved conversations yet
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => loadSession(session)}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors group ${
                          currentSessionId === session.id ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getSessionTitle(session)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(session.updated_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => deleteSession(session.id, e)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Prompts */}
        <div className="grid gap-4 md:grid-cols-4">
          {quickPrompts.map((prompt, index) => {
            const Icon = prompt.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setMessage(prompt.prompt)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium">{prompt.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chat Interface */}
        <Card className="min-h-[500px] flex flex-col">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">AI Assistant</span>
              {currentSessionId && (
                <span className="text-xs font-normal text-muted-foreground ml-1 hidden sm:inline">
                  (saved)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Chat Messages Area */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[400px]">
              <ScrollArea 
                ref={scrollAreaRef}
                className="h-full rounded-lg border bg-muted/30 p-2 sm:p-4 mb-3 sm:mb-4"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8 sm:py-12 px-2">
                    <Bot className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                    <p className="font-medium text-sm sm:text-base">Hello! I'm your AI study helper.</p>
                    <p className="text-xs sm:text-sm mt-2">
                      Ask me anything about your studies!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4 pb-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md max-w-[80%] sm:max-w-[75%]'
                              : 'bg-background border rounded-bl-md shadow-sm flex-1 max-w-[90%] sm:max-w-[85%]'
                          }`}
                        >
                          {/* Show uploaded image if present */}
                          {msg.image && (
                            <div className="mb-3">
                              <img 
                                src={msg.image} 
                                alt="Uploaded" 
                                className="max-w-full max-h-48 rounded-lg object-contain"
                              />
                            </div>
                          )}
                          <div className={`prose prose-sm dark:prose-invert max-w-none ${
                            msg.role === 'assistant' ? 'text-foreground' : ''
                          }`}>
                            {msg.role === 'assistant' ? renderMessageContent(msg.content) : (
                              <p className="text-sm whitespace-pre-wrap m-0">{msg.content}</p>
                            )}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                      <div className="flex gap-2 sm:gap-3 justify-start">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <div className="bg-background border rounded-2xl rounded-bl-md px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
                            <span className="text-xs sm:text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Scroll to top button */}
              {showScrollTop && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-4 rounded-full shadow-md animate-fade-in"
                  onClick={scrollToTop}
                >
                  <ArrowUp className="w-4 h-4 animate-bounce" />
                </Button>
              )}
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              {/* Image Preview */}
              {selectedImage && (
                <div className="relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="max-h-24 rounded-lg border object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removeSelectedImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-1.5 sm:gap-2">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                {/* Upload button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-auto min-h-[44px] sm:min-h-[60px] w-10 sm:w-12 flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploadingImage}
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
                
                <Textarea
                  placeholder="Ask anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[44px] sm:min-h-[60px] resize-none text-sm"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={(!message.trim() && !selectedImage) || isLoading}
                  className="h-auto min-h-[44px] sm:min-h-[60px] w-10 sm:w-12 flex-shrink-0"
                  size="icon"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
