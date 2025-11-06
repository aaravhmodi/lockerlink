"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";

interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  updatedAt: number;
}

interface ChatWithUser extends Chat {
  otherUserName: string;
  otherUserPhoto?: string;
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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200"></div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No conversations yet. Start chatting from Explore!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          href={`/messages/${chat.id}`}
          className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
            {chat.otherUserPhoto ? (
              <img
                src={chat.otherUserPhoto}
                alt={chat.otherUserName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                {chat.otherUserName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{chat.otherUserName}</div>
            <div className="text-sm text-gray-500 truncate">{chat.lastMessage || "No messages yet"}</div>
          </div>
          <div className="text-xs text-gray-400">
            {new Date(chat.updatedAt * 1000).toLocaleDateString()}
          </div>
        </Link>
      ))}
    </div>
  );
}

