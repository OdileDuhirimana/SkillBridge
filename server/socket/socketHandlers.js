const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const { sendPushNotification, createNotificationPayload } = require('../utils/pushNotifications');

// Store active connections
const activeConnections = new Map();

const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.firstName} connected with socket ${socket.id}`);
    
    // Store connection
    activeConnections.set(socket.userId, socket.id);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining chat rooms
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = chat.participants.some(
          participant => participant.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to join this chat' });
          return;
        }

        socket.join(`chat_${chatId}`);
        socket.emit('joined_chat', { chatId });
        
        // Update last seen
        chat.updateLastSeen(socket.userId);
        await chat.save();
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('error', { message: 'Error joining chat' });
      }
    });

    // Handle leaving chat rooms
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
      socket.emit('left_chat', { chatId });
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, type = 'text', attachments = [], replyTo } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Check if user is a participant
        const isParticipant = chat.participants.some(
          participant => participant.user.toString() === socket.userId
        );

        if (!isParticipant) {
          socket.emit('error', { message: 'Not authorized to send messages in this chat' });
          return;
        }

        // Create message
        const message = {
          sender: socket.userId,
          content,
          type,
          attachments,
          replyTo
        };

        chat.messages.push(message);
        chat.lastMessage = chat.messages[chat.messages.length - 1]._id;
        chat.metadata.totalMessages += 1;

        // Update unread count for other participants
        chat.participants.forEach(participant => {
          if (participant.user.toString() !== socket.userId) {
            chat.metadata.unreadCount += 1;
          }
        });

        await chat.save();

        // Populate message data
        const populatedMessage = await Chat.findById(chat._id)
          .populate('messages.sender', 'firstName lastName avatar')
          .populate('messages.replyTo')
          .then(chat => chat.messages[chat.messages.length - 1]);

        // Emit message to all participants in the chat
        io.to(`chat_${chatId}`).emit('new_message', {
          chatId,
          message: populatedMessage
        });

        // Send push notifications to offline participants
        for (const participant of chat.participants) {
          if (participant.user.toString() !== socket.userId) {
            const participantSocket = activeConnections.get(participant.user.toString());
            
            // If participant is offline, send push notification
            if (!participantSocket) {
              try {
                const participantUser = await User.findById(participant.user).select('fcmToken');
                if (participantUser && participantUser.fcmToken) {
                  const notification = createNotificationPayload('message_received', {
                    senderName: socket.user.firstName,
                    chatId: chatId,
                    senderId: socket.userId
                  });
                  
                  await sendPushNotification(participantUser.fcmToken, notification);
                }
              } catch (error) {
                console.error('Push notification error:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: socket.userId,
        userName: socket.user.firstName,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('user_typing', {
        chatId,
        userId: socket.userId,
        userName: socket.user.firstName,
        isTyping: false
      });
    });

    // Handle message reactions
    socket.on('add_reaction', async (data) => {
      try {
        const { chatId, messageId, emoji } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        const message = chat.messages.id(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        message.addReaction(socket.userId, emoji);
        await chat.save();

        // Emit reaction to all participants
        io.to(`chat_${chatId}`).emit('reaction_added', {
          chatId,
          messageId,
          reaction: {
            user: socket.userId,
            emoji,
            addedAt: new Date()
          }
        });
      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Error adding reaction' });
      }
    });

    // Handle message read receipts
    socket.on('mark_messages_read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' });
          return;
        }

        // Update read status for messages
        for (const messageId of messageIds) {
          const message = chat.messages.id(messageId);
          if (message) {
            message.markAsRead(socket.userId);
          }
        }

        await chat.save();

        // Emit read receipt to other participants
        socket.to(`chat_${chatId}`).emit('messages_read', {
          chatId,
          userId: socket.userId,
          messageIds
        });
      } catch (error) {
        console.error('Mark messages read error:', error);
        socket.emit('error', { message: 'Error marking messages as read' });
      }
    });

    // Handle online status
    socket.on('set_online_status', (status) => {
      socket.userStatus = status;
      socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        status
      });
    });

    // Handle job application updates
    socket.on('application_status_changed', async (data) => {
      try {
        const { applicationId, status, message } = data;

        // Emit to applicant
        const application = await require('../models/Application').findById(applicationId);
        if (application) {
          io.to(`user_${application.applicant}`).emit('application_updated', {
            applicationId,
            status,
            message
          });

          // Send push notification to applicant
          try {
            const applicant = await User.findById(application.applicant).select('fcmToken');
            if (applicant && applicant.fcmToken) {
              const notification = createNotificationPayload('application_update', {
                jobTitle: 'Your application',
                status: status,
                applicationId: applicationId
              });
              
              await sendPushNotification(applicant.fcmToken, notification);
            }
          } catch (error) {
            console.error('Push notification error:', error);
          }
        }
      } catch (error) {
        console.error('Application status change error:', error);
      }
    });

    // Handle new job notifications
    socket.on('new_job_posted', async (data) => {
      try {
        const { jobId, companyId } = data;

        // Get users who follow this company or match the job criteria
        const followers = await User.find({
          'preferences.notifications.jobMatches': true,
          // Add more criteria based on job requirements
        }).select('fcmToken');

        // Send notifications to followers
        for (const follower of followers) {
          if (follower.fcmToken) {
            try {
              const notification = createNotificationPayload('job_match', {
                jobTitle: 'New job posted',
                jobId: jobId,
                companyId: companyId
              });
              
              await sendPushNotification(follower.fcmToken, notification);
            } catch (error) {
              console.error('Push notification error:', error);
            }
          }
        }
      } catch (error) {
        console.error('New job notification error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.firstName} disconnected`);
      activeConnections.delete(socket.userId);
      
      // Emit offline status
      socket.broadcast.emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Broadcast functions for server-side events
  const broadcastToUser = (userId, event, data) => {
    const socketId = activeConnections.get(userId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  };

  const broadcastToChat = (chatId, event, data) => {
    io.to(`chat_${chatId}`).emit(event, data);
  };

  const broadcastToRole = (role, event, data) => {
    io.emit(event, { ...data, targetRole: role });
  };

  // Export broadcast functions
  io.broadcastToUser = broadcastToUser;
  io.broadcastToChat = broadcastToChat;
  io.broadcastToRole = broadcastToRole;
};

module.exports = { setupSocketHandlers };
