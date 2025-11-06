"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { HiPaperAirplane } from "react-icons/hi";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface ChatWindowProps {
  chatId: string;
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchChatInfo = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const chat = chatDoc.data();
          const otherUserId = chat.participants.find((id: string) => id !== user.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              setOtherUserName(userDoc.data().name || "Unknown");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching chat info:", error);
      }
    };

    fetchChatInfo();

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: user.uid,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      });

      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (chatDoc.exists()) {
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: messageText.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F9FAFB]">
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
        <h2 className="text-lg font-semibold text-[#111827]">{otherUserName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                message.senderId === user?.uid
                  ? "bg-[#007AFF] text-white"
                  : "bg-white text-[#111827] border border-[#E5E7EB]"
              }`}
            >
              {message.text}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-[#E5E7EB] bg-white p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
          <motion.button
            type="submit"
            disabled={!messageText.trim()}
            whileHover={{ scale: messageText.trim() ? 1.05 : 1 }}
            whileTap={{ scale: messageText.trim() ? 0.95 : 1 }}
            className="rounded-xl bg-[#007AFF] px-5 sm:px-6 py-3 text-white transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px] min-w-[44px]"
          >
            <HiPaperAirplane className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
