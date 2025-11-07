"use client";

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Share2, User, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

interface Highlight {
  id: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  userUsername?: string;
  userPosition?: string;
  videoURL?: string;
  thumbnailURL?: string;
  title: string;
  description?: string;
  upvotes: number;
  createdAt: number;
  views?: number;
}

export default function HighlightViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUser();
  const router = useRouter();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const resolvedParams = use(params);
  const highlightId = resolvedParams.id;

  useEffect(() => {
    if (!user) return;
    loadHighlight();
  }, [user, highlightId]);

  const loadHighlight = async () => {
    if (!highlightId) return;

    setLoading(true);
    try {
      // In production, fetch from Firestore
      // const highlightDoc = await getDoc(doc(db, "highlights", highlightId));
      // if (highlightDoc.exists()) {
      //   const data = highlightDoc.data();
      //   setHighlight({ id: highlightDoc.id, ...data } as Highlight);
      // }

      // Mock data for now
      const mockHighlight: Highlight = {
        id: highlightId,
        userId: "1",
        userName: "Marcus Chen",
        userUsername: "marcus_chen",
        userPosition: "Middle Blocker",
        title: "Game winning block",
        description: "Incredible block in the final set against Team X!",
        upvotes: 1247,
        views: 15234,
        createdAt: Date.now(),
      };

      setHighlight(mockHighlight);
    } catch (error) {
      console.error("Error loading highlight:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user || !highlight || hasUpvoted) return;

    try {
      const highlightRef = doc(db, "highlights", highlight.id);
      await updateDoc(highlightRef, {
        upvotes: increment(1),
      });

      setHighlight({ ...highlight, upvotes: highlight.upvotes + 1 });
      setHasUpvoted(true);
    } catch (error) {
      console.error("Error upvoting:", error);
    }
  };

  if (loading) {
    return (
      <ProfileGuard>
        <div className="min-h-screen bg-[#0F172A] pb-20 md:pb-0">
          <Navbar />
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white/80">Loading video...</p>
            </div>
          </div>
        </div>
      </ProfileGuard>
    );
  }

  if (!highlight) {
    return (
      <ProfileGuard>
        <div className="min-h-screen bg-[#0F172A] pb-20 md:pb-0">
          <Navbar />
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-white/80 mb-4">Highlight not found</p>
              <Link href="/highlights">
                <button className="bg-[#3B82F6] text-white px-6 py-3 rounded-xl font-medium">
                  Back to Highlights
                </button>
              </Link>
            </div>
          </div>
        </div>
      </ProfileGuard>
    );
  }

  return (
    <ProfileGuard>
      <div className="min-h-screen bg-[#0F172A] pb-20 md:pb-0">
        <Navbar />
        
        {/* Video Player Section */}
        <div className="relative w-full bg-black">
          {/* Back Button */}
          <div className="absolute top-4 left-4 z-20">
            <Link href="/home">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>

          {/* Video Container */}
          <div className="relative aspect-video w-full max-w-4xl mx-auto">
            {highlight.videoURL ? (
              <video
                src={highlight.videoURL}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              >
                Your browser does not support the video tag.
              </video>
            ) : highlight.thumbnailURL ? (
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <Image
                  src={highlight.thumbnailURL}
                  alt={highlight.title}
                  fill
                  className="object-contain"
                />
                {!playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-10 h-10 text-[#3B82F6] ml-1" fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <Play className="w-20 h-20 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">No video available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Info Section */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            {/* User Info */}
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/profile/${highlight.userId}`}>
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex-shrink-0">
                  {highlight.userPhotoURL ? (
                    <Image
                      src={highlight.userPhotoURL}
                      alt={highlight.userName || "User"}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-semibold text-lg">
                      {highlight.userName?.[0] || "?"}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${highlight.userId}`}>
                  <h3 className="font-semibold text-[#0F172A] hover:text-[#3B82F6] transition-colors">
                    {highlight.userName || "Anonymous"}
                  </h3>
                </Link>
                {highlight.userUsername && (
                  <p className="text-sm text-slate-500">@{highlight.userUsername}</p>
                )}
                {highlight.userPosition && (
                  <p className="text-sm text-slate-600">{highlight.userPosition}</p>
                )}
              </div>
            </div>

            {/* Title and Description */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#0F172A] mb-2">{highlight.title}</h1>
              {highlight.description && (
                <p className="text-slate-700 leading-relaxed">{highlight.description}</p>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
              <motion.button
                onClick={handleUpvote}
                disabled={hasUpvoted}
                whileHover={{ scale: hasUpvoted ? 1 : 1.1 }}
                whileTap={{ scale: hasUpvoted ? 1 : 0.9 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  hasUpvoted
                    ? 'bg-[#F43F5E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${hasUpvoted ? 'fill-white' : ''}`} />
                <span>{highlight.upvotes.toLocaleString()}</span>
              </motion.button>

              <div className="flex items-center gap-2 text-slate-600">
                <MessageCircle className="w-5 h-5" />
                <span>42</span>
              </div>

              {highlight.views && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Play className="w-5 h-5" />
                  <span>{highlight.views.toLocaleString()} views</span>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="ml-auto p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Related Highlights */}
            <div className="mt-6">
              <h3 className="font-semibold text-[#0F172A] mb-4">More Highlights</h3>
              <Link href="/highlights">
                <button className="w-full rounded-xl bg-[#3B82F6] text-white px-6 py-3 font-medium hover:bg-[#2563EB] transition-colors">
                  View All Highlights
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProfileGuard>
  );
}

