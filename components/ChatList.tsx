"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import Image from "next/image";

interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: number | { seconds?: number; nanoseconds?: number };
}

interface ChatWithUser extends Chat {
  otherUserName: string;
  otherUserPhoto?: string;
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

export default function ChatList() {
  const { user } = useUser();
  const [chats, setChats] = useState<ChatWithUser[]>([]);
  const [loading, setLoading] = useState(true);

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
              otherUserName: userData?.name || "Unknown",
              otherUserPhoto: userData?.photoURL,
            });
          } catch (error) {
            console.error("Error fetching user:", error);
            chatsData.push({
              ...chat,
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F3F4F6]"></div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
        <p className="text-[#6B7280]">No conversations yet. Start chatting from Explore!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chats.map((chat, index) => {
        // Handle both number and Firestore Timestamp formats
        const timestamp = typeof chat.updatedAt === 'number' 
          ? chat.updatedAt 
          : (chat.updatedAt?.seconds || 0) * 1000;
        const formattedDate = formatDate(timestamp);
        
        return (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={`/messages/${chat.id}`}
              className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-[#007AFF]/20"
            >
              <div className="h-14 w-14 overflow-hidden rounded-full bg-[#F3F4F6] border-2 border-[#E5E7EB]">
                {chat.otherUserPhoto ? (
                  <Image
                    src={chat.otherUserPhoto}
                    alt={chat.otherUserName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#9CA3AF]">
                    {chat.otherUserName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#111827] truncate">{chat.otherUserName}</div>
                <div className="text-sm text-[#6B7280] truncate">{chat.lastMessage || "No messages yet"}</div>
              </div>
              <div className="text-xs text-[#9CA3AF] whitespace-nowrap">{formattedDate}</div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
