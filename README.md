# 🔄 Loop Level - Advanced Habit Tracker

[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/theIndrajeet/LoopIn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-purple)](https://web.dev/progressive-web-apps/)

> **Build streaks, compete with friends, level up your habits** 🚀

Loop Level is a production-ready, enterprise-grade habit tracking application with real-time features, social capabilities, and comprehensive analytics. Built with modern web technologies and optimized for performance, security, and user experience.

## ✨ Features

### 🎯 Core Functionality
- **Habit Tracking** - Create, manage, and track daily habits with streaks
- **Task Management** - Organize tasks with priorities, due dates, and subtasks
- **Progress Analytics** - Comprehensive insights with charts and statistics
- **XP & Leveling** - Gamification system with experience points and levels

### 👥 Social Features
- **Friends System** - Connect with friends and see their progress
- **Leaderboards** - Compete on global and friends-only leaderboards
- **Activity Feed** - Real-time social activity updates
- **Friend Invitations** - Invite friends via email or shareable links

### 🤖 AI & Automation
- **AI Assistant** - Powered by Google Gemini for habit suggestions and guidance
- **Smart Suggestions** - AI-powered habit recommendations based on user behavior
- **Automated Notifications** - Intelligent push notifications for habit reminders

### 📱 Modern Experience
- **Progressive Web App (PWA)** - Install on any device, works offline
- **Real-time Updates** - Live data synchronization across devices
- **Dark Mode** - Beautiful dark theme with smooth transitions
- **Mobile Optimized** - Touch-friendly interface with gesture support
- **Accessibility** - WCAG 2.1 AA compliant with screen reader support

### 🔒 Enterprise Security
- **Rate Limiting** - Protection against abuse and spam
- **Input Validation** - Comprehensive XSS and injection protection
- **Audit Logging** - Complete security event tracking
- **Error Monitoring** - Advanced error tracking and reporting
- **Data Encryption** - Secure data handling and storage

### ⚡ Performance
- **Optimized Caching** - Smart caching with TTL and stale-while-revalidate
- **Database Optimization** - Materialized views, indexes, and query optimization
- **Bundle Optimization** - Code splitting and lazy loading
- **Performance Monitoring** - Web Vitals tracking and metrics

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations and transitions

### Backend
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Robust relational database with advanced features
- **Edge Functions** - Serverless functions for custom logic
- **Real-time** - WebSocket-based live updates
- **Row Level Security (RLS)** - Database-level security policies

### Additional Tools
- **Workbox** - Service worker and PWA optimization
- **Zod** - Runtime type validation
- **DOMPurify** - XSS protection and HTML sanitization
- **Web Push** - Browser push notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Gemini API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theIndrajeet/LoopIn.git
   cd LoopIn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase and API credentials:
   ```env
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   VAPID_SUBJECT=mailto:your_email@example.com
   ```

4. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Link to your project
   supabase link --project-ref your_project_id
   
   # Apply migrations
   supabase db push
   
   # Deploy edge functions
   supabase functions deploy
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users & Profiles** - User management with customizable profiles
- **Habits & Tasks** - Core functionality with scheduling and tracking
- **Streaks & Logs** - Progress tracking and streak management
- **Social Features** - Friends, notifications, and activity feeds
- **Analytics** - Materialized views for performance insights
- **Security** - Audit logs and security event tracking

## 🔧 Configuration

### Push Notifications
Configure VAPID keys for web push notifications:
```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

### AI Features
Set up Google Gemini API for AI assistant:
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to environment variables
3. Configure rate limits in edge functions

### Admin Features
Admin panel access is configured via email in the database:
- Update `profiles` table with admin email
- Admin features include broadcast notifications and user management

## 📱 PWA Features

Loop Level is a full Progressive Web App with:
- **Offline Support** - Works without internet connection
- **Install Prompts** - Add to home screen on mobile/desktop
- **Background Sync** - Sync data when connection returns
- **Push Notifications** - Native-like notification experience

## 🔒 Security Features

### Input Validation
- Zod schemas for all user inputs
- DOMPurify for XSS protection
- SQL injection prevention
- File upload validation

### Rate Limiting
- Per-user action limits
- IP-based rate limiting
- Exponential backoff
- Automatic blocking for abuse

### Audit Logging
- All user actions logged
- Security event tracking
- Suspicious activity detection
- Admin audit trail

## 📈 Performance Optimizations

### Caching Strategy
- Browser caching with service workers
- Database query caching
- API response caching
- Stale-while-revalidate patterns

### Database Optimization
- Materialized views for analytics
- Strategic indexing
- Query optimization
- Connection pooling

### Bundle Optimization
- Code splitting by routes
- Lazy loading of components
- Tree shaking
- Asset optimization

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📦 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Netlify
```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
```

### Docker
```bash
# Build image
docker build -t loop-level .

# Run container
docker run -p 3000:3000 loop-level
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Backend infrastructure
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Google Gemini](https://ai.google.dev/) - AI capabilities

## 📞 Support

For support, email support@looplevel.app or join our [Discord community](https://discord.gg/looplevel).

---

**Built with ❤️ by the Loop Level team**

*Making habit formation social, engaging, and effective* 🚀