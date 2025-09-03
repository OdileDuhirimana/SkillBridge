export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'employer' | 'admin';
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  resume?: Resume;
  portfolio: Portfolio[];
  preferences: UserPreferences;
  stats: UserStats;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: number;
  description?: string;
}

export interface Resume {
  url: string;
  filename: string;
  uploadedAt: string;
}

export interface Portfolio {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  technologies: string[];
  featured: boolean;
}

export interface UserPreferences {
  jobTypes: string[];
  remote: boolean;
  salaryRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  industries: string[];
  locations: string[];
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface UserStats {
  profileViews: number;
  applicationsSent: number;
  interviewsScheduled: number;
  jobsLanded: number;
  xp: number;
  level: number;
  badges: Badge[];
}

export interface Badge {
  name: string;
  description: string;
  earnedAt: string;
  icon: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  industry: string;
  size: string;
  founded?: number;
  headquarters: Location;
  locations: Location[];
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  benefits: Benefit[];
  culture: {
    values: string[];
    mission?: string;
    vision?: string;
    workEnvironment?: string;
  };
  stats: CompanyStats;
  isVerified: boolean;
  isActive: boolean;
  owner: string;
  team: TeamMember[];
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  createdAt: string;
}

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  type?: 'headquarters' | 'office' | 'remote';
}

export interface Benefit {
  name: string;
  description?: string;
  category: 'health' | 'financial' | 'work-life' | 'professional' | 'other';
}

export interface TeamMember {
  user: string;
  role: string;
  permissions: string[];
  addedAt: string;
}

export interface Review {
  user: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  workLifeBalance?: number;
  compensation?: number;
  management?: number;
  culture?: number;
  isVerified: boolean;
  helpful: number;
  createdAt: string;
}

export interface CompanyStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  profileViews: number;
  followers: number;
}

export interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  requirements: string;
  responsibilities: string;
  company: Company;
  category: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance' | 'temporary';
  level: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  location: JobLocation;
  salary?: Salary;
  benefits: Benefit[];
  skills: JobSkill[];
  experience: {
    min: number;
    max?: number;
  };
  education: {
    required: string;
    preferred: string;
  };
  languages: Language[];
  applicationDeadline?: string;
  startDate?: string;
  duration?: string;
  status: 'draft' | 'active' | 'paused' | 'closed' | 'filled';
  isRemote: boolean;
  isUrgent: boolean;
  isFeatured: boolean;
  tags: string[];
  stats: JobStats;
  postedBy: string;
  hiringManager?: string;
  applicationProcess: {
    steps: ProcessStep[];
    requirements: string[];
  };
  questions: Question[];
  aiAnalysis?: AIAnalysis;
  createdAt: string;
}

export interface JobLocation {
  type: 'remote' | 'on-site' | 'hybrid';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Salary {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
  negotiable: boolean;
}

export interface JobSkill {
  name: string;
  level: 'required' | 'preferred' | 'nice-to-have';
  years?: number;
}

export interface Language {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'native';
}

export interface JobStats {
  views: number;
  applications: number;
  saves: number;
  shares: number;
}

export interface ProcessStep {
  name: string;
  description?: string;
  order: number;
  estimatedDays?: number;
}

export interface Question {
  question: string;
  type: 'text' | 'multiple-choice' | 'yes-no' | 'file';
  options?: string[];
  required: boolean;
}

export interface AIAnalysis {
  skillMatchScore: number;
  experienceMatchScore: number;
  educationMatchScore: number;
  overallMatchScore: number;
  missingSkills: string[];
  recommendations: string[];
  analyzedAt: string;
}

export interface Application {
  id: string;
  job: Job;
  applicant: User;
  company: Company;
  status: ApplicationStatus;
  coverLetter?: string;
  resume?: Resume;
  portfolio?: {
    url: string;
    description?: string;
  };
  answers: Answer[];
  additionalDocuments: Document[];
  notes: Note[];
  timeline: TimelineEvent[];
  interview?: Interview;
  offer?: Offer;
  aiAnalysis?: AIAnalysis;
  source: string;
  referral?: {
    referrer: string;
    referralCode?: string;
  };
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
}

export type ApplicationStatus = 
  | 'applied'
  | 'under-review'
  | 'shortlisted'
  | 'interview-scheduled'
  | 'interview-completed'
  | 'offer-extended'
  | 'offer-accepted'
  | 'offer-declined'
  | 'rejected'
  | 'withdrawn';

export interface Answer {
  question: string;
  answer: string;
  type: string;
}

export interface Document {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

export interface Note {
  author: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  status: string;
  message?: string;
  changedBy: string;
  changedAt: string;
  metadata?: {
    interviewDate?: string;
    interviewType?: string;
    location?: string;
    notes?: string;
  };
}

export interface Interview {
  scheduledDate: string;
  interviewType: 'phone' | 'video' | 'in-person' | 'technical' | 'panel' | 'hr';
  location?: string;
  meetingLink?: string;
  interviewer?: string;
  duration?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  feedback?: {
    rating?: number;
    comments?: string;
    strengths?: string[];
    areasForImprovement?: string[];
    recommendation?: 'hire' | 'no-hire' | 'maybe' | 'strong-hire';
  };
}

export interface Offer {
  salary: {
    amount: number;
    currency: string;
    period: string;
  };
  benefits: string[];
  startDate: string;
  endDate?: string;
  terms?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: string;
  responseDeadline?: string;
}

export interface Chat {
  id: string;
  participants: ChatParticipant[];
  type: 'direct' | 'group' | 'application';
  application?: string;
  job?: Job;
  company?: Company;
  title?: string;
  description?: string;
  messages: Message[];
  lastMessage?: Message;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  settings: ChatSettings;
  metadata: ChatMetadata;
  createdAt: string;
}

export interface ChatParticipant {
  user: string;
  role: 'applicant' | 'recruiter' | 'admin';
  joinedAt: string;
  lastSeen?: string;
  isActive: boolean;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: Attachment[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  readBy: ReadReceipt[];
  reactions: Reaction[];
  replyTo?: string;
  createdAt: string;
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ReadReceipt {
  user: string;
  readAt: string;
}

export interface Reaction {
  user: string;
  emoji: string;
  addedAt: string;
}

export interface ChatSettings {
  allowFileSharing: boolean;
  allowReactions: boolean;
  muteNotifications: MuteNotification[];
}

export interface MuteNotification {
  user: string;
  mutedAt: string;
}

export interface ChatMetadata {
  totalMessages: number;
  unreadCount: number;
}

export interface Notification {
  id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  isRead: boolean;
  readAt?: string;
  isPushed: boolean;
  pushedAt?: string;
  isEmailed: boolean;
  emailedAt?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: string;
  isActive: boolean;
  actionUrl?: string;
  actionText?: string;
  image?: string;
  icon?: string;
  color?: string;
  tags: string[];
  metadata: NotificationMetadata;
  createdAt: string;
}

export type NotificationType = 
  | 'job_match'
  | 'application_update'
  | 'interview_scheduled'
  | 'message_received'
  | 'application_received'
  | 'job_posted'
  | 'profile_viewed'
  | 'connection_request'
  | 'skill_endorsement'
  | 'badge_earned'
  | 'xp_milestone'
  | 'reminder'
  | 'system';

export interface NotificationData {
  jobId?: string;
  applicationId?: string;
  companyId?: string;
  chatId?: string;
  userId?: string;
  interviewDate?: string;
  interviewType?: string;
  location?: string;
  meetingLink?: string;
  badgeName?: string;
  badgeIcon?: string;
  xpAmount?: number;
  level?: number;
  customData?: any;
}

export interface NotificationMetadata {
  source: 'system' | 'user' | 'company' | 'ai' | 'automated';
  campaign?: string;
  template?: string;
  version?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginationResponse<T> {
  success: boolean;
  count: number;
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
  data: T[];
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'student' | 'employer';
}

export interface SocketContextType {
  socket: any;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (data: SendMessageData) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  addReaction: (data: ReactionData) => void;
  markMessagesRead: (chatId: string, messageIds: string[]) => void;
}

export interface SendMessageData {
  chatId: string;
  content: string;
  type?: string;
  attachments?: Attachment[];
  replyTo?: string;
}

export interface ReactionData {
  chatId: string;
  messageId: string;
  emoji: string;
}
