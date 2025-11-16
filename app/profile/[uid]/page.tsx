"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import FeedCard from "@/components/FeedCard";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiChat } from "react-icons/hi";
import { Play } from "lucide-react";
import { formatHeight, formatVertical, formatWeight, formatTouch } from "@/utils/formatMetrics";
import BackButton from "@/components/BackButton";

const MONTH_TO_INDEX: Record<string, number> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

const calculateAge = (month?: string, year?: string) => {
  if (!month || !year) return undefined;
  const numericYear = Number(year);
  if (Number.isNaN(numericYear)) return undefined;
  const monthIndex = MONTH_TO_INDEX[month];
  if (monthIndex === undefined) return undefined;
  const birthDate = new Date(numericYear, monthIndex, 1);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    now.getMonth() > monthIndex || (now.getMonth() === monthIndex && now.getDate() >= 1);
  if (!hasHadBirthday) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
};

interface Post {
  id: string;
  userId: string;
  text: string;
  imageURL?: string;
  videoURL?: string;
  thumbnailURL?: string;
  mediaType?: "image" | "video" | null;
  createdAt: number;
  commentsCount?: number;
}

interface Highlight {
  id: string;
  userId: string;
  title: string;
  thumbnailURL?: string;
  videoURL?: string;
  createdAt: number;
  upvotes?: number;
  commentsCount?: number;
  submittedToChallenge?: boolean;
}

interface ViewedProfile {
  name?: string;
  username?: string;
  team?: string;
  sport?: string;
  city?: string;
  bio?: string;
  photoURL?: string;
  position?: string;
  secondaryPosition?: string;
  ageGroup?: string;
  birthMonth?: string;
  birthYear?: string;
  height?: string;
  vertical?: string;
  weight?: string;
  blockTouch?: string;
  standingTouch?: string;
  spikeTouch?: string;
  division?: string;
  coachMessage?: string;
  userType?: "athlete" | "coach" | "admin" | "mentor";
  ogLockerLinkUser?: boolean;
  points?: number;
  adminRole?: string;
  university?: string;
  experienceYears?: number;
  volleyballBackground?: string;
  focusAreas?: string;
  achievements?: string;
  contactLink?: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user: currentUser, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<ViewedProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [viewerType, setViewerType] = useState<"athlete" | "coach" | "admin" | "mentor" | "">("");

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push("/");
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (!currentUser) {
      setViewerType("");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", currentUser.uid), (snapshot) => {
      const data = snapshot.data();
      setViewerType((data?.userType as "athlete" | "coach" | "admin" | "mentor") || "athlete");
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          const resolvedAdminRole = data.userType === "admin" ? (data.adminRole || "parent") : undefined;
          if (data.userType === "admin" && !data.adminRole) {
            try {
              await setDoc(doc(db, "users", uid), { adminRole: "parent" }, { merge: true });
            } catch (error) {
              console.error("Error setting default admin role for viewed profile:", error);
            }
          }
          setProfile({
            ...data,
            username: data.username || "",
            ageGroup:
              data.ageGroup ||
              (typeof data.age === "number"
                ? data.age >= 18
                  ? "18U"
                  : data.age >= 17
                    ? "17U"
                    : data.age >= 16
                      ? "16U"
                      : data.age >= 15
                        ? "15U"
                        : undefined
                : undefined),
            points: typeof data.points === "number" ? data.points : 0,
            userType: (data.userType as "athlete" | "coach" | "admin" | "mentor") || "athlete",
            adminRole: resolvedAdminRole,
            university: data.university || "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          commentsCount: data.commentsCount || 0,
        } as Post;
      });
      setPosts(postsData);
    });

    const highlightsQuery = query(
      collection(db, "highlights"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeHighlights = onSnapshot(highlightsQuery, (snapshot) => {
      const highlightData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        } as Highlight;
      });
      setHighlights(highlightData);
    });

    return () => {
      unsubscribePosts();
      unsubscribeHighlights();
    };
  }, [uid]);

  const handleStartChat = async () => {
    if (!currentUser || !profile || viewerType === "coach") return;

    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      
      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants && chat.participants.includes(uid)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        // Chat exists, navigate to it
        router.push(`/messages/${existingChat}`);
      } else {
        // Create new chat automatically
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [currentUser.uid, uid],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        
        console.log("Chat created successfully:", chatRef.id);
        router.push(`/messages/${chatRef.id}`);
      }
    } catch (error: any) {
      console.error("Error starting chat:", error);
      alert(`Error starting chat: ${error.message || "Please try again."}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="text-center text-[#6B7280]">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === uid;
  const isCoachProfile = profile?.userType === "coach";
  const isAdminProfile = profile?.userType === "admin";
  const isMentorProfile = profile?.userType === "mentor";
  const isAthleteProfile = profile?.userType === "athlete" || profile?.userType === "mentor";
  const formattedBirth =
    profile.birthMonth && profile.birthYear
      ? `${String(profile.birthMonth).slice(0, 3)} ${profile.birthYear}`
      : undefined;
  const athleteStatCards = !isCoachProfile && !isMentorProfile
    ? [
        { label: "Birth", value: formattedBirth || "—" },
        { label: "Height", value: formatHeight(profile.height) },
        { label: "Vertical", value: formatVertical(profile.vertical) },
        { label: "Weight", value: formatWeight(profile.weight) },
        { label: "Block Touch", value: formatTouch(profile.blockTouch) },
        { label: "Standing Touch", value: formatTouch(profile.standingTouch) },
        { label: "Spike Touch", value: formatTouch(profile.spikeTouch) },
        { label: "Points", value: profile.points !== undefined ? `${profile.points}` : "0" },
      ]
    : [];
  const coachInfoCards = isCoachProfile
    ? [
        profile.team ? { label: "TEAM", value: profile.team } : null,
        profile.city ? { label: "REGION", value: profile.city } : null,
        profile.division ? { label: "DIVISION", value: profile.division } : null,
        profile.ageGroup ? { label: "AGE GROUP", value: profile.ageGroup } : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  const coachStatCards = isCoachProfile
    ? [
        {
          label: "Community Posts",
          value: posts.length.toString(),
        },
      ]
    : [];
  const mentorCards = isMentorProfile
    ? [
        formattedBirth ? { label: "Birth", value: formattedBirth } : null,
        profile.height ? { label: "Height", value: formatHeight(profile.height) } : null,
        profile.university ? { label: "University", value: profile.university } : null,
        profile.experienceYears ? { label: "Experience", value: `${profile.experienceYears} years` } : null,
        profile.city ? { label: "City", value: profile.city } : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];
  const mentorInfoCards = isMentorProfile
    ? [
        profile.university
          ? { label: "University", value: profile.university }
          : null,
        profile.city
          ? { label: "City", value: profile.city }
          : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-0 pb-4 md:py-4 sm:py-8">
        <BackButton fallback="/home" className="mb-4" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8 rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden relative"
        >
          <div className="bg-gradient-to-br from-[#007AFF] to-[#0056CC] h-32 sm:h-40"></div>
          <div className="px-4 sm:px-8 pb-6 sm:pb-8 -mt-16 sm:-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:pr-60">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white bg-[#F3F4F6] shadow-lg overflow-hidden mx-auto sm:mx-0">
                {profile.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt={profile.name || "Coach"}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-[#9CA3AF]">
                    {profile.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-right">
                {!isOwnProfile && viewerType !== "coach" && (
                  <motion.button
                    onClick={handleStartChat}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base"
                  >
                    <HiChat className="w-5 h-5" />
                    <span className="hidden sm:inline">Message</span>
                    <span className="sm:hidden">Msg</span>
                  </motion.button>
                )}
                {isOwnProfile && (
                  <Link
                    href="/profile"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">{profile.name}</h1>
                {profile.username && (
                  <p className="text-sm text-[#6B7280] mt-1">@{profile.username}</p>
                )}
                {profile.team && (
                  <p className="text-lg sm:text-xl text-[#6B7280] mt-2">{profile.team}</p>
                )}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {profile.position && (
                  <span className="inline-flex justify-center rounded-full bg-[#3B82F6] text-white px-3 py-1 text-sm font-medium">
                      {profile.position}
                    </span>
                  )}
                  {isAthleteProfile && profile.secondaryPosition && (
                  <span className="inline-flex justify-center rounded-full bg-blue-50 text-[#1D4ED8] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                      Secondary: {profile.secondaryPosition}
                    </span>
                  )}
                  {isAthleteProfile && profile.ageGroup && (
                  <span className="inline-flex justify-center rounded-full bg-blue-50 text-[#3B82F6] px-3 py-1 text-sm font-medium">
                      {profile.ageGroup}
                    </span>
                  )}
                  {isAthleteProfile && (
                    <span className="inline-flex justify-center rounded-full bg-blue-50 text-[#3B82F6] px-3 py-1 text-sm font-medium">
                      Athlete
                    </span>
                  )}
                  {isMentorProfile && (
                    <span className="inline-flex justify-center rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-sm font-medium">
                      Mentor
                    </span>
                  )}
                  {isCoachProfile && (
                    <span className="inline-flex justify-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-sm font-medium">
                      Coach
                    </span>
                  )}
                  {isAdminProfile && (
                    <span className="inline-flex justify-center rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-sm font-medium">
                      {profile.adminRole === "clubAdmin" ? "Club Admin" : "Parent/Guardian"}
                    </span>
                  )}
                </div>
              </div>

              {/* Coach Info Cards - Team, Region, Division, Age Group */}
              {isCoachProfile && coachInfoCards.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                  {coachInfoCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                        {card.label}
                      </p>
                      <p className="text-base font-semibold text-[#111827]">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {!isCoachProfile && !isMentorProfile && athleteStatCards.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {athleteStatCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                        {card.label}
                      </p>
                      <p className="text-lg font-semibold text-[#111827]">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {isCoachProfile && coachStatCards.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {coachStatCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                        {card.label}
                      </p>
                      <p className="text-lg font-semibold text-[#111827]">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {isMentorProfile && mentorCards.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {mentorCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                        {card.label}
                      </p>
                      <p className="text-lg font-semibold text-[#111827]">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {isMentorProfile && mentorInfoCards.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-[#E5E7EB]">
                  {mentorInfoCards.map((card) => (
                    <div key={card.label} className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                        {card.label}
                      </p>
                      <p className="text-xl font-semibold text-[#111827]">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
              {!isCoachProfile && !isMentorProfile && profile.bio && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">About</p>
                  <p className="text-[#111827] leading-relaxed">{profile.bio}</p>
                </div>
              )}
              {isMentorProfile && profile.bio && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">About</p>
                  <p className="text-[#111827] leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}
              {isMentorProfile && profile.volleyballBackground && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Volleyball Background</p>
                  <p className="text-[#111827] leading-relaxed whitespace-pre-line">{profile.volleyballBackground}</p>
                </div>
              )}
              {isMentorProfile && profile.focusAreas && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-indigo-700 uppercase tracking-wide mb-3">Focus Areas</p>
                  <p className="text-[#1F2937] leading-relaxed whitespace-pre-line">{profile.focusAreas}</p>
                </div>
              )}
              {isMentorProfile && profile.achievements && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#B45309] uppercase tracking-wide mb-3">Achievements</p>
                  <p className="text-[#92400E] leading-relaxed whitespace-pre-line">{profile.achievements}</p>
                </div>
              )}
              {isMentorProfile && profile.contactLink && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Connect</p>
                  <a
                    href={profile.contactLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#2563EB] underline break-all"
                  >
                    {profile.contactLink}
                  </a>
                </div>
              )}
              {isCoachProfile && profile.coachMessage && (
                <div className="pt-6 border-t border-[#E5E7EB]">
                  <p className="text-sm font-semibold text-[#2563EB] uppercase tracking-wide mb-3">
                    Message to Athletes
                  </p>
                  <p className="text-[#1E3A8A] leading-relaxed">{profile.coachMessage}</p>
                </div>
              )}

              <div className="pt-6 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-[#111827]">Highlights</h2>
                  {!isOwnProfile && highlights.length > 0 && (
                    <span className="text-xs text-slate-500">Latest {Math.min(highlights.length, 6)} clips</span>
                  )}
                </div>
                {highlights.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {highlights.slice(0, 6).map((highlight) => (
                      <Link
                        key={highlight.id}
                        href={{
                          pathname: `/highlights/${highlight.id}`,
                          query: { returnUrl: `/profile/${uid}` },
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-100 border border-slate-200 shadow-sm"
                        >
                          {highlight.thumbnailURL ? (
                            <Image
                              src={highlight.thumbnailURL}
                              alt={highlight.title || "Highlight"}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                              <Play className="w-8 h-8 text-slate-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                              <Play className="w-6 h-6 text-[#3B82F6] ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                            <p className="text-xs font-semibold text-white line-clamp-2">
                              {highlight.title || "Highlight"}
                            </p>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">
                    No highlights yet. When they upload clips, you’ll find them here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div>
          <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl font-semibold text-[#111827]">Posts</h2>
          <div className="space-y-4">
            {posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl sm:rounded-2xl border border-[#E5E7EB] bg-white p-8 sm:p-12 text-center"
              >
                <p className="text-[#6B7280]">No posts yet</p>
              </motion.div>
            ) : (
              posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <FeedCard post={post} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
