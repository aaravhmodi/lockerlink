# LockerLink MVP 2.0

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

2. Create `.env.local` file in the root directory with your Firebase config:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
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
│   ├── home/              # Home feed page
│   ├── explore/           # Explore players & posts
│   ├── messages/          # Messaging pages
│   └── profile/           # Profile pages
├── components/            # React components
│   ├── Navbar.tsx
│   ├── FeedCard.tsx
│   ├── ChatList.tsx
│   ├── ChatWindow.tsx
│   └── ProfileForm.tsx
├── lib/                   # Utilities
│   └── firebase.ts        # Firebase configuration
└── hooks/                 # Custom React hooks
    └── useUser.ts
```

## 🔥 Firebase Setup

### 1. Enable Firebase Services

In your Firebase Console, enable:
- **Authentication** → Email/Password + Google Sign-In
- **Firestore Database** → Start in test mode (then update rules)
- **Storage** → For image uploads

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

- ✅ User authentication (Email/Password + Google)
- ✅ User profiles with team, position, bio
- ✅ Social feed (create posts with images)
- ✅ Explore players and posts
- ✅ Real-time 1:1 messaging
- ✅ Profile management

## 📝 Firestore Collections

- `users` - Player profiles
- `posts` - Feed posts
- `chats` - Chat thread metadata
- `messages` - Individual chat messages

## 🚢 Deployment

Deploy to Vercel (free):

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 🔜 Next Steps

- [ ] Weekly match-making automation
- [ ] Coach profiles & office hours
- [ ] Push notifications
- [ ] Post likes & comments
- [ ] Tournament integration
