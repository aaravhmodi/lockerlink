"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trophy, Star, TrendingUp, MessageCircle, Play, Heart, AlertCircle } from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  name: string;
  username?: string;
  photoURL?: string;
  points: number;
  rank: number;
}

export default function PointsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userType, setUserType] = useState<"athlete" | "coach" | "admin" | "mentor" | "">("");
  const [hasHighlight, setHasHighlight] = useState(false);
  const [checkingHighlight, setCheckingHighlight] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (userLoading) {
      return;
    }

    // Only redirect if loading is complete and there's no user
    if (!user) {
      router.push("/");
      return;
    }
    // Allow access to points page regardless of profile completion
    loadLeaderboard();
    loadUserPoints();
    checkUserProfile();
  }, [user, userLoading, router]);

  const checkUserProfile = async () => {
    if (!user) return;
    
    setCheckingHighlight(true);
    try {
      // Get user profile data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userTypeData = (data.userType as "athlete" | "coach" | "admin" | "mentor") || "";
        setUserType(userTypeData);
        
        // Check if user is athlete or mentor (they need highlights)
        const needsHighlight = userTypeData === "athlete" || userTypeData === "mentor";
        
        if (needsHighlight) {
          // Check highlights collection for this user
          const highlightsQuery = query(
            collection(db, "highlights"),
            where("userId", "==", user.uid),
            limit(1)
          );
          const highlightsSnapshot = await getDocs(highlightsQuery);
          setHasHighlight(!highlightsSnapshot.empty);
        } else {
          setHasHighlight(true); // Coaches and admins don't need highlights
        }
      }
    } catch (error) {
      console.error("Error checking user profile:", error);
      setHasHighlight(false);
    } finally {
      setCheckingHighlight(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        orderBy("points", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(usersQuery);
      const entries: LeaderboardEntry[] = snapshot.docs
        .map((docSnap, index) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Unknown",
            username: data.username || "",
            photoURL: data.photoURL || "",
            points: data.points || 0,
            rank: index + 1,
          };
        })
        .filter((entry) => entry.points > 0); // Only show users with points

      setLeaderboard(entries);

      // Find user's rank
      if (user) {
        const userEntry = entries.find((e) => e.id === user.uid);
        setUserRank(userEntry ? userEntry.rank : null);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPoints = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserPoints(data.points || 0);
      }
    } catch (error) {
      console.error("Error loading user points:", error);
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  // Show loading state while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4">
                <svg className="animate-spin h-8 w-8 text-[#3B82F6] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-[#64748B]">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-6 sm:pt-10">
        <BackButton fallback="/profile" className="mb-6" />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-2">Points System</h1>
          
          {user && (
            <div className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {/* Your Points */}
                <div className="rounded-3xl bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#38BDF8] px-6 py-5 text-white shadow-xl ring-2 ring-white/20 relative overflow-hidden flex flex-col items-center justify-center text-center">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-90 mb-1">
                    Your Points
                  </p>
                  <p className="text-5xl sm:text-6xl font-extrabold drop-shadow-sm">
                    {userPoints.toLocaleString()}
                  </p>
                  {userRank && (
                    <p className="text-base sm:text-lg font-semibold opacity-95 mt-1">
                      Rank #{userRank}
                    </p>
                  )}
                </div>
                
                {/* Top 3 Preview */}
                {topThree.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#F59E0B]" />
                        <p className="text-sm font-semibold text-[#0F172A]">Top 3</p>
                      </div>
                      <Link href="#leaderboard" className="text-xs text-[#3B82F6] font-medium hover:underline">
                        View all
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {topThree.map((entry) => (
                        <Link key={entry.id} href={`/profile/${entry.id}`}>
                          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                            <div className="w-8 text-center">
                              <span className="text-base">{getRankEmoji(entry.rank)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#0F172A] truncate">{entry.name}</p>
                              <p className="text-xs text-[#64748B] truncate">{entry.points.toLocaleString()} pts</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 mb-8 shadow-sm"
        >
          <h2 className="text-2xl font-semibold text-[#0F172A] mb-4">About the Points System</h2>
          <div className="space-y-4 text-[#475569]">
            <p>
              Earn points by engaging with the LockerLink community! Points reset daily at midnight EST, so stay active to climb the leaderboard.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                🎁 The top three on the leaderboard will receive <span className="font-bold text-base">PRIZES</span> worth up to <span className="font-extrabold text-xl text-amber-900">$250</span>.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-lg text-[#0F172A]">🎁 Possible Prizes</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>
                  <span className="font-semibold">Mikasa V200W Official Game Ball</span> <span className="font-extrabold text-base text-amber-700">($120–$150)</span> — Olympic and VNL game ball; premium, pro-level feel.
                </li>
                <li>
                  <span className="font-semibold">Mizuno Wave Momentum 2 or Asics Sky Elite Shoes</span> <span className="font-extrabold text-base text-amber-700">($160–$220)</span> — top-tier volleyball shoes for maximum performance.
                </li>
                <li>
                  <span className="font-semibold">Apple AirPods</span> <span className="font-extrabold text-base text-amber-700">($100–$200)</span> — everyday essential to lock in before games.
                </li>
              </ul>
              <p className="text-xs text-slate-500">Examples only; actual prizes may vary by availability.</p>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-[#0F172A]">Contest Rules</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>The points contest runs for one month.</li>
                <li>To be prize-eligible, you must recommend LockerLink to your friends.</li>
                <li>Prizes will be awarded only if the platform reaches at least 50 total highlights and at least 50 users appear on the points leaderboard during the contest period.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-[#0F172A]">Ways to Earn Points:</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Post Highlights</p>
                    <p className="text-sm">+10 points per highlight (max 2 per day)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Like Videos</p>
                    <p className="text-sm">+2 points per like (unlimited daily)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Comment on Videos</p>
                    <p className="text-sm">+5 points per comment (max 5 per day, minimum 15 characters)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="font-semibold text-[#0F172A]">Earn Points from Others:</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Get Liked</p>
                    <p className="text-sm">+2 points for each like on your highlights (unlimited)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#0F172A]">Get Commented</p>
                    <p className="text-sm">+5 points for each comment on your highlights (unlimited)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                <strong>Note:</strong> Points are deducted when you delete highlights, unlike videos, or delete comments. Daily limits reset at midnight EST.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
          id="leaderboard"
        >
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-[#F59E0B]" />
            <h2 className="text-2xl font-semibold text-[#0F172A]">Leaderboard</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-[#64748B]">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-[#64748B]">No users with points yet. Be the first!</div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {topThree.map((entry, index) => (
                    <Link key={entry.id} href={`/profile/${entry.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                          entry.rank === 1
                            ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 order-2 sm:order-1 hover:shadow-lg hover:border-yellow-400"
                            : entry.rank === 2
                              ? "border-slate-300 bg-gradient-to-br from-slate-50 to-gray-50 order-1 sm:order-2 hover:shadow-lg hover:border-slate-400"
                              : "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 order-3 sm:order-3 hover:shadow-lg hover:border-amber-400"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">{getRankEmoji(entry.rank)}</div>
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center overflow-hidden">
                            {entry.photoURL ? (
                              <Image
                                src={entry.photoURL}
                                alt={entry.name}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xl font-semibold">
                                {entry.name[0]?.toUpperCase() || "?"}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-[#0F172A] truncate">{entry.name}</p>
                          {entry.username && (
                            <p className="text-xs text-[#64748B] truncate">@{entry.username}</p>
                          )}
                          <p className="text-lg font-bold text-[#3B82F6] mt-2">
                            {entry.points.toLocaleString()} pts
                          </p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Rest of Leaderboard */}
              {restOfLeaderboard.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide mb-4">
                    All Rankings
                  </h3>
                  {restOfLeaderboard.map((entry, index) => (
                    <Link key={entry.id} href={`/profile/${entry.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index + 3) * 0.05 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer ${
                          entry.id === user?.uid
                            ? "border-[#3B82F6] bg-blue-50 hover:bg-blue-100 hover:shadow-md"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:shadow-md"
                        } transition-all`}
                      >
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className="font-semibold text-[#64748B]">#{entry.rank}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {entry.photoURL ? (
                            <Image
                              src={entry.photoURL}
                              alt={entry.name}
                              width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm font-semibold">
                            {entry.name[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0F172A] truncate">{entry.name}</p>
                        {entry.username && (
                          <p className="text-xs text-[#64748B] truncate">@{entry.username}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <p className="font-bold text-[#3B82F6]">{entry.points.toLocaleString()} pts</p>
                      </div>
                    </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
