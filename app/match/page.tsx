"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle, MapPin, Users, Settings, Check, X, User } from "lucide-react";

interface MatchPreferences {
  lookingForPosition?: string[];
  minAge?: number;
  maxAge?: number;
  preferredCity?: string;
  maxDistance?: number; // in km (optional, for future use)
  readyToMatch?: boolean;
}

interface UserData {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  age?: number;
  position?: string;
  team?: string;
  city?: string;
  bio?: string;
  photoURL?: string;
  matchPreferences?: MatchPreferences;
}

interface MatchedUser {
  id: string;
  name: string;
  username?: string;
  age?: number;
  position?: string;
  team?: string;
  city?: string;
  bio?: string;
  photoURL?: string;
  matchScore?: number; // How well they match based on criteria
}

const POSITIONS = [
  "Setter",
  "Outside Hitter",
  "Middle Blocker",
  "Opposite Hitter",
  "Libero",
  "Defensive Specialist",
];

export default function MatchPage() {
  const { user } = useUser();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserData | null>(null);
  const [preferences, setPreferences] = useState<MatchPreferences>({
    lookingForPosition: [],
    minAge: 15,
    maxAge: 20,
    preferredCity: "",
    readyToMatch: false,
  });
  const [matches, setMatches] = useState<MatchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingChat, setCreatingChat] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = { id: userDoc.id, ...userDoc.data() } as UserData;
        setUserProfile(data);

        // Load or initialize preferences
        if (data.matchPreferences) {
          setPreferences(data.matchPreferences);
          setShowPreferences(false);
          setPreferencesSaved(true);
        } else {
          setShowPreferences(true);
          setPreferencesSaved(false);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async (currentUserData: UserData) => {
    if (!user || !preferences.readyToMatch) return;

    try {
      // Get all users except current user
      const usersSnapshot = await getDocs(collection(db, "users"));
      const allUsers = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as UserData))
        .filter((u) => u.id !== user.uid && u.matchPreferences?.readyToMatch);

      // Filter users based on matching criteria
      const matchedUsers: MatchedUser[] = [];

      for (const potentialMatch of allUsers) {
        let matchScore = 0;
        let isMatch = true;

        // Check if they're looking for your position
        const theirPreferences = potentialMatch.matchPreferences;
        if (theirPreferences?.lookingForPosition && currentUserData.position) {
          if (theirPreferences.lookingForPosition.includes(currentUserData.position)) {
            matchScore += 30;
          } else {
            isMatch = false; // They're not looking for your position
          }
        }

        // Check if you're looking for their position
        if (preferences.lookingForPosition && potentialMatch.position) {
          if (preferences.lookingForPosition.includes(potentialMatch.position)) {
            matchScore += 30;
          } else {
            isMatch = false; // You're not looking for their position
          }
        }

        // Check age range
        if (theirPreferences?.minAge && theirPreferences?.maxAge && currentUserData.age) {
          if (
            currentUserData.age >= theirPreferences.minAge &&
            currentUserData.age <= theirPreferences.maxAge
          ) {
            matchScore += 20;
          } else {
            isMatch = false; // Your age doesn't fit their range
          }
        }

        if (preferences.minAge && preferences.maxAge && potentialMatch.age) {
          if (
            potentialMatch.age >= preferences.minAge &&
            potentialMatch.age <= preferences.maxAge
          ) {
            matchScore += 20;
          } else {
            isMatch = false; // Their age doesn't fit your range
          }
        }

        // Check city (bonus points, not required)
        if (preferences.preferredCity && potentialMatch.city) {
          if (potentialMatch.city.toLowerCase() === preferences.preferredCity.toLowerCase()) {
            matchScore += 20;
          }
        }

        if (isMatch && matchScore > 0) {
          matchedUsers.push({
            id: potentialMatch.id,
            name: potentialMatch.name || "Unknown",
            username: potentialMatch.username,
            age: potentialMatch.age,
            position: potentialMatch.position,
            team: potentialMatch.team,
            city: potentialMatch.city,
            bio: potentialMatch.bio,
            photoURL: potentialMatch.photoURL,
            matchScore,
          });
        }
      }

      // Sort by match score
      matchedUsers.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      setMatches(matchedUsers);
    } catch (error) {
      console.error("Error loading matches:", error);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const preferencesToSave: MatchPreferences = {
        ...preferences,
        readyToMatch: true,
      };

      await updateDoc(doc(db, "users", user.uid), {
        matchPreferences: preferencesToSave,
      });

      setPreferences(preferencesToSave);
      setShowPreferences(false);
      setPreferencesSaved(true);

      // Reload user profile (but don't load matches immediately)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const updatedData = { id: userDoc.id, ...userDoc.data() } as UserData;
        setUserProfile(updatedData);
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartChat = async (matchedUserId: string) => {
    if (!user || creatingChat) return;

    setCreatingChat(matchedUserId);
    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const snapshot = await getDocs(chatsQuery);

      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants && chat.participants.includes(matchedUserId)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        router.push(`/messages/${existingChat}`);
      } else {
        // Create new chat
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [user.uid, matchedUserId],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        router.push(`/messages/${chatRef.id}`);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to start chat. Please try again.");
    } finally {
      setCreatingChat(null);
    }
  };

  const togglePosition = (position: string) => {
    setPreferences((prev) => {
      const current = prev.lookingForPosition || [];
      if (current.includes(position)) {
        return { ...prev, lookingForPosition: current.filter((p) => p !== position) };
      } else {
        return { ...prev, lookingForPosition: [...current, position] };
      }
    });
  };

  if (loading) {
    return (
      <ProfileGuard>
        <div className="min-h-screen bg-white pb-20 md:pb-0">
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

        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/home" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
              </Link>
              <h2 className="text-[#0F172A] font-semibold text-xl">Find Players</h2>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Settings className="w-6 h-6 text-[#0F172A]" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {preferencesSaved && !showPreferences ? (
            // Confirmation Screen
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Users className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] mb-4">
                Preferences Saved! 🎉
              </h3>
              <p className="text-lg text-slate-600 mb-6 max-w-md mx-auto">
                We'll pair you with compatible players based on your preferences and let you know when we find matches.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                Check back soon or update your preferences anytime using the settings button.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  onClick={async () => {
                    const userDoc = await getDoc(doc(db, "users", user!.uid));
                    if (userDoc.exists()) {
                      const updatedData = { id: userDoc.id, ...userDoc.data() } as UserData;
                      await loadMatches(updatedData);
                      setPreferencesSaved(false); // Switch to matches view
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-medium transition-colors"
                >
                  Check Matches
                </motion.button>
                <motion.button
                  onClick={() => setShowPreferences(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#0F172A] font-medium transition-colors"
                >
                  Update Preferences
                </motion.button>
                <Link href="/home">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    Back to Home
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ) : showPreferences || !preferences.readyToMatch ? (
            // Preferences Form
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8"
            >
              <h3 className="text-2xl font-semibold text-[#0F172A] mb-6">Matching Preferences</h3>
              <p className="text-slate-600 mb-6">
                Tell us what you're looking for, and we'll match you with compatible players.
              </p>

              {/* Looking for Position */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#0F172A] mb-3">
                  Looking for Position(s) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {POSITIONS.map((position) => (
                    <motion.button
                      key={position}
                      onClick={() => togglePosition(position)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        preferences.lookingForPosition?.includes(position)
                          ? "border-[#3B82F6] bg-blue-50 text-[#3B82F6]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{position}</span>
                        {preferences.lookingForPosition?.includes(position) && (
                          <Check className="w-5 h-5" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                {preferences.lookingForPosition?.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">Please select at least one position</p>
                )}
              </div>

              {/* Age Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#0F172A] mb-3">
                  Preferred Age Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Min Age</label>
                    <input
                      type="number"
                      min="13"
                      max="25"
                      value={preferences.minAge || 15}
                      onChange={(e) =>
                        setPreferences({ ...preferences, minAge: parseInt(e.target.value) || 15 })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Max Age</label>
                    <input
                      type="number"
                      min="13"
                      max="25"
                      value={preferences.maxAge || 20}
                      onChange={(e) =>
                        setPreferences({ ...preferences, maxAge: parseInt(e.target.value) || 20 })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                    />
                  </div>
                </div>
              </div>

              {/* Preferred City (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#0F172A] mb-3">
                  Preferred City (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Toronto, Vancouver"
                  value={preferences.preferredCity || ""}
                  onChange={(e) =>
                    setPreferences({ ...preferences, preferredCity: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Leave empty to match with players from any city
                </p>
              </div>

              {/* Save Button */}
              <motion.button
                onClick={savePreferences}
                disabled={saving || (preferences.lookingForPosition?.length || 0) === 0}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                className="w-full rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white px-6 py-4 font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </motion.button>
            </motion.div>
          ) : (
            // Matches List
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-[#0F172A]">Your Matches</h3>
                  <p className="text-slate-600 mt-1">
                    {matches.length} {matches.length === 1 ? "player" : "players"} found
                  </p>
                </div>
                <motion.button
                  onClick={async () => {
                    const userDoc = await getDoc(doc(db, "users", user!.uid));
                    if (userDoc.exists()) {
                      const updatedData = { id: userDoc.id, ...userDoc.data() } as UserData;
                      setUserProfile(updatedData);
                      await loadMatches(updatedData);
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-medium transition-colors"
                >
                  Refresh
                </motion.button>
              </div>

              {matches.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-[#0F172A] mb-2">No matches found</h4>
                  <p className="text-slate-600 mb-4">
                    Try adjusting your preferences or check back later for new players.
                  </p>
                  <motion.button
                    onClick={() => setShowPreferences(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl bg-[#3B82F6] text-white px-6 py-3 font-medium"
                  >
                    Update Preferences
                  </motion.button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((match) => (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* Profile Image */}
                      <Link href={`/profile/${match.id}`}>
                        <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200">
                          {match.photoURL ? (
                            <Image
                              src={match.photoURL}
                              alt={match.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center">
                                <span className="text-white text-3xl font-semibold">
                                  {match.name[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Profile Info */}
                      <div className="p-4">
                        <Link href={`/profile/${match.id}`}>
                          <h4 className="font-semibold text-[#0F172A] text-lg mb-1 hover:text-[#3B82F6] transition-colors">
                            {match.name}
                          </h4>
                        </Link>
                        {match.username && (
                          <p className="text-sm text-slate-500 mb-2">@{match.username}</p>
                        )}

                        <div className="space-y-2 mb-4">
                          {match.position && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{match.position}</span>
                            </div>
                          )}
                          {match.age && (
                            <div className="text-sm text-slate-600">{match.age} years old</div>
                          )}
                          {match.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{match.city}</span>
                            </div>
                          )}
                          {match.team && (
                            <div className="text-sm text-slate-600">{match.team}</div>
                          )}
                        </div>

                        {match.bio && (
                          <p className="text-sm text-slate-700 mb-4 line-clamp-2">{match.bio}</p>
                        )}

                        {/* Match Score */}
                        {match.matchScore !== undefined && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500">Match Score</span>
                              <span className="text-xs font-semibold text-[#3B82F6]">
                                {match.matchScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] h-2 rounded-full"
                                style={{ width: `${Math.min(match.matchScore, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Link
                            href={`/profile/${match.id}`}
                            className="flex-1 text-center rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors"
                          >
                            View Profile
                          </Link>
                          <motion.button
                            onClick={() => handleStartChat(match.id)}
                            disabled={creatingChat === match.id}
                            whileHover={{ scale: creatingChat === match.id ? 1 : 1.05 }}
                            whileTap={{ scale: creatingChat === match.id ? 1 : 0.95 }}
                            className="flex-1 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {creatingChat === match.id ? (
                              <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-4 h-4" />
                                <span>Chat</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProfileGuard>
  );
}
