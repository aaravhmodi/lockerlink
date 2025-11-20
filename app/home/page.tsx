"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, getDocs, doc, getDoc, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Upload, Flame, Star, TrendingUp, MessageCircle, ArrowRight, Sparkles, Play, Users, Zap, Heart, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import FeedCard from "@/components/FeedCard";
import PostComposer from "@/components/PostComposer";
import ManagePostsModal from "@/components/ManagePostsModal";
import { formatTimeAgo } from "@/utils/formatTime";

interface UserProfile {
  name: string;
  username?: string;
  photoURL?: string;
  userType?: "athlete" | "coach" | "admin" | "mentor";
  adminRole?: "parent" | "clubAdmin" | "";
}

interface Match {
  id: string;
  matchedUserId: string;
  matchedUser?: {
    name: string;
    username?: string;
    photoURL?: string;
    position?: string;
  };
}

interface Highlight {
  id: string;
  userId?: string;
  userName?: string;
  userPosition?: string;
  userType?: "athlete" | "coach" | "admin" | "mentor";
  adminRole?: "parent" | "clubAdmin" | "";
  title: string;
  upvotes: number;
  rank: number;
  thumbnailURL?: string;
  commentsCount?: number;
  createdAt?: number;
}

interface Challenge {
  title: string;
  endDate: number;
  entries: number;
}

interface SearchUser {
  id: string;
  name: string;
  username?: string;
  team?: string;
  position?: string;
  photoURL?: string;
  city?: string;
  latestPostText?: string | null;
  latestPostCreatedAt?: number | null;
}

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  videoURL?: string;
  thumbnailURL?: string;
  mediaType?: "image" | "video" | null;
  createdAt: number;
}

export default function HomePage() {
  const { user } = useUser();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [topHighlights, setTopHighlights] = useState<Highlight[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showManagePosts, setShowManagePosts] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          } as Post;
        });
        setPosts(postsData);
        setPostsLoading(false);
      },
      (error) => {
        console.error("Error loading home feed:", error);
        setPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);


  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          name: data.name || "Player",
          username: data.username,
          photoURL: data.photoURL,
          userType: (data.userType as "athlete" | "coach" | "admin" | "mentor") || "athlete",
          adminRole: (data.adminRole as "parent" | "clubAdmin" | "") || "",
        });
      }

      // Load challenge entries count
      const challengeEntriesQuery = query(
        collection(db, "highlights"),
        where("submittedToChallenge", "==", true)
      );
      const challengeEntriesSnapshot = await getDocs(challengeEntriesQuery);
      const challengeEntriesCount = challengeEntriesSnapshot.size;

      setCurrentChallenge({
        title: "Best Spike Challenge 🔥",
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days
        entries: challengeEntriesCount,
      });

      // Load top highlights from Firestore
      const highlightsQuery = query(
        collection(db, "highlights"),
        orderBy("upvotes", "desc"),
        limit(3)
      );
      const highlightsSnapshot = await getDocs(highlightsQuery);
      const highlightsDataPromises = highlightsSnapshot.docs.map(async (docSnap, index) => {
        const data = docSnap.data() as any;
        // Fetch user type from user document
        let userType: "athlete" | "coach" | "admin" | "mentor" | undefined;
        let adminRole: "parent" | "clubAdmin" | "" | undefined;
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, "users", data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userType = userData.userType;
              adminRole = userData.adminRole;
            }
          } catch (error) {
            console.error("Error fetching user type:", error);
          }
        }
        return {
          id: docSnap.id,
          userId: data.userId || "",
          userName: data.userName || "Player",
          userPosition: data.userPosition || "",
          userType,
          adminRole,
          title: data.title || "Highlight",
          upvotes: data.upvotes || 0,
          commentsCount: data.commentsCount || 0,
          rank: index + 1,
          thumbnailURL: data.thumbnailURL || "",
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        } as Highlight;
      });
      const highlightsData = await Promise.all(highlightsDataPromises);
      setTopHighlights(highlightsData);

      // Load current match (mock for now)
      setCurrentMatch(null);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      setShowSearch(true);

      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SearchUser[];

        const queryLower = searchQuery.toLowerCase().trim();
        const filtered = allUsers.filter(
          (u) =>
            u.username?.toLowerCase().includes(queryLower) ||
            u.name?.toLowerCase().includes(queryLower) ||
            u.team?.toLowerCase().includes(queryLower) ||
            u.position?.toLowerCase().includes(queryLower) ||
            u.city?.toLowerCase().includes(queryLower)
        );

        const limitedUsers = filtered.slice(0, 8);
        const enhancedUsers = await Promise.all(
          limitedUsers.map(async (u) => {
            try {
              const latestPostSnapshot = await getDocs(
                query(
                  collection(db, "posts"),
                  where("userId", "==", u.id),
                  orderBy("createdAt", "desc"),
                  limit(1)
                )
              );

              if (!latestPostSnapshot.empty) {
                const latestPostData = latestPostSnapshot.docs[0].data() as Post;
                const createdAt =
                  (latestPostData.createdAt as any)?.toMillis?.() ||
                  (typeof latestPostData.createdAt === "number" ? latestPostData.createdAt : null);

                return {
                  ...u,
                  latestPostText: latestPostData.text || (latestPostData.videoURL ? "Shared a new video" : null),
                  latestPostCreatedAt: createdAt,
                };
              }
            } catch (postError) {
              console.error("Error fetching latest post:", postError);
            }

            return {
              ...u,
              latestPostText: null,
              latestPostCreatedAt: null,
            };
          })
        );

        setSearchResults(enhancedUsers);
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);


  const formatTimeRemaining = (endDate: number): string => {
    const now = Date.now();
    const diff = endDate - now;
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return "Less than an hour left";
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-[#FACC15] to-[#F59E0B]';
    if (rank === 2) return 'from-slate-300 to-slate-400';
    if (rank === 3) return 'from-amber-600 to-amber-700';
    return 'from-slate-200 to-slate-300';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Flame className="w-4 h-4" />;
    if (rank === 2) return <Star className="w-4 h-4" />;
    if (rank === 3) return <Trophy className="w-4 h-4" />;
    return null;
  };

  if (loading) {
    return (
      <ProfileGuard>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
          <Navbar />
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Loading...</p>
            </div>
          </div>
        </div>
      </ProfileGuard>
    );
  }

  return (
    <ProfileGuard>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-0 pb-4 md:py-4 sm:py-8">
          {/* Points Promo - Top of page (Athletes only) */}
          {userProfile?.userType === "athlete" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mb-6"
            >
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-amber-800">🎁 Earn Points & PRIZES</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Interacting and using LockerLink can earn you points and PRIZES worth up to $250.
                  </p>
                </div>
                <Link
                  href="/profile/points"
                  className="inline-flex items-center gap-2 justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold px-4 py-2 shadow-lg ring-1 ring-amber-300/50 hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-200/60 active:translate-y-[1px] transition-all"
                >
                  <span>Learn more</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
          {/* About section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            {(() => {
              const isCoach = userProfile?.userType === "coach";
              const isAdmin = userProfile?.userType === "admin";
              const adminRole = userProfile?.adminRole;
              const isClubAdmin = isAdmin && adminRole === "clubAdmin";
              const isMentor = userProfile?.userType === "mentor";

              const persona = isCoach
                ? {
                    emoji: "🧢",
                  title: "Coach / Scout View",
                  intro: "Use LockerLink to scout talent, share knowledge, and support athlete growth.",
                    accent: "from-emerald-50 via-white to-amber-50",
                    bullets: [
                      {
                        label: "Set up your coach profile",
                        description: "Highlight your background, club, and age group so athletes know who’s leading them.",
                        icon: Users,
                      },
                      {
                        label: "Post advice & training",
                        description: "Share drills, practice plans, and feedback that help players level up between sessions.",
                        icon: Sparkles,
                      },
                      {
                        label: "View athlete highlights",
                        description: "Track player clips, monitor progress, and surface talent worth a closer look.",
                        icon: Play,
                      },
                      {
                        label: "Engage your community",
                        description: "React, comment, and leave shoutouts to motivate athletes and keep morale high.",
                        icon: MessageCircle,
                      },
                    ],
                    outro: "LockerLink makes it simple to mentor players, reinforce culture, and inspire the next generation.",
                  }
                : isAdmin
                ? isClubAdmin
                  ? {
                      emoji: "📋",
                      title: "Club Admin View",
                      intro: "Use LockerLink to oversee your players and support their volleyball experience.",
                      accent: "from-amber-50 via-white to-slate-100",
                      bullets: [
                        {
                          label: "View athlete & coach activity",
                          description: "Stay informed with access to shared highlights, posts, and updates across your club.",
                          icon: Users,
                        },
                        {
                          label: "Monitor progress safely",
                          description: "Follow each athlete’s growth through their profile stats, achievements, and highlights.",
                          icon: Sparkles,
                        },
                        {
                          label: "Keep communications transparent",
                          description: "Spot-check coach and athlete interactions to ensure conversations stay positive and compliant.",
                          icon: MessageCircle,
                        },
                        {
                          label: "Support development",
                          description: "Organize information, offer encouragement, and help coordinate training or events.",
                          icon: Trophy,
                        },
                      ],
                      outro:
                        "LockerLink gives club admins and parents a clear view of the volleyball community—keeping athletes supported, informed, and protected as they grow in the game.",
                    }
                  : {
                      emoji: "👟",
                      title: "Parent View",
                      intro: "Use LockerLink to stay close to your athlete’s journey and celebrate every milestone.",
                      accent: "from-amber-50 via-white to-slate-100",
                      bullets: [
                        {
                          label: "Follow their highlights",
                          description: "Watch new clips, match recaps, and training moments as soon as they’re posted.",
                          icon: Play,
                        },
                        {
                          label: "Stay informed",
                          description: "See team updates, coach posts, and community news so you always know what’s next.",
                          icon: Users,
                        },
                        {
                          label: "Cheer them on",
                          description: "Drop likes, comments, and supportive messages to keep their confidence high.",
                          icon: Heart,
                        },
                        {
                          label: "Keep things safe",
                          description: "LockerLink keeps communication transparent so you can trust the conversations happening around your athlete.",
                          icon: MessageCircle,
                        },
                      ],
                      outro:
                        "LockerLink helps parents stay connected, show support, and keep young players encouraged as they grow in the game.",
                    }
                : isMentor
                ? {
                    emoji: "🎓",
                    title: "Mentor View",
                    intro: "Use LockerLink to guide and inspire the next generation of volleyball players.",
                    accent: "from-indigo-50 via-white to-sky-100",
                    bullets: [
                      {
                        label: "Create your mentor profile",
                        description: "Share your volleyball background, school, and playing experience.",
                        icon: Users,
                      },
                      {
                        label: "Post insights and resources",
                        description: "Offer advice on training, mindset, or post-secondary opportunities.",
                        icon: Sparkles,
                      },
                      {
                        label: "View athlete highlights",
                        description: "Watch player clips and provide encouragement or constructive feedback.",
                        icon: Play,
                      },
                      {
                        label: "Engage with the community",
                        description: "Comment on posts, highlight strong performances, and share perspective from your own journey.",
                        icon: MessageCircle,
                      },
                    ],
                    outro:
                      "LockerLink gives mentors a space to stay connected with the sport, support developing athletes, and bridge the gap between youth and post-secondary volleyball.",
                  }
                : {
                    emoji: "🏐",
                    title: "Athlete View",
                    intro: "Use LockerLink to showcase your journey and connect with your volleyball community.",
                    accent: "from-indigo-50 via-white to-sky-100",
                    bullets: [
                      {
                        label: "Create your profile",
                        description: "Add your position, club, and story so coaches and teammates instantly know your game.",
                        icon: Users,
                      },
                      {
                        label: "Upload highlights",
                        description: "Drop quick clips and milestones to document your grind and track your growth.",
                        icon: Upload,
                      },
                      {
                        label: "Explore coaches & mentors",
                        description: "Find shared posts, resources, and opportunities tailored to your level.",
                        icon: Search,
                      },
                      {
                        label: "Engage & grow",
                        description: "Like, comment, and share wins with the LockerLink community to build your presence.",
                        icon: MessageCircle,
                      },
                    ],
                    outro: "LockerLink helps you build your volleyball identity, stay motivated, and connect with the people shaping the sport.",
                  };

              return (
                <div className={`rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 bg-gradient-to-br ${persona.accent}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl sm:text-3xl">{persona.emoji}</div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-[#0F172A]">{persona.title}</h2>
                      <p className="text-sm text-slate-600 leading-relaxed mt-1">{persona.intro}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {persona.bullets.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm border border-white/60"
                        >
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-5 text-sm text-slate-600 leading-relaxed">{persona.outro}</p>
                </div>
              );
            })()}
          </motion.div>

          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">
                Welcome back, {userProfile?.name || "Player"}
              </h1>
              <div className="w-10 h-10 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players, teams, or positions..."
                className="w-full pl-12 pr-10 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all text-[#0F172A]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearch(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Search Results */}
              <AnimatePresence>
                {showSearch && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto"
                  >
                    {searchResults.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery("");
                        }}
                      >
                        <div className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex-shrink-0">
                              {user.photoURL ? (
                                <Image
                                  src={user.photoURL}
                                  alt={user.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                                  {user.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-[#0F172A] truncate">{user.name}</div>
                              {user.username && (
                                <div className="text-xs text-slate-500 truncate">@{user.username}</div>
                              )}
                              {user.team && (
                                <div className="text-sm text-slate-600 truncate">{user.team}</div>
                              )}
                              {user.position && (
                                <div className="text-sm text-slate-500">{user.position}</div>
                              )}
                              {user.latestPostText && (
                                <div className="mt-1 text-xs text-slate-500 truncate">
                                  <span className="font-medium text-slate-600">Latest post:</span>{" "}
                                  {user.latestPostText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Action Cards - Match and Highlights - Only for Athletes */}
          {userProfile?.userType === "athlete" && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Highlights Challenge Card */}
              <Link href="/highlights">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl p-6 shadow-lg cursor-pointer h-full flex flex-col"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-3">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-white text-lg font-semibold mb-1">Highlight Challenge</h2>
                    <p className="text-white/90 text-sm">Submit your best plays.</p>
                  </div>
                </motion.div>
              </Link>

              {/* Find Players Card */}
              <Link href="/match">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-br from-[#F43F5E] to-[#E11D48] rounded-2xl p-6 shadow-lg cursor-pointer h-full flex flex-col"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-white text-lg font-semibold mb-1">Find Players</h2>
                    <p className="text-white/90 text-sm">Connect with teammates.</p>
                  </div>
                </motion.div>
              </Link>
            </div>
          )}

          {/* Latest Highlights Section */}
          {topHighlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[#0F172A] font-semibold text-lg mb-1">Show Your Best Clip</h2>
                  <p className="text-sm text-slate-600">Share your highlights and get noticed by coaches and teammates</p>
                </div>
                <Link href="/highlights" className="text-sm font-semibold text-[#3B82F6] hover:underline flex-shrink-0">
                  View all
                </Link>
                </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {topHighlights.slice(0, 3).map((highlight, index) => (
                  <motion.div
                    key={highlight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <Link
                      href={{
                        pathname: `/highlights/${highlight.id}`,
                        query: { returnUrl: "/home" },
                      }}
                    >
                      <div className="relative aspect-video bg-slate-100 overflow-hidden group">
                        {highlight.thumbnailURL ? (
                          <Image
                            src={highlight.thumbnailURL}
                            alt={highlight.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                            <Play className="w-12 h-12 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                            <Play className="w-6 h-6 text-[#3B82F6] ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white font-semibold">
                          {highlight.userName
                            ? highlight.userName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : "PL"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-[#0F172A]">
                              {highlight.userName || "Player"}
                            </h4>
                            {highlight.userType && (
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                                  highlight.userType === "athlete"
                                    ? "bg-blue-50 text-[#3B82F6]"
                                    : highlight.userType === "mentor"
                                    ? "bg-purple-50 text-purple-700"
                                    : highlight.userType === "coach"
                                    ? "bg-green-50 text-green-700"
                                    : highlight.userType === "admin"
                                    ? "bg-orange-50 text-orange-700"
                                    : "bg-slate-50 text-slate-700"
                                }`}
                              >
                                {highlight.userType === "admin"
                                  ? highlight.adminRole === "clubAdmin"
                                    ? "Club Admin"
                                    : "Parent/Guardian"
                                  : highlight.userType.charAt(0).toUpperCase() + highlight.userType.slice(1)}
                              </span>
                            )}
                          </div>
                          {highlight.userPosition && (
                            <p className="text-xs text-slate-500">{highlight.userPosition}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 flex-1">
                        <h3 className="text-sm font-semibold text-[#0F172A] leading-tight">
                          {highlight.title || "Highlight"}
                        </h3>
                        {highlight.createdAt && (
                          <p className="text-xs text-slate-400">{formatTimeAgo(highlight.createdAt)}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {highlight.upvotes ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {highlight.commentsCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          

          {/* Home Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="text-[#0F172A] font-semibold mb-4 text-lg">Latest from the community</h2>
            
            {/* Post Composer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              className="mb-6"
            >
              <PostComposer onOpenManage={() => setShowManagePosts(true)} />
            </motion.div>

            {postsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Loading feed...
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <FeedCard post={post} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Be the first to post an update today.
              </div>
            )}
          </motion.div>

          {/* Community Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            <Link href="https://discord.gg/YuPY8qBd" target="_blank" rel="noopener noreferrer">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex min-h-[120px] items-center justify-between gap-3 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 px-5 py-4 shadow-sm"
              >
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-[#1D4ED8]">Join the LockerLink Discord</h3>
                  <p className="text-xs sm:text-sm text-[#1E293B]">
                    Tap in for updates, share clips, and connect with the community.
                  </p>
                </div>
                <div className="hidden sm:flex items-center justify-center rounded-full bg-[#5865F2] text-white p-3 shadow">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            </Link>

            <Link href="https://tally.so/r/LZ1BDy" target="_blank" rel="noopener noreferrer">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex min-h-[120px] items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100 px-5 py-4 shadow-sm"
              >
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-[#92400E]">Drop Feedback</h3>
                  <p className="text-xs sm:text-sm text-[#B45309]">
                    Quick bubble to share what you love or want next in LockerLink.
                  </p>
                </div>
                <div className="hidden sm:flex items-center justify-center rounded-full bg-amber-400 text-white p-3 shadow">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>

      <ManagePostsModal open={showManagePosts} onClose={() => setShowManagePosts(false)} />
    </ProfileGuard>
  );
}
