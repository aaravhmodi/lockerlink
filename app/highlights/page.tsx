"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { collection, query, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, increment, onSnapshot, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import { motion } from "framer-motion";
import { Trophy, Clock, Upload, Flame, Star, ArrowLeft, Play, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { uploadImageToCloudinary, uploadVideoToCloudinary } from "@/utils/uploadToCloudinary";

interface Highlight {
  id: string;
  userId: string;
  userName?: string;
  userUsername?: string;
  userPhotoURL?: string;
  userPosition?: string;
  videoURL?: string;
  videoPublicId?: string;
  thumbnailURL?: string;
  title: string;
  description?: string;
  upvotes: number;
  createdAt: number;
  rank?: number;
  likedBy?: string[];
  commentsCount?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  endDate: number;
  category: string;
  entries: number;
}

export default function HighlightsPage() {
  const { user } = useUser();
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Challenge data (static for now)
      setCurrentChallenge({
        id: "challenge-1",
        title: "Best Block Challenge 🔥",
        description: "Show us your best blocking technique! Winners get featured on our homepage.",
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
        category: "Blocking",
        entries: 1200,
      });

      const highlightsQuery = query(
        collection(db, "highlights"),
        orderBy("createdAt", "desc"),
        limit(25)
      );

      const unsubscribe = onSnapshot(highlightsQuery, (snapshot) => {
        const highlightData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            upvotes: data.upvotes || 0,
            likedBy: data.likedBy || [],
            commentsCount: data.commentsCount || 0,
          } as Highlight;
        });

        const ranked = [...highlightData]
          .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
          .map((highlight, index) => ({
            ...highlight,
            rank: index < 3 ? index + 1 : undefined,
          }));

        setHighlights(ranked);
        setLoading(false);
      }, (error) => {
        console.error("Error listening for highlights:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading highlights:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;

    loadData().then((fn) => {
      if (typeof fn === "function") {
        unsubscribe = fn;
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const handleUpload = async () => {
    if (!user || !videoFile || !uploadTitle.trim() || uploading) return;

    setUploading(true);
    try {
      const [videoUpload, userDocSnap] = await Promise.all([
        uploadVideoToCloudinary(videoFile),
        getDoc(doc(db, "users", user.uid)),
      ]);

      const userProfile = userDocSnap.exists() ? userDocSnap.data() : null;

      let thumbnailURL = "";
      if (thumbnailFile) {
        const thumbnailUpload = await uploadImageToCloudinary(thumbnailFile);
        thumbnailURL = thumbnailUpload.secureUrl;
      } else {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (cloudName) {
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
        challengeId: currentChallenge?.id || "",
      });

      setVideoFile(null);
      setThumbnailFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setShowUploadModal(false);
      alert("Highlight uploaded successfully!");
    } catch (error) {
      console.error("Error uploading highlight:", error);
      alert("Failed to upload highlight. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpvote = async (highlightId: string) => {
    if (!user) return;

    const highlight = highlights.find((h) => h.id === highlightId);
    if (!highlight) return;

    const hasLiked = highlight.likedBy?.includes(user.uid);

    try {
      const highlightRef = doc(db, "highlights", highlightId);
      await updateDoc(highlightRef, {
        upvotes: increment(hasLiked ? -1 : 1),
        likedBy: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? {
                ...h,
                upvotes: (h.upvotes || 0) + (hasLiked ? -1 : 1),
                likedBy: hasLiked
                  ? (h.likedBy || []).filter((id) => id !== user.uid)
                  : [...(h.likedBy || []), user.uid],
              }
            : h
        )
      );
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

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
    if (rank === 1) return <Flame className="w-5 h-5" />;
    if (rank === 2) return <Star className="w-5 h-5" />;
    if (rank === 3) return <Trophy className="w-5 h-5" />;
    return null;
  };

  return (
    <ProfileGuard>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />
        
        {/* Header */}
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white">
          <div className="max-w-2xl mx-auto px-4 pt-0 pb-6 md:py-6">
            <Link href="/home" className="mb-4 inline-block p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            {currentChallenge && (
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="mb-2 text-2xl font-semibold">{currentChallenge.title}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{formatTimeRemaining(currentChallenge.endDate)}</span>
                    </div>
                    <div className="bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm">
                      <span className="text-sm">{currentChallenge.entries.toLocaleString()} entries</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload section */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-br from-[#FACC15] to-[#F59E0B] rounded-2xl p-6 shadow-lg cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white mb-1 font-semibold">Submit Your Highlight</h3>
                <p className="text-amber-100 text-sm">Upload your best block and win prizes!</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Top Highlights */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#0F172A] font-semibold">Top Submissions</h2>
            <Link href="/highlights?view=all">
              <button className="text-[#3B82F6] text-sm font-medium hover:underline">
                View All
              </button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Loading highlights...</p>
            </div>
          ) : highlights.length > 0 ? (
            <div className="space-y-4">
              {highlights.map((highlight, index) => (
                <motion.div
                  key={highlight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-md overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Rank badge */}
                    {highlight.rank && (
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 bg-gradient-to-br ${getRankColor(highlight.rank)} rounded-xl flex items-center justify-center text-white shadow-md mb-2`}>
                          {getRankIcon(highlight.rank) || <span className="text-lg">#{highlight.rank}</span>}
                        </div>
                        <span className="text-xs text-slate-500">Rank</span>
                      </div>
                    )}

                    {/* Video thumbnail */}
                    <Link href={`/highlights/${highlight.id}`}>
                      <div className="relative w-32 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer">
                        {highlight.thumbnailURL ? (
                          <Image
                            src={highlight.thumbnailURL}
                            alt={highlight.title}
                            width={128}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                          <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 text-[#3B82F6] ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[#0F172A] truncate mb-1 font-semibold">{highlight.title}</h4>
                      <p className="text-slate-500 text-sm mb-2">by {highlight.userName || "Anonymous"}</p>
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 text-[#3B82F6] px-2 py-1 rounded-md text-xs font-medium">
                          {highlight.upvotes.toLocaleString()} {highlight.upvotes === 1 ? "like" : "likes"}
                        </div>
                        <div className="bg-slate-100 text-[#6B7280] px-2 py-1 rounded-md text-xs font-medium">
                          {highlight.commentsCount || 0} {highlight.commentsCount === 1 ? "comment" : "comments"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vote button */}
                  <div className="border-t border-slate-100 p-3">
                    <motion.button
                      onClick={() => handleUpvote(highlight.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full rounded-xl px-4 py-2 font-medium transition-all ${
                        highlight.likedBy?.includes(user?.uid || "")
                          ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white'
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {highlight.likedBy?.includes(user?.uid || "") ? 'Liked! 🔥' : 'Like this highlight'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-slate-200 bg-white p-12 text-center"
            >
              <Flame className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#111827] mb-2">No highlights yet</h3>
              <p className="text-slate-600 mb-6">Be the first to upload a highlight!</p>
              <motion.button
                onClick={() => setShowUploadModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-xl bg-[#007AFF] px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
              >
                <Upload className="w-5 h-5" />
                Upload Highlight
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Challenge info */}
        {currentChallenge && (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h3 className="text-[#0F172A] mb-3 font-semibold">Challenge Details</h3>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-[#FACC15] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="mb-1">
                      <span className="text-[#0F172A] font-medium">Prizes:</span> Winner gets featured on the app and LockerLink merch
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="mb-1">
                      <span className="text-[#0F172A] font-medium">Deadline:</span> Submit by {new Date(currentChallenge.endDate).toLocaleDateString()} at 11:59 PM
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-[#F43F5E] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="mb-1">
                      <span className="text-[#0F172A] font-medium">Rules:</span> Must be original gameplay, max 30 seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  onClick={() => setShowUploadModal(false)}
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
    </ProfileGuard>
  );
}
