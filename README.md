# LockerLink 

A social messaging app for OVA volleyball players built with Next.js, Firebase, and Tailwind CSS.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project created
- `.env.local` file with Firebase config (see below)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file in the root directory with your configuration:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# EmailJS Configuration (for welcome emails)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key

# Cloudinary Configuration (for media uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
/lockerlink
├── app/                    # Next.js App Router pages
│   ├── home/              # Home feed page with highlights challenge
│   ├── explore/           # Explore players & posts
│   ├── highlights/        # Highlights challenge page
│   ├── messages/          # Messaging pages
│   ├── profile/           # Profile pages
│   │   └── points/        # Points system & leaderboard
│   └── role/              # Role selection page
├── components/            # React components
│   ├── Navbar.tsx
│   ├── FeedCard.tsx
│   ├── ChatList.tsx
│   ├── ChatWindow.tsx
│   ├── ProfileForm.tsx
│   └── ProfileGuard.tsx   # Profile completion guard
├── hooks/                 # Custom React hooks
│   ├── useUser.ts         # User authentication & welcome email
│   └── useProfileComplete.ts
├── lib/                   # Utilities
│   └── firebase.ts        # Firebase configuration
└── utils/                 # Utility functions
    ├── sendEmail.ts       # EmailJS welcome email service
    ├── pointsSystem.ts    # Points calculation & management
    ├── uploadToCloudinary.ts  # Cloudinary media upload
    └── formatMetrics.ts   # Metrics formatting utilities
```

## 🔥 Firebase Setup

### 1. Enable Firebase Services

In your Firebase Console, enable:
- **Authentication** → Email/Password + Google Sign-In
- **Firestore Database** → Start in test mode (then update rules)
- **Storage** → For image uploads

### 1.5. Configure Authorized Domains (IMPORTANT)

To prevent "missing initial state" errors, add your domains to Firebase:

1. Go to **Firebase Console → Authentication → Settings → Authorized Domains**
2. Click **Add Domain** and add:
   - `localhost` (already added by default)
   - `your-app.vercel.app` (your Vercel deployment URL)
   - Your custom domain (if applicable)

This ensures Google Sign-In works on all your deployment domains.

### 2. Firestore Security Rules

Update your Firestore rules in Firebase Console:

```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    match /posts/{postId} {
      allow read, write: if request.auth.uid != null;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth.uid in resource.data.participants;
    }
    
    match /messages/{messageId} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

### 3. Storage Rules

Update your Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    match /posts/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## 🎯 Core Features

### Authentication & User Management
- ✅ User authentication (Email/Password + Google Sign-In)
- ✅ Role-based access control (Athlete, Mentor, Coach, Admin)
- ✅ Profile completion guard system
- ✅ User type switching with data cleanup
- ✅ Welcome email automation via EmailJS

### Social Features
- ✅ Social feed with posts, images, and videos
- ✅ Post likes, comments, and engagement
- ✅ Explore players, teams, and positions
- ✅ Real-time 1:1 messaging
- ✅ User search functionality
- ✅ Profile viewing with role tags

### Highlights & Challenges
- ✅ Best Spike Challenge with upvote-based ranking
- ✅ Highlight video uploads with Cloudinary
- ✅ Challenge leaderboard (top 3 ranked)
- ✅ Real-time challenge entry tracking
- ✅ Highlight comments and likes

### Points System
- ✅ Engagement-based points system
- ✅ Daily limits with EST midnight reset:
  - Liking videos: 2 points (unlimited)
  - Commenting: 5 points (max 5/day, min 15 chars)
  - Posting highlights: 10 points (max 2/day)
- ✅ Creator rewards (points for likes/comments on your content)
- ✅ Points leaderboard with rankings
- ✅ Clickable points tile with detailed stats page

### Profile Features
- ✅ Comprehensive athlete profiles (stats, metrics, bio)
- ✅ Coach profiles (team, region, division, age group)
- ✅ Profile editing and management
- ✅ Post management (create, view, delete)
- ✅ Highlights gallery
- ✅ Points display and tracking

### Media Management
- ✅ Cloudinary integration for image/video uploads
- ✅ Video thumbnails auto-generation
- ✅ Profile photo uploads
- ✅ Post media attachments

## 📧 EmailJS Integration

LockerLink uses EmailJS to automatically send welcome emails to new users on their first signup.

### Setup

1. Create an account at [EmailJS](https://www.emailjs.com/)
2. Create an email service (Gmail, SendGrid, etc.)
3. Create an email template with:
   - Variable: `{{email}}` for user's email address
   - Links to Discord server and feedback form
4. Add your EmailJS credentials to `.env.local`:
   ```bash
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
   ```

### How It Works

- Automatically triggered on first user signup (when `creationTime === lastSignInTime`)
- Prevents duplicate sends with Firestore flag (`welcomeEmailSent`)
- Session-level protection to prevent rapid duplicate sends
- Uses Apple-style minimalistic email template

### Email Template Variables

- `{{email}}` - User's email address

## 📝 Firestore Collections

- `users` - User profiles with role, stats, points, and welcome email flag
- `posts` - Feed posts with images/videos
- `highlights` - Challenge highlight submissions with upvotes
- `chats` - Chat thread metadata
- `messages` - Individual chat messages
- `comments` - Comments on posts (subcollections)
- `highlightComments` - Comments on highlights (subcollections)

## 🚢 Deployment

LockerLink is deployed on **Vercel** with integrated services:

### Deployment Stack
- **Frontend & Backend**: Next.js deployed on Vercel
- **Database & Auth**: Firebase (Firestore, Authentication) hosted on Google Cloud
- **Media Storage**: Cloudinary for image/video uploads and transformations
- **Email Service**: EmailJS for transactional emails

### Deployment Steps

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add all environment variables in Vercel:
   - Firebase configuration
   - EmailJS credentials
   - Cloudinary credentials
4. Configure Firebase Authorized Domains with your Vercel URL
5. Deploy!

### Environment Variables for Production

Make sure to add all variables from `.env.local` to Vercel's environment variables section. The app will automatically use these in production.

### Firebase Deployment

Firebase services (Firestore, Authentication, Storage) are automatically deployed and managed through Firebase Console. Security rules are defined in `firestore.rules` and `storage.rules`.

### Cloudinary Setup

1. Create a Cloudinary account
2. Configure upload presets for unsigned uploads
3. Add cloud name and preset to environment variables
4. Media is automatically optimized and delivered via CDN

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Cloudinary (media) + Firebase Storage (optional)
- **Email**: EmailJS
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## 🔜 Future Enhancements

- [ ] Weekly match-making automation
- [ ] Push notifications
- [ ] Advanced tournament integration
- [ ] Video streaming optimization
- [ ] Social sharing features
- [ ] Mobile app (React Native)
