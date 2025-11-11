"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot, limit, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import { motion } from "framer-motion";
import {
  Settings,
  MapPin,
  Award,
  Play,
  Upload,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Trophy,
  Users,
  Trash2,
  ArrowUp,
  Zap,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { uploadImageToCloudinary, uploadVideoToCloudinary } from "@/utils/uploadToCloudinary";
import { formatHeight, formatVertical, formatWeight, formatTouch } from "@/utils/formatMetrics";
import FeedCard from "@/components/FeedCard";
import ManagePostsModal from "@/components/ManagePostsModal";

interface UserProfile {
  name: string;
  username?: string;
  team?: string;
  position?: string;
  secondaryPosition?: string;
  ageGroup?: string;
  birthMonth?: string;
  birthYear?: string;
  city?: string;
  height?: string;
  vertical?: string;
  weight?: string;
  blockTouch?: string;
  standingTouch?: string;
  spikeTouch?: string;
  points?: number;
  photoURL?: string;
  bio?: string;
  userType?: "athlete" | "coach";
  division?: string;
  coachMessage?: string;
  ogLockerLinkUser?: boolean;
}

interface Highlight {
  id: string;
  userId: string;
  videoURL?: string;
  thumbnailURL?: string;
  title: string;
  description?: string;
  upvotes: number;
  createdAt: number;
  views?: number;
  submittedToChallenge?: boolean;
  challengeId?: string;
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
  commentsCount?: number;
}

const DEFAULT_CHALLENGE_ID = "challenge-1";
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

export default function ProfilePage() {
  const { user, loading } = useUser();
  const { isComplete, loading: profileStatusLoading } = useProfileComplete();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManagePosts, setShowManagePosts] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [profileWasIncomplete, setProfileWasIncomplete] = useState(false);
  const [submitHighlightToChallenge, setSubmitHighlightToChallenge] = useState(false);
  const [deletingHighlightId, setDeletingHighlightId] = useState<string | null>(null);

  // Auto-show edit form if profile is incomplete
  useEffect(() => {
    if (!loading && !profileLoading && !profileStatusLoading && !isComplete) {
      setShowEditForm(true);
    }
  }, [loading, profileLoading, profileStatusLoading, isComplete]);

  useEffect(() => {
    if (loading || profileStatusLoading) {
      return;
    }

    if (!isComplete) {
      if (!profileWasIncomplete) {
        setProfileWasIncomplete(true);
      }
      return;
    }

    if (profileWasIncomplete) {
      setShowCompletionModal(true);
      setProfileWasIncomplete(false);
    }
  }, [loading, profileStatusLoading, isComplete, profileWasIncomplete]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          createdAt:
            data.createdAt?.toMillis?.() ||
            (typeof data.createdAt === "number" ? data.createdAt : Date.now()),
          commentsCount: data.commentsCount || 0,
        };
      }) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const ageGroup =
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
            : undefined);

        setUserProfile({
          name: data.name || "Player",
          username: data.username,
          team: data.team,
          position: data.position,
          secondaryPosition: data.secondaryPosition,
          ageGroup,
          birthMonth: data.birthMonth,
          birthYear: data.birthYear,
          city: data.city,
          height: data.height,
          vertical: data.vertical,
          weight: data.weight,
          blockTouch: data.blockTouch,
          standingTouch: data.standingTouch,
          spikeTouch: data.spikeTouch,
          photoURL: data.photoURL,
          bio: data.bio,
          userType: (data.userType as "athlete" | "coach") || "athlete",
          division: data.division,
          coachMessage: data.coachMessage,
          points: typeof data.points === "number" ? data.points : 0,
          ogLockerLinkUser: data.ogLockerLinkUser ?? true,
        });
      }

      // Fetch user's highlights from Firestore
      try {
        const highlightsQuery = query(
          collection(db, "highlights"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const highlightsSnapshot = await getDocs(highlightsQuery);
        const userHighlights = highlightsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          };
        }) as Highlight[];
        setHighlights(userHighlights);
      } catch (queryError: any) {
        // If index doesn't exist, try without orderBy
        if (queryError.code === 'failed-precondition') {
          const highlightsQuery = query(
            collection(db, "highlights"),
            where("userId", "==", user.uid)
          );
          const highlightsSnapshot = await getDocs(highlightsQuery);
          const userHighlights = highlightsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            };
          }) as Highlight[];
          // Sort client-side
          userHighlights.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setHighlights(userHighlights);
        } else {
          console.error("Error fetching highlights:", queryError);
          setHighlights([]);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!user || deletingHighlightId) return;

    const confirmDelete = window.confirm("Delete this highlight? This can’t be undone.");
    if (!confirmDelete) {
      return;
    }

    setDeletingHighlightId(highlightId);
    try {
      await deleteDoc(doc(db, "highlights", highlightId));
      setHighlights((prev) => prev.filter((highlight) => highlight.id !== highlightId));
    } catch (error) {
      console.error("Error deleting highlight:", error);
      alert("Failed to delete highlight. Please try again.");
    } finally {
      setDeletingHighlightId(null);
    }
  };

  const handleUpload = async () => {
    if (!user || !videoFile || !uploadTitle.trim() || uploading) return;

    setUploading(true);
    try {
      const videoUpload = await uploadVideoToCloudinary(videoFile);

      let thumbnailURL = "";
      if (thumbnailFile) {
        const thumbnailUpload = await uploadImageToCloudinary(thumbnailFile);
        thumbnailURL = thumbnailUpload.secureUrl;
      } else {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (cloudName && videoUpload.publicId) {
          thumbnailURL = `https://res.cloudinary.com/${cloudName}/video/upload/so_0/c_fill,w_640,h_360/${videoUpload.publicId}.jpg`;
        }
      }

      await addDoc(collection(db, "highlights"), {
        userId: user.uid,
        userName: userProfile?.name || user.displayName || "Player",
        userUsername: userProfile?.username || "",
        userPhotoURL: userProfile?.photoURL || user.photoURL || "",
        userPosition: userProfile?.position || "",
        videoURL: videoUpload.secureUrl,
        videoPublicId: videoUpload.publicId,
        thumbnailURL,
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        upvotes: 0,
        likedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
        challengeId: submitHighlightToChallenge ? DEFAULT_CHALLENGE_ID : "",
        submittedToChallenge: submitHighlightToChallenge,
      });

      setVideoFile(null);
      setThumbnailFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setSubmitHighlightToChallenge(false);
      setShowUploadModal(false);
      
      // Reload highlights
      await loadProfile();
      alert("Highlight uploaded successfully!");
    } catch (error) {
      console.error("Error uploading highlight:", error);
      alert("Failed to upload highlight. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isCoachProfile = userProfile?.userType === "coach";
  const coachInfoCards = isCoachProfile
    ? [
        {
          label: "Team / Club",
          value: userProfile?.team,
          icon: Users,
        },
        {
          label: "Division",
          value: userProfile?.division,
          icon: Award,
        },
        {
          label: "Region",
          value: userProfile?.city,
          icon: MapPin,
        },
      ].filter((card) => card.value)
    : [];
  const derivedAge = calculateAge(userProfile?.birthMonth, userProfile?.birthYear);

  const athleteInfoCards = !isCoachProfile
    ? [
        userProfile?.team
          ? {
              label: "Current Team",
              value: userProfile.team,
            }
          : null,
        userProfile?.city
          ? {
              label: "City",
              value: userProfile.city,
            }
          : null,
        userProfile?.ageGroup
          ? {
              label: "Age Group",
              value: userProfile.ageGroup,
            }
          : null,
        derivedAge !== undefined
          ? {
              label: "Age",
              value: `${derivedAge}`,
            }
          : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];
  const stats = isCoachProfile
    ? [
        {
          label: "Highlights",
          value: highlights.length.toString(),
          icon: Play,
        },
      ]
    : [
        {
          label: "Height",
          value: formatHeight(userProfile?.height),
          icon: TrendingUp,
        },
        {
          label: "Vertical",
          value: formatVertical(userProfile?.vertical),
          icon: Sparkles,
        },
        {
          label: "Weight",
          value: formatWeight(userProfile?.weight),
          icon: Trophy,
        },
      ];

  if (!isCoachProfile) {
    stats.push(
      {
        label: "Block Touch",
        value: formatTouch(userProfile?.blockTouch),
        icon: ArrowUp,
      },
      {
        label: "Standing Touch",
        value: formatTouch(userProfile?.standingTouch),
        icon: Users,
      },
      {
        label: "Spike Touch",
        value: formatTouch(userProfile?.spikeTouch),
        icon: Zap,
      },
      {
        label: "Highlights",
        value: highlights.length.toString(),
        icon: Play,
      },
      {
        label: "Points",
        value: userProfile?.points !== undefined ? `${userProfile.points}` : "0",
        icon: Star,
      }
    );
  }

  const statsGridClass = isCoachProfile
    ? "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"
    : "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4";

  if (loading || profileLoading || profileStatusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showEditForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827]">Edit Profile</h1>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-8 shadow-sm border border-[#E5E7EB]">
              <ProfileForm
                onSave={async () => {
                  await loadProfile();
                  setShowEditForm(false);
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
      <Navbar />
      
      {/* Header with settings */}
      <div className="bg-white border-b border-slate-200 sticky top-14 md:static md:top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-[#0F172A] font-semibold text-xl">Profile</h2>
          <button
            onClick={() => setShowEditForm(true)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Settings className="w-6 h-6 text-slate-600" />
          </button>
        </div>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto px-4 pb-4"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-sm text-[#14532D]">
                <p className="font-semibold">Profile Complete</p>
                <p>You’re all set. Explore highlights, match with players, and connect across LockerLink.</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Profile banner */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] h-32" />

      {/* Profile info */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 mb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg relative space-y-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-[#FACC15] to-[#F59E0B] rounded-2xl flex items-center justify-center -mt-12 shadow-xl overflow-hidden">
              {userProfile?.photoURL ? (
                <Image
                  src={userProfile.photoURL}
                  alt={userProfile.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-semibold">
                  {userProfile?.name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-[26px] font-semibold text-[#0F172A] leading-tight">
                  {userProfile?.name || "Player"}
                </h1>
                <Award className="w-5 h-5 text-[#3B82F6]" />
              </div>
              {userProfile?.username && (
                <p className="text-slate-500 text-sm mb-3">@{userProfile.username}</p>
              )}
              {userProfile?.city && (
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{userProfile.city}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {userProfile?.position && (
                  <div className="bg-[#3B82F6] text-white px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile.position}
                  </div>
                )}
                {!isCoachProfile && userProfile?.secondaryPosition && (
                  <div className="bg-blue-50 text-[#1D4ED8] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                    Secondary: {userProfile.secondaryPosition}
                  </div>
                )}
                {!isCoachProfile && userProfile?.ageGroup && (
                  <div className="bg-blue-50 text-[#3B82F6] px-3 py-1 rounded-full text-sm font-medium border-0">
                    {userProfile.ageGroup}
                  </div>
                )}
                {userProfile?.userType && (
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium border border-emerald-100">
                    {userProfile.userType === "coach" ? "Coach" : "Athlete"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {!isCoachProfile && userProfile?.bio && (
            <p className="text-slate-700 leading-relaxed">{userProfile.bio}</p>
          )}

          {/* Profile details */}
          {!isCoachProfile && athleteInfoCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {athleteInfoCards.map((card) => (
                <div key={card.label} className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">
                    {card.label}
                  </p>
                  <p className="text-[#0F172A] font-medium">{card.value}</p>
                </div>
              ))}
            </div>
          )}
          {isCoachProfile && coachInfoCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coachInfoCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {card.label}
                      </p>
                      <p className="text-sm font-semibold text-[#0F172A] truncate">{card.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {isCoachProfile && userProfile?.coachMessage && (
            <div className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-[#EFF6FF] via-white to-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/15 text-[#2563EB] text-base font-semibold">
                  ✉️
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#2563EB]">
                  Message to Athletes
                </p>
              </div>
              <p className="text-sm leading-relaxed text-[#1E3A8A]">{userProfile.coachMessage}</p>
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className={`${statsGridClass} mt-2`}>
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-slate-50 rounded-2xl p-4 text-center shadow-sm">
                    <Icon className="w-5 h-5 text-[#3B82F6] mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-[#0F172A] font-medium">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          )}

          {!isCoachProfile && userProfile?.ogLockerLinkUser && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100 px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-white font-semibold">
                OG
              </div>
              <div className="text-sm text-[#92400E]">
                <p className="font-semibold">OG LockerLink User</p>
                <p className="text-xs">Thanks for being part of the first wave of the LockerLink community.</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <motion.button
              onClick={() => setShowEditForm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-md hover:shadow-lg touch-manipulation min-h-[44px] text-sm sm:text-base"
            >
              Edit Profile
            </motion.button>
            <Link href={isCoachProfile ? "/coach" : "/match"} className="contents">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#3B82F6] bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-[#3B82F6] font-medium transition-all duration-200 hover:bg-blue-50 shadow-sm hover:shadow-md touch-manipulation min-h-[44px] text-sm sm:text-base"
              >
                {isCoachProfile ? "Open Coach Dashboard" : "Find Match"}
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowManagePosts(true)}
              className="flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 sm:px-6 py-2.5 sm:py-3 text-slate-600 font-medium transition-all duration-200 hover:bg-slate-50 shadow-sm hover:shadow-md touch-manipulation min-h-[44px] text-sm sm:text-base"
            >
              Manage Posts
            </motion.button>
          </div>
        </div>
      </div>

      {/* Highlights section */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#0F172A] font-semibold">My Highlights</h2>
          <motion.button
            onClick={() => {
              setSubmitHighlightToChallenge(false);
              setShowUploadModal(true);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-sm font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload
          </motion.button>
        </div>
        {highlights.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {highlights.map((highlight, index) => {
              const isDeleting = deletingHighlightId === highlight.id;
              return (
                <Link key={highlight.id} href={`/highlights/${highlight.id}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden group cursor-pointer"
                  >
                    {highlight.thumbnailURL ? (
                      <Image
                        src={highlight.thumbnailURL}
                        alt={highlight.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <Play className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    {highlight.submittedToChallenge && (
                      <div className="absolute top-2 right-2 rounded-full bg-[#FACC15] text-[#0F172A] px-2 py-1 text-xs font-semibold shadow">
                        Challenge
                      </div>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isDeleting}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteHighlight(highlight.id);
                      }}
                      className="absolute top-2 left-2 flex items-center justify-center rounded-full bg-white/90 text-red-500 shadow-md hover:bg-red-50 transition-colors w-9 h-9 disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-[#3B82F6] ml-1" fill="currentColor" />
                      </div>
                    </div>
                    
                    {/* View count */}
                    {highlight.views && highlight.views > 0 && (
                      <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
                        {highlight.views >= 1000 
                          ? `${(highlight.views / 1000).toFixed(1)}k` 
                          : highlight.views.toString()}
                      </div>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Play className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No highlights yet</p>
            <motion.button
              onClick={() => {
                setSubmitHighlightToChallenge(false);
                setShowUploadModal(true);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-[#007AFF] px-6 py-3 text-white font-medium shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload Your First Highlight
            </motion.button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-semibold text-[#111827] mb-6">Upload Highlight</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Video *</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Thumbnail (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Amazing block against Team X"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Description (optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell us about this highlight..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F172A]">Submit to Highlight Challenge?</p>
                  <p className="text-xs text-slate-500">
                    Turn this on if you want this highlight considered for the current challenge.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2">
                  <span className="text-sm text-slate-600">No</span>
                  <button
                    type="button"
                    onClick={() => setSubmitHighlightToChallenge((prev) => !prev)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      submitHighlightToChallenge ? "bg-[#3B82F6]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        submitHighlightToChallenge ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-slate-600">Yes</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setVideoFile(null);
                  setThumbnailFile(null);
                  setUploadTitle("");
                  setUploadDescription("");
                  setSubmitHighlightToChallenge(false);
                }}
                disabled={uploading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-3 text-[#111827] font-medium transition-all duration-200 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleUpload}
                disabled={!videoFile || !uploadTitle.trim() || uploading}
                whileHover={{ scale: uploading ? 1 : 1.02 }}
                whileTap={{ scale: uploading ? 1 : 0.98 }}
                className="flex-1 rounded-xl bg-[#007AFF] px-6 py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-sm w-full rounded-2xl bg-white p-6 text-center shadow-xl border border-[#E5E7EB]"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0F172A] mb-2">Profile Complete!</h2>
            <p className="text-sm text-[#4B5563] mb-6">
              You’re all set. Explore highlights, find matches, and connect with other athletes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition-colors hover:bg-slate-50"
              >
                Stay Here
              </button>
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  router.push("/home");
                }}
                className="flex-1 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0056CC]"
              >
                Go to Home
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ManagePostsModal open={showManagePosts} onClose={() => setShowManagePosts(false)} />

      <div className="max-w-2xl mx-auto px-4 mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Posts</h2>
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No posts yet
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <FeedCard post={post} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
