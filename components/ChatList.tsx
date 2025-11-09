"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronRight, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: number | { seconds?: number; nanoseconds?: number };
}

interface ChatWithUser extends Chat {
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  otherUserType?: string;
}

// Helper function to format date consistently
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Format as MM/DD/YYYY for consistency
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

interface ChatListProps {
  searchTerm?: string;
}

export default function ChatList({ searchTerm = "" }: ChatListProps) {
  const { user } = useUser();
  const [chats, setChats] = useState<ChatWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData: ChatWithUser[] = [];

      for (const chatDoc of snapshot.docs) {
        const chat = { id: chatDoc.id, ...chatDoc.data() } as Chat;
        const otherUserId = chat.participants.find((id) => id !== user.uid);

        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            const userData = userDoc.data();
            chatsData.push({
              ...chat,
              otherUserId,
              otherUserName: userData?.name || "Unknown",
              otherUserPhoto: userData?.photoURL,
              otherUserType: userData?.userType || "athlete",
            });
          } catch (error) {
            console.error("Error fetching user:", error);
            chatsData.push({
              ...chat,
              otherUserId,
              otherUserName: "Unknown",
            });
          }
        }
      }

      setChats(chatsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteChat = async (chatId: string) => {
    if (!user || deletingId) return;
    const confirmDelete = window.confirm("Delete this conversation? This cannot be undone.");
    if (!confirmDelete) return;

    setDeletingId(chatId);
    setError(null);
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const messagesSnap = await getDocs(collection(db, "chats", chatId, "messages"));
      const batch = writeBatch(db);

      messagesSnap.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      batch.delete(chatDocRef);

      await batch.commit();
    } catch (deleteError: any) {
      console.error("Error deleting chat:", deleteError);
      setError(deleteError.message || "Failed to delete chat. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F3F4F6]"></div>
        ))}
      </div>
    );
  }

  const filteredChats = chats.filter((chat) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      chat.otherUserName.toLowerCase().includes(term) ||
      (chat.lastMessage || "").toLowerCase().includes(term) ||
      (chat.otherUserType || "").toLowerCase().includes(term)
    );
  });

  if (filteredChats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <p className="text-slate-600 mb-2">No conversations yet</p>
          <p className="text-sm text-slate-500">Start connecting with other players to begin chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {filteredChats.map((chat, index) => {
        // Handle both number and Firestore Timestamp formats
        const timestamp = typeof chat.updatedAt === 'number' 
          ? chat.updatedAt 
          : (chat.updatedAt?.seconds || 0) * 1000;
        const formattedDate = formatDate(timestamp);
        
        // Mock online status - in production, check presence system
        const isOnline = Math.random() > 0.5; // Replace with actual online status
        
        return (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="px-4 py-3 flex items-center gap-3 sm:gap-4">
              <Link
                href={`/messages/${chat.id}`}
                className="flex flex-1 items-center gap-3 sm:gap-4 min-w-0 overflow-hidden rounded-2xl px-1.5 py-1"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {chat.otherUserPhoto ? (
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
                      <Image
                        src={chat.otherUserPhoto}
                        alt={chat.otherUserName}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#3B82F6] to-[#2563EB] rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        {chat.otherUserName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#10B981] border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Message preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-[#0F172A] truncate font-medium max-w-[55vw] sm:max-w-[260px]">
                        {chat.otherUserName}
                      </h4>
                      {chat.otherUserType && (
                        <span
                          className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            chat.otherUserType === "coach"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-blue-50 border-blue-200 text-blue-600"
                          }`}
                        >
                          {chat.otherUserType === "coach" ? "Coach" : "Athlete"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formattedDate}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm truncate mt-1">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </Link>

              <button
                onClick={() => handleDeleteChat(chat.id)}
                disabled={deletingId === chat.id}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              >
                {deletingId === chat.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
