import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../context/SocketContext';

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
}

const ChatPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadChats = async () => {
    // Simulate API call
    const mockChats: Chat[] = [
      {
        id: '1',
        name: 'Sarah Johnson',
        avatar: '',
        lastMessage: 'Thanks for the interview opportunity!',
        timestamp: '2 hours ago',
        unreadCount: 2,
        isOnline: true,
      },
      {
        id: '2',
        name: 'TechCorp HR',
        avatar: '',
        lastMessage: 'We would like to schedule a second interview.',
        timestamp: '1 day ago',
        unreadCount: 0,
        isOnline: false,
      },
      {
        id: '3',
        name: 'Mike Chen',
        avatar: '',
        lastMessage: 'Let me know if you have any questions about the role.',
        timestamp: '2 days ago',
        unreadCount: 0,
        isOnline: true,
      },
    ];

    setChats(mockChats);
    if (mockChats.length > 0) {
      setActiveChat(mockChats[0].id);
    }
  };

  const loadMessages = async (chatId: string) => {
    // Simulate API call
    const mockMessages: Message[] = [
      {
        id: '1',
        sender: {
          id: '1',
          name: 'Sarah Johnson',
          avatar: '',
        },
        content: 'Hi! I saw your application for the React Developer position.',
        timestamp: '2024-01-20T10:00:00Z',
        type: 'text',
      },
      {
        id: '2',
        sender: {
          id: 'user',
          name: 'You',
          avatar: '',
        },
        content: 'Hello! Yes, I\'m very interested in the role.',
        timestamp: '2024-01-20T10:05:00Z',
        type: 'text',
      },
      {
        id: '3',
        sender: {
          id: '1',
          name: 'Sarah Johnson',
          avatar: '',
        },
        content: 'Great! We would like to schedule an interview with you. Are you available this week?',
        timestamp: '2024-01-20T10:10:00Z',
        type: 'text',
      },
      {
        id: '4',
        sender: {
          id: 'user',
          name: 'You',
          avatar: '',
        },
        content: 'Yes, I\'m available. What times work best for you?',
        timestamp: '2024-01-20T10:15:00Z',
        type: 'text',
      },
      {
        id: '5',
        sender: {
          id: '1',
          name: 'Sarah Johnson',
          avatar: '',
        },
        content: 'How about Thursday at 2 PM?',
        timestamp: '2024-01-20T10:20:00Z',
        type: 'text',
      },
    ];

    setMessages(mockMessages);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && activeChat) {
      const message: Message = {
        id: Date.now().toString(),
        sender: {
          id: 'user',
          name: 'You',
          avatar: '',
        },
        content: newMessage,
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Simulate response
      setTimeout(() => {
        const response: Message = {
          id: (Date.now() + 1).toString(),
          sender: {
            id: activeChat,
            name: chats.find(chat => chat.id === activeChat)?.name || 'Unknown',
            avatar: '',
          },
          content: 'Thanks for your message! I\'ll get back to you soon.',
          timestamp: new Date().toISOString(),
          type: 'text',
        };
        setMessages(prev => [...prev, response]);
      }, 1000);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Chat List */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <div className="mt-3 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeChat === chat.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {chat.name}
                    </p>
                    <p className="text-xs text-gray-500">{chat.timestamp}</p>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-xs font-medium text-white">
                      {chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {chats.find(chat => chat.id === activeChat)?.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {chats.find(chat => chat.id === activeChat)?.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <PhoneIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <VideoCameraIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender.id === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender.id === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender.id === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
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