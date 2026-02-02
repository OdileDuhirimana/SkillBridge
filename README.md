# SkillBridge - AI-Powered Job & Internship Ecosystem

A comprehensive career platform that connects students, graduates, and employers through intelligent matching, real-time communication, and AI-powered career guidance.

Deployment reference:
- `docs/deployment.md` (Render backend + Vercel frontend)

## 🚀 Features

### Core Functionality
- **Smart Job Discovery**: AI-powered job recommendations based on skills and preferences
- **AI Career Mentor**: Personalized career advice and skill recommendations
- **Resume Analysis**: AI-powered resume optimization and feedback
- **Real-time Chat**: Direct communication between job seekers and employers
- **Application Tracking**: Complete application lifecycle management
- **Company Insights**: Detailed company profiles with culture and benefits
- **Career Analytics**: Progress tracking and insights dashboard
- **Push Notifications**: Real-time updates via Firebase Cloud Messaging

### Advanced Features
- **Gamification**: XP system, badges, and leaderboards
- **Skill Matching**: Advanced algorithm for job-skill compatibility
- **Interview Scheduling**: Integrated calendar and video calling
- **Portfolio Management**: Showcase projects and achievements
- **Community Forums**: Industry-specific discussions and mentorship
- **Analytics Dashboard**: Comprehensive insights for users and employers

## 🛠 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** authentication
- **Cloudinary** for file storage
- **Firebase** for push notifications
- **OpenAI API** for AI features

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Router** for navigation
- **React Hook Form** for form handling
- **TanStack Query** for data fetching
- **Socket.io Client** for real-time features

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy
- **Redis** for caching
- **MongoDB** database
- **Cloudinary** for media storage

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.0+
- Docker (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/skillbridge.git
cd skillbridge
```

### 2. Install Dependencies
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

Required environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/skillbridge

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Database Setup
```bash
# Start MongoDB
mongod

# Seed the database
npm run seed
```

### 5. Start Development Servers
```bash
# Start both server and client
npm run dev

# Or start individually
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build
```bash
# Build the image
docker build -t skillbridge .

# Run the container
docker run -p 5000:5000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/skillbridge \
  -e JWT_SECRET=your_secret \
  skillbridge
```

## 📁 Project Structure

```
skillbridge/
├── server/                 # Backend API
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── socket/            # Socket.io handlers
│   └── scripts/           # Database scripts
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React contexts
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── docker-compose.yml     # Docker services
├── Dockerfile            # Docker configuration
├── nginx.conf           # Nginx configuration
└── README.md            # This file
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-password` - Update password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### User Endpoints
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/avatar` - Upload avatar
- `POST /api/users/:id/resume` - Upload resume
- `POST /api/users/:id/skills` - Add skill
- `DELETE /api/users/:id` - Delete user

### Job Endpoints
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create job (employer)
- `PUT /api/jobs/:id` - Update job (employer)
- `DELETE /api/jobs/:id` - Delete job (employer)
- `GET /api/jobs/trending` - Get trending jobs
- `GET /api/jobs/company/:companyId` - Get jobs by company

### Company Endpoints
- `GET /api/companies` - Get all companies
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create company (employer)
- `PUT /api/companies/:id` - Update company (employer)
- `POST /api/companies/:id/logo` - Upload logo
- `POST /api/companies/:id/team` - Add team member
- `POST /api/companies/:id/reviews` - Add review

### Application Endpoints
- `GET /api/applications` - Get applications
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Create application
- `PUT /api/applications/:id/status` - Update status (employer)
- `POST /api/applications/:id/notes` - Add note (employer)
- `POST /api/applications/:id/interview` - Schedule interview
- `PUT /api/applications/:id/withdraw` - Withdraw application

### Chat Endpoints
- `GET /api/chats` - Get user chats
- `GET /api/chats/:id` - Get chat by ID
- `POST /api/chats` - Create chat
- `POST /api/chats/:id/messages` - Send message
- `PUT /api/chats/:id/read` - Mark as read
- `POST /api/chats/:id/messages/:messageId/reactions` - Add reaction

### AI Endpoints
- `POST /api/ai/analyze-resume` - Analyze resume
- `POST /api/ai/job-recommendations` - Get job recommendations
- `POST /api/ai/analyze-application` - Analyze application match
- `POST /api/ai/generate-cover-letter` - Generate cover letter
- `GET /api/ai/career-insights` - Get career insights

### Analytics Endpoints
- `GET /api/analytics/user` - User analytics
- `GET /api/analytics/company` - Company analytics
- `GET /api/analytics/platform` - Platform analytics (admin)

### Notification Endpoints
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/:id` - Get notification by ID
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet Security**: Security headers middleware
- **File Upload Security**: Secure file upload handling
- **SQL Injection Protection**: MongoDB query sanitization

## 🧪 Testing

```bash
# Run server tests
npm test

# Run client tests
cd client
npm test

# Run with coverage
npm run test:coverage
```

## 📊 Performance Optimization

- **Database Indexing**: Optimized MongoDB indexes
- **Caching**: Redis caching for frequently accessed data
- **Image Optimization**: Cloudinary image optimization
- **Code Splitting**: React code splitting for faster loading
- **Lazy Loading**: Component lazy loading
- **CDN**: Content delivery network for static assets

## 🚀 Deployment

### Production Deployment
1. Set up production environment variables
2. Configure SSL certificates
3. Set up MongoDB cluster
4. Configure Redis cluster
5. Deploy using Docker Compose
6. Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-cluster-url/skillbridge
REDIS_URL=redis://your-redis-url:6379
JWT_SECRET=your-production-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
FIREBASE_PROJECT_ID=your-firebase-project
OPENAI_API_KEY=your-openai-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@skillbridge.com or join our Slack channel.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database services
- Cloudinary for media management
- Firebase for push notifications
- The open-source community for amazing tools and libraries

---

**SkillBridge** - Empowering careers through intelligent technology 🚀
