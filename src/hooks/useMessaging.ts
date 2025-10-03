import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  sender_display_name: string;
  receiver_display_name: string;
}

export interface Thread {
  thread_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Messages table doesn't exist - all functions disabled
  const loadThreads = async () => {
    setThreads([]);
  };

  const loadMessages = async (threadId: string) => {
    setMessages([]);
    setSelectedThreadId(threadId);
  };

  const sendMessage = async (threadId: string, receiverId: string, messageText: string) => {
    toast.error('Messaging system not implemented');
  };

  const createThread = async (receiverId: string, messageText: string) => {
    toast.error('Messaging system not implemented');
    return null;
  };

  const deleteMessage = async (messageId: string) => {
    toast.error('Messaging system not implemented');
    return false;
  };

  const deleteThread = async (threadId: string) => {
    toast.error('Messaging system not implemented');
    return false;
  };

  const startAdminThread = async (messageText: string) => {
    toast.error('Messaging system not implemented');
    return null;
  };

  return {
    threads,
    messages,
    selectedThreadId,
    loading,
    loadThreads,
    loadMessages,
    sendMessage,
    createThread,
    deleteMessage,
    deleteThread,
    startAdminThread,
    setSelectedThreadId,
  };
};
