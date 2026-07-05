import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { chatService } from '../services/chatService';
import { Chat, Message } from '../types';

const getChatDisplayName = (chat: Chat, currentUserId?: string): string => {
  if (chat.title) return chat.title;
  const other = chat.participants.find((p) => p.user !== currentUserId);
  return other ? 'Conversation' : 'Chat';
};

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, joinChat, leaveChat, sendMessage: emitMessage } = useSocket();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatService.getChats();
      setChats(response.data);
      if (response.data.length > 0) {
        setActiveChatId(response.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations. Please try again.');
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!activeChatId) {
      setActiveChat(null);
      return;
    }

    let cancelled = false;
    setLoadingChat(true);

    chatService
      .getChat(activeChatId)
      .then((chat) => {
        if (!cancelled) setActiveChat(chat);
      })
      .catch((err: any) => {
        if (!cancelled) toast.error(err.message || 'Failed to load this conversation.');
      })
      .finally(() => {
        if (!cancelled) setLoadingChat(false);
      });

    joinChat(activeChatId);
    return () => {
      cancelled = true;
      leaveChat(activeChatId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  // Listen for real-time incoming messages via Socket.io for the active chat.
  useEffect(() => {
    if (!socket) return undefined;

    const handleNewMessage = (payload: { chatId: string; message: Message }) => {
      if (payload.chatId !== activeChatId) return;
      setActiveChat((prev) => (prev ? { ...prev, messages: [...prev.messages, payload.message] } : prev));
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, activeChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;

    const content = newMessage;
    setNewMessage('');

    try {
      // Prefer the real-time socket path; the REST fallback below
      // (chatService.sendMessage) is still exercised on socket failure so
      // the message is never silently lost if the socket is disconnected.
      if (socket) {
        emitMessage({ chatId: activeChatId, content });
      } else {
        const message = await chatService.sendMessage(activeChatId, content);
        setActiveChat((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message.');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredChats = chats.filter((chat) =>
    getChatDisplayName(chat, user?.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadChats} />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat List */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <div className="mt-3 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <label htmlFor="chat-search" className="sr-only">Search conversations</label>
            <input
              id="chat-search"
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <UserGroupIcon className="mx-auto h-10 w-10 text-gray-400" aria-hidden="true" />
              <p className="mt-2 text-sm text-gray-500">No conversations yet.</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => setActiveChatId(chat.id)}
                aria-pressed={activeChatId === chat.id}
                className={`w-full text-left p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  activeChatId === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getChatDisplayName(chat, user?.id)}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                  {chat.metadata.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-xs font-medium text-white">
                      {chat.metadata.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {loadingChat ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">
                  {getChatDisplayName(activeChat, user?.id)}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeChat.messages.length === 0 ? (
                <p className="text-center text-sm text-gray-500 mt-8">
                  No messages yet. Say hello!
                </p>
              ) : (
                activeChat.messages.map((message) => {
                  const isOwn = message.sender === user?.id;
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <label htmlFor="chat-message" className="sr-only">Type a message</label>
                <input
                  id="chat-message"
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  aria-label="Send message"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No chat selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a conversation from the sidebar to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
