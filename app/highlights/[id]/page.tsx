"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@/hooks/useUser";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatTimeAgo } from "@/utils/formatTime";

interface Highlight {
  id: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  userUsername?: string;
  userPosition?: string;
  userType?: "athlete" | "coach" | "admin" | "mentor";
  adminRole?: "parent" | "clubAdmin" | "";
  videoURL?: string;
  thumbnailURL?: string;
  title: string;
  description?: string;
  upvotes: number;
  createdAt: number;
  likedBy?: string[];
  commentsCount?: number;
  views?: number;
  submittedToChallenge?: boolean;
  challengeId?: string;
}

interface HighlightComment {
  id: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  text: string;
  createdAt: number;
}

export default function HighlightViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const highlightId = id;
  const { user } = useUser();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<HighlightComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get("returnUrl");
  const decodedReturnUrl = returnUrlParam ? decodeURIComponent(returnUrlParam) : null;
  const safeReturnUrl = decodedReturnUrl && decodedReturnUrl.startsWith("/") ? decodedReturnUrl : null;

  useEffect(() => {
    if (!highlightId) return;

    const loadHighlight = async () => {
      setLoading(true);
      try {
        const highlightDoc = await getDoc(doc(db, "highlights", highlightId));
        if (!highlightDoc.exists()) {
          setHighlight(null);
          return;
        }

        const data = highlightDoc.data() as any;
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
        const formattedHighlight: Highlight = {
          id: highlightDoc.id,
          ...data,
          userType,
          adminRole,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          upvotes: data.upvotes || 0,
          likedBy: data.likedBy || [],
          commentsCount: data.commentsCount || 0,
        };

        setHighlight(formattedHighlight);
        setIsLiked(!!data.likedBy?.includes(user?.uid || ""));
      } catch (error) {
        console.error("Error loading highlight:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHighlight();
  }, [highlightId, user?.uid]);

  useEffect(() => {
    if (!highlightId) return;

    const commentsRef = collection(db, "highlights", highlightId, "comments");
    const commentsQuery = query(commentsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || Date.now(),
        } as HighlightComment;
      });
      setComments(commentData);
    });

    return () => unsubscribe();
  }, [highlightId]);

  const handleLikeToggle = async () => {
    if (!user || !highlight) return;

    const highlightRef = doc(db, "highlights", highlight.id);
    const alreadyLiked = highlight.likedBy?.includes(user.uid);

    try {
      await updateDoc(highlightRef, {
        upvotes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // Handle points for liking/unliking
      if (!alreadyLiked) {
        // User is liking - award points to user and creator
        const { awardPoints, awardCreatorPoints } = await import("@/utils/pointsSystem");
        await awardPoints(user.uid, 2, "likeGiven", false); // Unlimited likes
        if (highlight.userId && highlight.userId !== user.uid) {
          await awardCreatorPoints(highlight.userId, 2); // Creator gets points for receiving like
        }
      } else {
        // User is unliking - deduct points
        const { deductPoints } = await import("@/utils/pointsSystem");
        await deductPoints(user.uid, 2);
        if (highlight.userId && highlight.userId !== user.uid) {
          await deductPoints(highlight.userId, 2); // Creator loses points
        }
      }

      setHighlight((prev) =>
        prev
          ? {
              ...prev,
              upvotes: (prev.upvotes || 0) + (alreadyLiked ? -1 : 1),
              likedBy: alreadyLiked
                ? (prev.likedBy || []).filter((id) => id !== user.uid)
                : [...(prev.likedBy || []), user.uid],
            }
          : prev
      );
      setIsLiked(!alreadyLiked);
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleAddComment = async () => {
    if (!user || !highlight || !commentText.trim() || addingComment) return;

    // Validate comment length (minimum 15 characters)
    const { validateCommentLength } = await import("@/utils/pointsSystem");
    if (!validateCommentLength(commentText)) {
      alert("Comments must be at least 15 characters long to earn points.");
      return;
    }

    setAddingComment(true);
    try {
      // Check daily limit and award points for commenting
      const { awardPoints, awardCreatorPoints } = await import("@/utils/pointsSystem");
      const pointsResult = await awardPoints(user.uid, 5, "commentGiven", true, 5);
      
      if (!pointsResult.success) {
        alert(pointsResult.message || "Daily limit reached");
        setAddingComment(false);
        return;
      }

      const commentsRef = collection(db, "highlights", highlight.id, "comments");
      await addDoc(commentsRef, {
        userId: user.uid,
        userName: user.displayName || "Player",
        userPhotoURL: user.photoURL || "",
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "highlights", highlight.id), {
        commentsCount: increment(1),
      });

      // Award points to creator for receiving comment
      if (highlight.userId && highlight.userId !== user.uid) {
        await awardCreatorPoints(highlight.userId, 5);
      }

      setHighlight((prev) =>
        prev
          ? {
              ...prev,
              commentsCount: (prev.commentsCount || 0) + 1,
            }
          : prev
      );

      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setAddingComment(false);
    }
  };

  const handleGoBack = () => {
    if (safeReturnUrl) {
      router.push(safeReturnUrl);
      return;
    }
    router.back();
  };

  const handleDeleteHighlight = async () => {
    if (!highlight || !user || highlight.userId !== user.uid || deleting) return;

    const confirmDelete = window.confirm("Delete this highlight? This can't be undone.");
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      // Deduct points for deleted highlight (10 points)
      const { deductPoints } = await import("@/utils/pointsSystem");
      await deductPoints(user.uid, 10);

      await deleteDoc(doc(db, "highlights", highlight.id));

      if (safeReturnUrl) {
        router.push(safeReturnUrl);
      } else {
        router.push("/highlights");
      }
    } catch (error) {
      console.error("Error deleting highlight:", error);
      alert("Failed to delete highlight. Please try again.");
    } finally {
      setDeleting(false);
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
        <div className="max-w-4xl mx-auto px-4 pt-6 flex items-center justify-between gap-3">
          <motion.button
            onClick={handleGoBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </motion.button>
          {highlight?.userId === user?.uid && (
            <motion.button
              onClick={handleDeleteHighlight}
              disabled={deleting}
              whileHover={{ scale: deleting ? 1 : 1.05 }}
              whileTap={{ scale: deleting ? 1 : 0.95 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#F43F5E] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#e11d48] disabled:opacity-70"
            >
              {deleting ? "Deleting..." : "Delete Highlight"}
            </motion.button>
          )}
        </div>
        
        {/* Video Player Section */}
        <div className="relative w-full bg-black">
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#0F172A] hover:text-[#3B82F6] transition-colors">
                      {highlight.userName || "Anonymous"}
                    </h3>
                    {highlight.userType && (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
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
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[#0F172A]">{highlight.title}</h1>
                {highlight.submittedToChallenge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FACC15] px-3 py-1 text-xs font-semibold text-[#0F172A]">
                    <Trophy className="w-3 h-3" />
                    Challenge Submission
                  </span>
                )}
              </div>
              {highlight.createdAt && (
                <p className="text-sm text-slate-500 mb-2">{formatTimeAgo(highlight.createdAt)}</p>
              )}
              {highlight.description && (
                <p className="text-slate-700 leading-relaxed">{highlight.description}</p>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
              <motion.button
                onClick={handleLikeToggle}
                disabled={!user}
                whileHover={{ scale: isLiked ? 1 : 1.1 }}
                whileTap={{ scale: isLiked ? 1 : 0.9 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isLiked
                    ? 'bg-[#F43F5E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                <span>{highlight.upvotes.toLocaleString()}</span>
              </motion.button>

              <div className="flex items-center gap-2 text-slate-600">
                <MessageCircle className="w-5 h-5" />
                <span>{highlight.commentsCount || 0}</span>
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

            {/* Comments Section */}
            <div className="mt-6">
              <h3 className="font-semibold text-[#0F172A] mb-4">Comments</h3>
              {user ? (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment();
                      }
                    }}
                    className="flex-1 p-2 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={addingComment}
                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-slate-600">Please <Link href="/" className="underline">log in</Link> to add comments.</p>
              )}
              <div className="mt-4 space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Link href={`/profile/${comment.userId}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                        {comment.userPhotoURL ? (
                          <Image
                            src={comment.userPhotoURL}
                            alt={comment.userName || "User"}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700 font-semibold text-lg">
                            {comment.userName?.[0] || "?"}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 bg-slate-100 rounded-lg p-3">
                      <p className="text-slate-800 font-medium">{comment.userName || "Anonymous"}</p>
                      <p className="text-slate-700">{comment.text}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(comment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
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

