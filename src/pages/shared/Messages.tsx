import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, User, Send, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageWithProfile {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean | null;
  created_at: string | null;
  sender_name?: string;
  receiver_name?: string;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
}

export default function Messages() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages with sender/receiver profiles
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      const userIds = new Set<string>();
      messagesData?.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return messagesData?.map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || 'Unknown',
        receiver_name: profileMap.get(msg.receiver_id) || 'Unknown',
      })) as MessageWithProfile[];
    },
    enabled: !!user?.id,
  });

  // Fetch available recipients based on role
  const { data: recipients } = useQuery({
    queryKey: ['message-recipients', user?.id, role],
    queryFn: async () => {
      if (!user?.id) return [];
      
      if (role === 'student') {
        const { data: enrollment } = await supabase
          .from('student_enrollments')
          .select('class_id, section_id')
          .eq('student_id', user.id)
          .maybeSingle();

        if (!enrollment) return [];

        const { data: assignments } = await supabase
          .from('teacher_assignments')
          .select('teacher_id')
          .eq('class_id', enrollment.class_id);

        if (!assignments || assignments.length === 0) return [];

        const teacherIds = assignments.map(a => a.teacher_id);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherIds);

        return profiles?.map(p => ({ id: p.user_id, name: p.full_name })) || [];
      } else if (role === 'teacher') {
        const { data: assignments } = await supabase
          .from('teacher_assignments')
          .select('class_id')
          .eq('teacher_id', user.id);

        if (!assignments || assignments.length === 0) return [];

        const classIds = assignments.map(a => a.class_id);

        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('student_id')
          .in('class_id', classIds);

        if (!enrollments || enrollments.length === 0) return [];

        const studentIds = [...new Set(enrollments.map(e => e.student_id))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        return profiles?.map(p => ({ id: p.user_id, name: p.full_name })) || [];
      } else if (role === 'admin') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .neq('user_id', user.id);

        return profiles?.map(p => ({ id: p.user_id, name: p.full_name })) || [];
      } else if (role === 'parent') {
        const { data: children } = await supabase
          .from('parent_students')
          .select('student_id')
          .eq('parent_id', user.id);

        if (!children || children.length === 0) return [];

        const studentIds = children.map(c => c.student_id);

        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select('class_id')
          .in('student_id', studentIds);

        if (!enrollments || enrollments.length === 0) return [];

        const classIds = [...new Set(enrollments.map(e => e.class_id))];

        const { data: assignments } = await supabase
          .from('teacher_assignments')
          .select('teacher_id')
          .in('class_id', classIds);

        if (!assignments || assignments.length === 0) return [];

        const teacherIds = [...new Set(assignments.map(a => a.teacher_id))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', teacherIds);

        return profiles?.map(p => ({ id: p.user_id, name: p.full_name })) || [];
      }

      return [];
    },
    enabled: !!user?.id && !!role,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user!.id,
          receiver_id: receiverId,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageInput('');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  // Mark messages as read when selecting conversation
  const markAsRead = useMutation({
    mutationFn: async (senderId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', user!.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  // Build conversations from messages
  const conversations: Conversation[] = React.useMemo(() => {
    if (!messages || !user?.id) return [];

    const conversationMap = new Map<string, Conversation>();

    messages.forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const otherName = msg.sender_id === user.id ? msg.receiver_name : msg.sender_name;

      const existing = conversationMap.get(otherId);
      const msgTime = msg.created_at ? new Date(msg.created_at).getTime() : 0;
      const existingTime = existing?.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0;

      if (!existing || msgTime > existingTime) {
        conversationMap.set(otherId, {
          id: otherId,
          name: otherName || 'Unknown',
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          unreadCount: existing?.unreadCount || 0,
        });
      }

      if (msg.receiver_id === user.id && !msg.is_read) {
        const conv = conversationMap.get(otherId);
        if (conv) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
      }
    });

    recipients?.forEach(recipient => {
      if (!conversationMap.has(recipient.id)) {
        conversationMap.set(recipient.id, {
          id: recipient.id,
          name: recipient.name,
          lastMessage: '',
          lastMessageTime: null,
          unreadCount: 0,
        });
      }
    });

    return Array.from(conversationMap.values()).sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }, [messages, recipients, user?.id]);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = messages?.filter(msg =>
    (msg.sender_id === selectedConversation && msg.receiver_id === user?.id) ||
    (msg.sender_id === user?.id && msg.receiver_id === selectedConversation)
  ) || [];

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setShowChat(true);
    markAsRead.mutate(conversationId);
  };

  const handleBackToList = () => {
    setShowChat(false);
    setSelectedConversation(null);
  };

  const handleSendMessage = () => {
    if (!selectedConversation || !messageInput.trim()) return;
    sendMessage.mutate({
      receiverId: selectedConversation,
      content: messageInput.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render conversation list content
  const renderConversationList = () => (
    <>
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          <div>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/50 ${
                  selectedConversation === conversation.id ? 'bg-muted/70' : ''
                }`}
              >
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(conversation.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{conversation.name}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                  )}
                  {conversation.lastMessageTime && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(conversation.lastMessageTime), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        )}
      </ScrollArea>
    </>
  );

  // Render chat view content
  const renderChatView = (showBackButton: boolean) => (
    <>
      {selectedConversation ? (
        <>
          <div className="p-3 border-b border-border flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={handleBackToList}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">
                {selectedConversationData ? getInitials(selectedConversationData.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{selectedConversationData?.name}</p>
              <p className="text-xs text-muted-foreground">
                {role === 'student' ? 'Teacher' : role === 'teacher' ? 'Student' : 'User'}
              </p>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground py-20">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                conversationMessages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {message.created_at
                            ? format(new Date(message.created_at), 'h:mm a')
                            : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-10"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessage.isPending}
                className="flex-shrink-0 h-10 w-10 rounded-full"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose someone from the list to start messaging</p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout>
      <div className="section-container h-[calc(100vh-120px)]">
        <Card className="card-base h-full overflow-hidden">
          {/* Desktop: Side-by-side layout */}
          <div className="hidden md:flex h-full">
            <div className="w-80 border-r border-border flex flex-col">
              {renderConversationList()}
            </div>
            <div className="flex-1 flex flex-col">
              {renderChatView(false)}
            </div>
          </div>

          {/* Mobile: Toggle between list and chat */}
          <div className="md:hidden h-full flex flex-col">
            {showChat && selectedConversation ? (
              renderChatView(true)
            ) : (
              renderConversationList()
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export { Messages };
