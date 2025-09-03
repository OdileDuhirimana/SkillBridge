const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Send push notification to a single device
const sendPushNotification = async (fcmToken, notification) => {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2563eb',
          sound: 'default',
          channelId: 'skillbridge_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('Push notification error:', error);
    throw error;
  }
};

// Send push notification to multiple devices
const sendBulkPushNotification = async (fcmTokens, notification) => {
  try {
    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2563eb',
          sound: 'default',
          channelId: 'skillbridge_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Bulk push notification sent:', response);
    return response;
  } catch (error) {
    console.error('Bulk push notification error:', error);
    throw error;
  }
};

// Send push notification to a topic
const sendTopicPushNotification = async (topic, notification) => {
  try {
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2563eb',
          sound: 'default',
          channelId: 'skillbridge_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Topic push notification sent:', response);
    return response;
  } catch (error) {
    console.error('Topic push notification error:', error);
    throw error;
  }
};

// Subscribe user to topic
const subscribeToTopic = async (fcmTokens, topic) => {
  try {
    const response = await admin.messaging().subscribeToTopic(fcmTokens, topic);
    console.log('Subscribed to topic:', response);
    return response;
  } catch (error) {
    console.error('Topic subscription error:', error);
    throw error;
  }
};

// Unsubscribe user from topic
const unsubscribeFromTopic = async (fcmTokens, topic) => {
  try {
    const response = await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
    console.log('Unsubscribed from topic:', response);
    return response;
  } catch (error) {
    console.error('Topic unsubscription error:', error);
    throw error;
  }
};

// Send notification to user by ID
const sendNotificationToUser = async (userId, notification) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('fcmToken');
    
    if (!user || !user.fcmToken) {
      console.log('User not found or no FCM token');
      return null;
    }

    return await sendPushNotification(user.fcmToken, notification);
  } catch (error) {
    console.error('Send notification to user error:', error);
    throw error;
  }
};

// Send notification to multiple users
const sendNotificationToUsers = async (userIds, notification) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ 
      _id: { $in: userIds },
      fcmToken: { $exists: true, $ne: null }
    }).select('fcmToken');

    const fcmTokens = users.map(user => user.fcmToken);
    
    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found for users');
      return null;
    }

    return await sendBulkPushNotification(fcmTokens, notification);
  } catch (error) {
    console.error('Send notification to users error:', error);
    throw error;
  }
};

// Send notification to all users with a specific role
const sendNotificationToRole = async (role, notification) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ 
      role: role,
      fcmToken: { $exists: true, $ne: null }
    }).select('fcmToken');

    const fcmTokens = users.map(user => user.fcmToken);
    
    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens found for role: ${role}`);
      return null;
    }

    return await sendBulkPushNotification(fcmTokens, notification);
  } catch (error) {
    console.error('Send notification to role error:', error);
    throw error;
  }
};

// Create notification payloads for different types
const createNotificationPayload = (type, data) => {
  const payloads = {
    job_match: {
      title: 'New Job Match!',
      body: `We found a job that matches your profile: ${data.jobTitle}`,
      data: {
        type: 'job_match',
        jobId: data.jobId,
        companyId: data.companyId
      }
    },
    application_update: {
      title: 'Application Status Updated',
      body: `Your application for ${data.jobTitle} has been updated`,
      data: {
        type: 'application_update',
        applicationId: data.applicationId,
        status: data.status
      }
    },
    interview_scheduled: {
      title: 'Interview Scheduled',
      body: `Your interview for ${data.jobTitle} has been scheduled`,
      data: {
        type: 'interview_scheduled',
        applicationId: data.applicationId,
        interviewDate: data.interviewDate
      }
    },
    message_received: {
      title: 'New Message',
      body: `You have a new message from ${data.senderName}`,
      data: {
        type: 'message_received',
        chatId: data.chatId,
        senderId: data.senderId
      }
    },
    application_received: {
      title: 'New Application',
      body: `You received a new application for ${data.jobTitle}`,
      data: {
        type: 'application_received',
        applicationId: data.applicationId,
        jobId: data.jobId
      }
    },
    badge_earned: {
      title: 'Badge Earned!',
      body: `Congratulations! You earned the ${data.badgeName} badge`,
      data: {
        type: 'badge_earned',
        badgeName: data.badgeName,
        badgeIcon: data.badgeIcon
      }
    },
    xp_milestone: {
      title: 'Level Up!',
      body: `You reached level ${data.level} and gained ${data.xpAmount} XP`,
      data: {
        type: 'xp_milestone',
        level: data.level,
        xpAmount: data.xpAmount
      }
    }
  };

  return payloads[type] || {
    title: 'SkillBridge Notification',
    body: 'You have a new notification',
    data: { type: 'general' }
  };
};

module.exports = {
  sendPushNotification,
  sendBulkPushNotification,
  sendTopicPushNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationToRole,
  createNotificationPayload
};
