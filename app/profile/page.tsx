"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";
import { motion } from "framer-motion";
import { Settings, MapPin, Award, Play, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";

interface UserProfile {
  name: string;
  username?: string;
  team?: string;
  position?: string;
  age?: number;
  city?: string;
  photoURL?: string;
  bio?: string;
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
}

export default function ProfilePage() {
  const { user, loading } = useUser();
  const { isComplete } = useProfileComplete();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Auto-show edit form if profile is incomplete
  useEffect(() => {
    if (!loading && !profileLoading && !isComplete) {
      setShowEditForm(true);
    }
  }, [loading, profileLoading, isComplete]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          name: data.name || "Player",
          username: data.username,
          team: data.team,
          position: data.position,
          age: data.age,
          city: data.city,
          photoURL: data.photoURL,
          bio: data.bio,
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

  const handleUpload = async () => {
    if (!user || !videoFile || !uploadTitle.trim() || uploading) return;

    setUploading(true);
    try {
      const thumbnailURL = thumbnailFile ? await uploadToCloudinary(thumbnailFile) : "";

      await addDoc(collection(db, "highlights"), {
        userId: user.uid,
        videoURL: "", // Replace with video upload logic
        thumbnailURL,
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        upvotes: 0,
        createdAt: serverTimestamp(),
        challengeId: "",
      });

      setVideoFile(null);
      setThumbnailFile(null);
      setUploadTitle("");
      setUploadDescription("");
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

  const stats = [
    { label: "Highlights", value: highlights.length.toString(), icon: Play },
  ];

  if (loading || profileLoading) {
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
      </div>

      {/* Profile banner */}
      <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] h-32" />

      {/* Profile info */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-start gap-4 mb-4">
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
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-semibold text-[#0F172A]">{userProfile?.name || "Player"}</h1>
                <Award className="w-5 h-5 text-[#3B82F6]" />
              </div>
              {userProfile?.username && (
                <p className="text-slate-500 text-sm mb-2">@{userProfile.username}</p>
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
                {userProfile?.age && (
                  <div className="bg-blue-50 text-[#3B82F6] px-3 py-1 rounded-full text-sm font-medium border-0">
                    {userProfile.age} years old
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {userProfile?.bio && (
            <p className="text-slate-700 mb-4 leading-relaxed">{userProfile.bio}</p>
          )}

          {/* Team */}
          {userProfile?.team && (
            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <p className="text-slate-500 text-sm mb-1">Current Team</p>
              <p className="text-[#0F172A] font-medium">{userProfile.team}</p>
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div className="grid grid-cols-1 gap-3 mb-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <Icon className="w-5 h-5 text-[#3B82F6] mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-[#0F172A] font-medium">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => setShowEditForm(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white px-6 py-3 font-medium shadow-sm hover:shadow-md transition-all"
            >
              Edit Profile
            </motion.button>
            <Link href="/match">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-xl border border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50 px-6 py-3 font-medium transition-all"
              >
                Find Match
              </motion.button>
            </Link>
          </div>
        </div>
      </div>

      {/* Highlights section */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#0F172A] font-semibold">My Highlights</h2>
          <motion.button
            onClick={() => setShowUploadModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-sm font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload
          </motion.button>
        </div>
        {highlights.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {highlights.map((highlight, index) => (
              <Link key={highlight.id} href={`/highlights/${highlight.id}`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden group cursor-pointer"
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
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Play className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No highlights yet</p>
            <motion.button
              onClick={() => setShowUploadModal(true)}
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setVideoFile(null);
                  setThumbnailFile(null);
                  setUploadTitle("");
                  setUploadDescription("");
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
    </div>
  );
}
