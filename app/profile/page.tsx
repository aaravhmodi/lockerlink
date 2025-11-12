"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot, limit, deleteDoc, setDoc } from "firebase/firestore";
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { uploadImageToCloudinary, uploadVideoToCloudinary } from "@/utils/uploadToCloudinary";
import { formatHeight, formatVertical, formatWeight, formatTouch } from "@/utils/formatMetrics";
import FeedCard from "@/components/FeedCard";
import ManagePostsModal from "@/components/ManagePostsModal";
import BackButton from "@/components/BackButton";

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
  userType?: "athlete" | "coach" | "admin" | "mentor";
  division?: string;
  coachMessage?: string;
  ogLockerLinkUser?: boolean;
  hasHighlight?: boolean;
  adminRole?: "parent" | "clubAdmin" | "";
  university?: string;
  experienceYears?: number;
  volleyballBackground?: string;
  focusAreas?: string;
  achievements?: string;
  contactLink?: string;
}

interface Highlight {
  id: string;
  userId: string;
  videoURL?: string;
  thumbnailURL?: string;
  title: string;
  description?: string;
  upvotes?: number;
  commentsCount?: number;
  createdAt?: number;
  submittedToChallenge?: boolean;
  challengeId?: string;
  views?: number;
}

interface HighlightUploadResponse {
  secureUrl: string;
  publicId: string;
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

const DEFAULT_CHALLENGE_ID = "lockerlink-main";
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
  const [hasHighlight, setHasHighlight] = useState(false);
  const [profileFieldsComplete, setProfileFieldsComplete] = useState(false);
  const [showSwitchUserTypeModal, setShowSwitchUserTypeModal] = useState(false);
  const [switchingUserType, setSwitchingUserType] = useState(false);

  // Auto-show edit form until required profile fields are complete
  useEffect(() => {
    if (!loading && !profileLoading && !profileStatusLoading && !profileFieldsComplete) {
      setShowEditForm(true);
    }
  }, [loading, profileLoading, profileStatusLoading, profileFieldsComplete]);

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
      const userDocExists = userDoc.exists();
      let userData: any = null;
      if (userDocExists) {
        const data = userDoc.data();
        userData = data;
        const isCoachDoc = data.userType === "coach";
        const isAdminDoc = data.userType === "admin";
        const isClubAdminDoc = isAdminDoc && data.adminRole === "clubAdmin";
        const isMentorDoc = data.userType === "mentor";
        const resolvedAdminRole = isAdminDoc ? (data.adminRole || "parent") : "";
        if (isAdminDoc && !data.adminRole) {
          try {
            await setDoc(doc(db, "users", user.uid), { adminRole: "parent" }, { merge: true });
          } catch (error) {
            console.error("Error setting default admin role:", error);
          }
        }
        const fieldsComplete = (() => {
          if (isCoachDoc) {
            return (
              data.username &&
              data.name &&
              data.userType &&
              data.team &&
              data.city
            );
          }

          if (isAdminDoc) {
            return (
              data.username &&
              data.name &&
              data.userType &&
              resolvedAdminRole &&
              (!isClubAdminDoc || data.team)
            );
          }

          if (isMentorDoc) {
            return (
              data.username &&
              data.name &&
              data.userType
            );
          }

          return (
            data.username &&
            data.name &&
            data.userType &&
            data.team &&
            data.city &&
            data.position &&
            data.sport &&
            data.ageGroup &&
            data.birthMonth &&
            data.birthYear &&
            data.height &&
            data.vertical &&
            data.weight
          );
        })();

        setProfileFieldsComplete(!!fieldsComplete);
        setHasHighlight(!!data.hasHighlight);
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
          ageGroup: data.ageGroup || ageGroup,
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
          userType: (data.userType as "athlete" | "coach" | "admin" | "mentor") || "athlete",
          division: data.division,
          coachMessage: data.coachMessage,
          points: typeof data.points === "number" ? data.points : 0,
          ogLockerLinkUser: data.ogLockerLinkUser ?? true,
          hasHighlight: data.hasHighlight,
          adminRole: resolvedAdminRole as "parent" | "clubAdmin" | "",
          university: data.university || "",
          experienceYears: data.experienceYears,
          volleyballBackground: data.volleyballBackground,
          focusAreas: data.focusAreas,
          achievements: data.achievements,
          contactLink: data.contactLink,
        });
      } else {
        setProfileFieldsComplete(false);
        setHasHighlight(false);
        setUserProfile(null);
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
        setHasHighlight(userHighlights.length > 0);

        if (userDocExists) {
          const hasHighlightFlag = !!userData?.hasHighlight;
          if (userHighlights.length > 0 && !hasHighlightFlag) {
            await setDoc(doc(db, "users", user.uid), { hasHighlight: true }, { merge: true });
          } else if (userHighlights.length === 0 && userData?.hasHighlight) {
            await setDoc(doc(db, "users", user.uid), { hasHighlight: false }, { merge: true });
          }
        }
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
          setHasHighlight(userHighlights.length > 0);

          if (userDocExists) {
            const hasHighlightFlag = !!userData?.hasHighlight;
            if (userHighlights.length > 0 && !hasHighlightFlag) {
              await setDoc(doc(db, "users", user.uid), { hasHighlight: true }, { merge: true });
            } else if (userHighlights.length === 0 && userData?.hasHighlight) {
              await setDoc(doc(db, "users", user.uid), { hasHighlight: false }, { merge: true });
            }
          }
        } else {
          console.error("Error fetching highlights:", queryError);
          setHighlights([]);
          setHasHighlight(false);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const isCoachProfile = userProfile?.userType === "coach";
  const isAdminProfile = userProfile?.userType === "admin";
  const isMentorProfile = userProfile?.userType === "mentor";
  const isAthleteProfile = userProfile?.userType === "athlete";
  const isClubAdminProfile = isAdminProfile && userProfile?.adminRole === "clubAdmin";

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!user || deletingHighlightId) return;

    const confirmDelete = window.confirm("Delete this highlight? This can't be undone.");
    if (!confirmDelete) {
      return;
    }

    setDeletingHighlightId(highlightId);
    try {
      await deleteDoc(doc(db, "highlights", highlightId));

      const remainingHighlights = highlights.filter((highlight) => highlight.id !== highlightId);
      setHighlights(remainingHighlights);

      if (remainingHighlights.length === 0) {
        await setDoc(doc(db, "users", user.uid), { hasHighlight: false }, { merge: true });
        setHasHighlight(false);
      } else {
        setHasHighlight(true);
      }
    } catch (error) {
      console.error("Error deleting highlight:", error);
      alert("Failed to delete highlight. Please try again.");
    } finally {
      setDeletingHighlightId(null);
    }
  };

  const handleSwitchUserType = async () => {
    if (!user || switchingUserType) return;

    setSwitchingUserType(true);
    try {
      // Delete all user's highlights
      const highlightsQuery = query(collection(db, "highlights"), where("userId", "==", user.uid));
      const highlightsSnapshot = await getDocs(highlightsQuery);
      const deleteHighlightPromises = highlightsSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deleteHighlightPromises);

      // Clear all profile data except essential auth fields (name, email, photoURL)
      await setDoc(
        doc(db, "users", user.uid),
        {
          userType: "",
          username: "",
          team: "",
          city: "",
          position: "",
          secondaryPosition: "",
          ageGroup: "",
          birthMonth: "",
          birthYear: "",
          height: "",
          vertical: "",
          weight: "",
          blockTouch: "",
          standingTouch: "",
          spikeTouch: "",
          division: "",
          coachMessage: "",
          bio: "",
          adminRole: "",
          university: "",
          experienceYears: "",
          volleyballBackground: "",
          focusAreas: "",
          achievements: "",
          contactLink: "",
          hasHighlight: false,
          points: 0,
          // Keep name, email, photoURL, ogLockerLinkUser from existing data
        },
        { merge: true }
      );

      // Close modal and redirect to role selection
      setShowSwitchUserTypeModal(false);
      router.push("/role");
    } catch (error) {
      console.error("Error switching user type:", error);
      alert("Failed to switch user type. Please try again.");
      setSwitchingUserType(false);
    }
  };

  const handleUpload = async () => {
    if (!user || isCoachProfile || isAdminProfile || !videoFile || !uploadTitle.trim() || uploading) return;
    // Allow athletes and mentors to upload highlights

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

      await setDoc(doc(db, "users", user.uid), { hasHighlight: true }, { merge: true });
      setHasHighlight(true);

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

  const derivedAge = calculateAge(userProfile?.birthMonth, userProfile?.birthYear);

  const athleteInfoCards = isAthleteProfile
    ? [
        userProfile?.team
          ? {
              label: "TEAM",
              value: userProfile.team,
            }
          : null,
        userProfile?.city
          ? {
              label: "CITY",
              value: userProfile.city,
            }
          : null,
        userProfile?.ageGroup
          ? {
              label: "AGE GROUP",
              value: userProfile.ageGroup,
            }
          : null,
        derivedAge !== undefined
          ? {
              label: "AGE",
              value: `${derivedAge}`,
            }
          : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];
  const coachInfoCards = isCoachProfile
    ? [
        userProfile?.team
          ? {
              label: "TEAM",
              value: userProfile.team,
            }
          : null,
        userProfile?.city
          ? {
              label: "REGION",
              value: userProfile.city,
            }
          : null,
        userProfile?.division
          ? {
              label: "DIVISION",
              value: userProfile.division,
            }
          : null,
        userProfile?.ageGroup
          ? {
              label: "AGE GROUP",
              value: userProfile.ageGroup,
            }
          : null,
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  const adminInfoCards = isAdminProfile
    ? [
        {
          label: "Role",
          value: isClubAdminProfile ? "Club Admin" : "Parent / Guardian",
          icon: Star,
        },
        isClubAdminProfile && userProfile?.team
          ? {
              label: "Team",
              value: userProfile.team,
              icon: Users,
            }
          : null,
        userProfile?.university
          ? {
              label: "University",
              value: userProfile.university,
              icon: Sparkles,
            }
          : null,
        userProfile?.city
          ? {
              label: "Region / City",
              value: userProfile.city,
              icon: MapPin,
            }
          : null,
      ].filter(Boolean) as { label: string; value: string; icon: any }[]
    : [];

  // Athlete stats (8 cards: Height, Vertical, Weight, Highlights, Points, Block Touch, Standing Touch, Spike Touch)
  const athleteStats: { label: string; value: string; icon: any; badge?: string }[] = (() => {
    if (!isAthleteProfile) return [];

    return [
      {
        label: "Height",
        value: formatHeight(userProfile?.height),
        icon: TrendingUp,
      },
      {
        label: "Vertical",
        value: formatVertical(userProfile?.vertical),
        icon: Zap,
      },
      {
        label: "Weight",
        value: formatWeight(userProfile?.weight),
        icon: Trophy,
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
        badge: "BETA",
      },
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
    ];
  })();

  // Mentor stats (Height, Weight, Vertical, Highlights, and touch metrics if available)
  const mentorStats: { label: string; value: string; icon: any }[] = (() => {
    if (!isMentorProfile) return [];

    const stats = [
      {
        label: "Height",
        value: formatHeight(userProfile?.height),
        icon: TrendingUp,
      },
      {
        label: "Weight",
        value: formatWeight(userProfile?.weight),
        icon: Trophy,
      },
      {
        label: "Vertical",
        value: formatVertical(userProfile?.vertical),
        icon: Zap,
      },
      {
        label: "Highlights",
        value: highlights.length.toString(),
        icon: Play,
      },
    ];

    // Add touch metrics if available
    if (userProfile?.blockTouch || userProfile?.standingTouch || userProfile?.spikeTouch) {
      if (userProfile?.blockTouch) {
        stats.push({
          label: "Block Touch",
          value: formatTouch(userProfile.blockTouch),
          icon: ArrowUp,
        });
      }
      if (userProfile?.standingTouch) {
        stats.push({
          label: "Standing Touch",
          value: formatTouch(userProfile.standingTouch),
          icon: Users,
        });
      }
      if (userProfile?.spikeTouch) {
        stats.push({
          label: "Spike Touch",
          value: formatTouch(userProfile.spikeTouch),
          icon: Zap,
        });
      }
    }

    return stats;
  })();

  // Coach/Admin stats
  const stats: { label: string; value: string; icon: any; badge?: string }[] = (() => {
    if (isCoachProfile) {
      return [
        {
          label: "Community Posts",
          value: posts.length.toString(),
          icon: Users,
        },
      ];
    }

    if (isAdminProfile) {
      return [
        {
          label: "Community Posts",
          value: posts.length.toString(),
          icon: Users,
        },
        {
          label: "Highlights",
          value: highlights.length.toString(),
          icon: Play,
        },
        isClubAdminProfile && userProfile?.team
          ? {
              label: "Club",
              value: userProfile.team,
              icon: MapPin,
            }
          : null,
      ].filter(Boolean) as { label: string; value: string; icon: any }[];
    }

    return [];
  })();

  const statsGridClass = isCoachProfile
    ? "grid grid-cols-1 gap-3 mb-4"
    : isAdminProfile
      ? "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
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
          <BackButton fallback="/home" className="mb-6" />
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4">
        <BackButton fallback="/home" className="mb-4" />
      </div>
      
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
                <p>
                  {isCoachProfile
                    ? "You’re all set. Explore highlights and connect with athletes across LockerLink."
                    : isAdminProfile
                    ? "You’re all set. Monitor athletes, posts, and conversations across LockerLink."
                    : isMentorProfile
                    ? "You’re all set. Discover athletes, share insights, and cheer on the community."
                    : "You’re all set. Explore highlights, post updates, and connect across LockerLink."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {profileFieldsComplete && !hasHighlight && (isAthleteProfile || isMentorProfile) && !isComplete && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-amber-400 text-white">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#92400E]">Almost there!</h3>
                <p className="text-xs text-[#B45309]">
                  Upload a highlight clip (even a quick 5-second video) to finish unlocking the rest of LockerLink.
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  setSubmitHighlightToChallenge(false);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#d97706] transition-colors"
              >
                Upload Highlight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile banner */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] h-32" />

      {/* Profile info */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 mb-10">
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-lg relative space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-2xl flex items-center justify-center -mt-12 shadow-xl overflow-hidden mx-auto sm:mx-0 sm:flex-shrink-0">
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
            
            <div className="flex-1 pt-4 sm:pt-2 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#0F172A] leading-tight">
                  {userProfile?.name || "Player"}
                </h1>
              </div>
              {userProfile?.username && (
                <p className="text-slate-500 text-sm mb-3">@{userProfile.username}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {userProfile?.position && (
                  <div className="bg-[#3B82F6] text-white px-4 py-1.5 rounded-full text-sm font-medium">
                    {userProfile.position}
                  </div>
                )}
                {isAthleteProfile && userProfile?.secondaryPosition && (
                  <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                    Secondary: {userProfile.secondaryPosition}
                  </div>
                )}
                {isAthleteProfile && userProfile?.ageGroup && (
                  <div className="bg-blue-50 text-[#3B82F6] px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile.ageGroup}
                  </div>
                )}
                {isAthleteProfile && (
                  <div className="bg-blue-50 text-[#3B82F6] px-3 py-1 rounded-full text-sm font-medium">
                    Athlete
                  </div>
                )}
                {isMentorProfile && (
                  <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                    Mentor
                  </div>
                )}
                {isCoachProfile && (
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Coach
                  </div>
                )}
                {isAdminProfile && (
                  <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    {userProfile?.adminRole === "clubAdmin" ? "Club Admin" : "Parent/Guardian"}
                  </div>
                )}
              </div>
            </div>
          </div>


          {isAdminProfile && userProfile?.bio && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {userProfile.bio}
            </div>
          )}

          {/* Profile details - Team, City, Age Group, Age for Athletes */}
          {isAthleteProfile && athleteInfoCards.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {athleteInfoCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                    {card.label}
                  </p>
                  <p className="text-[#0F172A] font-semibold text-base">{card.value.toLowerCase()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Profile details - Team, Region, Division, Age Group for Coaches */}
          {isCoachProfile && coachInfoCards.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {coachInfoCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                    {card.label}
                  </p>
                  <p className="text-[#0F172A] font-semibold text-base">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Athletic Metrics Grid - for athletes only (8 cards) */}
          {isAthleteProfile && athleteStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {athleteStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center"
                  >
                    <div className="mb-2 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium mb-1.5">{stat.label}</p>
                    <div className="flex flex-col items-center">
                      <p className="text-[#0F172A] font-bold text-lg">{stat.value}</p>
                      {stat.badge && (
                        <span className="text-[10px] font-semibold text-[#F59E0B] mt-0.5">
                          {stat.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Coach/Admin Stats - Single full-width card for coaches, multi-column for admins */}
          {(isCoachProfile || isAdminProfile) && stats.length > 0 && (
            <div className={statsGridClass}>
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center ${
                      isCoachProfile ? "w-full" : ""
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#3B82F6]" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium mb-1.5">{stat.label}</p>
                    <div className="flex flex-col items-center">
                      <p className="text-[#0F172A] font-bold text-lg">{stat.value}</p>
                      {stat.badge && (
                        <span className="text-[10px] font-semibold text-[#F59E0B] mt-0.5">
                          {stat.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Mentor Performance Stats - Height, Weight, Vertical, Highlights */}
          {isMentorProfile && mentorStats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Performance Stats</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {mentorStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center"
                    >
                      <div className="mb-2 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#3B82F6]" />
                      </div>
                      <p className="text-slate-500 text-xs font-medium mb-1.5">{stat.label}</p>
                      <p className="text-[#0F172A] font-bold text-lg">{stat.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mentorship Info Section - ONLY for mentors */}
          {isMentorProfile && (
            <div>
              <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Mentorship Info</h3>
              <div className="space-y-3">
                {(userProfile?.university || userProfile?.experienceYears) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userProfile?.university && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                          University
                        </p>
                        <p className="text-[#0F172A] font-medium">{userProfile.university}</p>
                      </div>
                    )}
                    {userProfile?.experienceYears && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1.5">
                          Years of Experience
                        </p>
                        <p className="text-[#0F172A] font-medium">{userProfile.experienceYears} years</p>
                      </div>
                    )}
                  </div>
                )}
                {userProfile?.focusAreas && (
                  <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                      Focus Areas
                    </p>
                    <p className="text-sm text-indigo-900 whitespace-pre-line">{userProfile.focusAreas}</p>
                  </div>
                )}
                {userProfile?.contactLink && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Preferred Contact</p>
                    <a
                      href={userProfile.contactLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#2563EB] underline break-all hover:text-[#1D4ED8] transition-colors"
                    >
                      {userProfile.contactLink}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          {isAdminProfile && adminInfoCards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {adminInfoCards.map((card) => {
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
          {/* Mentor Bio & Achievements Section - ONLY for mentors */}
          {isMentorProfile && (
            <div className="space-y-3">
              {userProfile?.volleyballBackground && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                    Volleyball Background
                  </p>
                  <p className="text-sm text-[#111827] leading-relaxed whitespace-pre-line">
                    {userProfile.volleyballBackground}
                  </p>
                </div>
              )}
              {userProfile?.bio && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Bio</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{userProfile.bio}</p>
                </div>
              )}
              {userProfile?.achievements && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-[#92400E] uppercase tracking-wide mb-2">Achievements</p>
                  <p className="text-sm text-[#B45309] whitespace-pre-line">{userProfile.achievements}</p>
                </div>
              )}
            </div>
          )}
          {/* OG LockerLink User Badge */}
          {isAthleteProfile && userProfile?.ogLockerLinkUser && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100 px-5 py-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white font-bold text-sm flex-shrink-0">
                OG
              </div>
              <div className="text-sm">
                <p className="font-bold text-[#92400E]">OG LockerLink User</p>
                <p className="text-xs text-[#B45309] mt-0.5">Thanks for being part of the first wave of the LockerLink community.</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <motion.button
              onClick={() => setShowEditForm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-white text-sm font-medium transition-all duration-200 hover:bg-[#2563EB] shadow-sm hover:shadow-md touch-manipulation min-h-[40px]"
            >
              Edit Profile
            </motion.button>
            {isAthleteProfile && (
              <Link href="/match" className="contents">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#3B82F6] bg-white px-3 py-2 text-[#3B82F6] text-sm font-medium transition-all duration-200 hover:bg-blue-50 touch-manipulation min-h-[40px]"
                >
                  Find Match
                </motion.button>
              </Link>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowManagePosts(true)}
              className={`w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-600 text-sm font-medium transition-all duration-200 hover:bg-slate-50 touch-manipulation min-h-[40px] ${isAthleteProfile ? '' : 'sm:col-span-2'}`}
            >
              Manage Posts
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSwitchUserTypeModal(true)}
              className="w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 text-sm font-medium transition-all duration-200 hover:bg-red-100 touch-manipulation min-h-[40px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch User Type</span>
              <span className="sm:hidden">Switch</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Switch User Type Confirmation Modal */}
      {showSwitchUserTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-[#111827]">Switch User Type?</h2>
            </div>
            <p className="text-slate-600 mb-2">
              This will <strong className="text-red-600">permanently delete</strong> all your profile information, including:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-1 text-sm">
              <li>All profile data (team, position, metrics, bio, etc.)</li>
              <li>All highlight videos</li>
              <li>Your current user type settings</li>
            </ul>
            <p className="text-slate-700 font-medium mb-6">
              You will be redirected to choose a new user type and create a new profile from scratch.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSwitchUserTypeModal(false)}
                disabled={switchingUserType}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchUserType}
                disabled={switchingUserType}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {switchingUserType ? "Switching..." : "Yes, Switch User Type"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {(isAthleteProfile || isMentorProfile) && (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {highlights.map((highlight, index) => {
                const isDeleting = deletingHighlightId === highlight.id;
                return (
                  <Link
                    key={highlight.id}
                    href={{
                      pathname: `/highlights/${highlight.id}`,
                      query: { returnUrl: "/profile" },
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative aspect-[4/5] sm:aspect-square bg-slate-100 rounded-2xl overflow-hidden group cursor-pointer"
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
              <p className="text-sm">No highlights yet. Click "Upload" to add your first highlight!</p>
            </div>
          )}
        </div>
      )}

      {/* Coach/Admin Highlights Section */}
      {(isCoachProfile || isAdminProfile) && (
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#0F172A] font-semibold">My Highlights</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <p className="text-sm">
              Coaches and admins don't upload highlights, but you can post training updates or share links instead.
            </p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (isAthleteProfile || isMentorProfile) && (
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
                <label
                  htmlFor="highlight-video"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1E293B] text-white px-4 py-2 text-sm font-semibold shadow-md hover:bg-[#111827] transition-colors cursor-pointer"
                >
                  Choose Video
                  {videoFile?.name && (
                    <span className="text-xs font-normal text-white/80 truncate max-w-[160px]">
                      {videoFile.name}
                    </span>
                  )}
                </label>
                <input
                  id="highlight-video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {!videoFile?.name && (
                  <p className="mt-2 text-xs text-slate-500">MP4 or MOV recommended • Max 200 MB</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Thumbnail (optional)</label>
                <label
                  htmlFor="highlight-thumbnail"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1F2937] text-white px-4 py-2 text-sm font-semibold shadow-md hover:bg-[#0F172A] transition-colors cursor-pointer"
                >
                  Choose Image
                  {thumbnailFile?.name && (
                    <span className="text-xs font-normal text-white/80 truncate max-w-[160px]">
                      {thumbnailFile.name}
                    </span>
                  )}
                </label>
                <input
                  id="highlight-thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {!thumbnailFile?.name && (
                  <p className="mt-2 text-xs text-slate-500">PNG or JPG • 16:9 ratio looks best</p>
                )}
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
