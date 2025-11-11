"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { HiPaperAirplane } from "react-icons/hi";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: number | { seconds: number; nanoseconds: number };
  // Support legacy 'timestamp' field for backward compatibility
  timestamp?: number | { seconds: number; nanoseconds: number };
};

interface ChatWindowProps {
  chatId: string;
}

// Helper to format time
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// Helper to normalize timestamp to milliseconds
const toMillis = (t: number | { seconds: number; nanoseconds?: number } | undefined): number => {
  if (!t) return Date.now();
  if (typeof t === "number") return t;
  if (typeof t === "object" && "seconds" in t) return t.seconds * 1000;
  return Date.now();
};

// Helper to check if messages are from same sender and within 5 minutes
function shouldGroupMessages(prev: Message | null, current: Message): boolean {
  if (!prev) return false;
  if (prev.senderId !== current.senderId) return false;
  const prevTime = toMillis(prev.createdAt || prev.timestamp);
  const currentTime = toMillis(current.createdAt || current.timestamp);
  const timeDiff = currentTime - prevTime;
  return timeDiff < 300000; // 5 minutes in milliseconds
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [otherUser, setOtherUser] = useState<{ id: string; name: string; username?: string; photoURL?: string; userType?: string } | null>(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      console.warn("ChatWindow: User not authenticated yet");
      return;
    }

    console.log("ChatWindow: Current UID:", user.uid);
    console.log("ChatWindow: Listening to chat:", chatId);

    const fetchChatInfo = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const chat = chatDoc.data();
          const otherUserId = chat.participants.find((id: string) => id !== user.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, "users", otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setOtherUser({
                id: otherUserId,
                name: userData.name || "Unknown",
                username: userData.username || "",
                photoURL: userData.photoURL,
                userType: userData.userType || "athlete",
              });
            } else {
              setOtherUser({
                id: otherUserId,
                name: "Unknown",
              });
            }
          }
          
          // Get current user's photo
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          if (currentUserDoc.exists()) {
            setCurrentUserPhoto(currentUserDoc.data().photoURL || "");
          }
        } else {
          setError("Chat not found");
        }
      } catch (error) {
        console.error("Error fetching chat info:", error);
        setError("Failed to load chat");
      }
    };

    fetchChatInfo();

    // Listen to messages in real-time from subcollection
    // Path: /chats/{chatId}/messages (nested subcollection)
    const messagesRef = collection(db, "chats", chatId, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    console.log("ChatWindow: Setting up listener for messages subcollection");

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        console.log(`ChatWindow: Received ${snapshot.docs.length} messages`);
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        
        // Convert Firestore timestamps to numbers (safe universal parser)
        // Support both 'createdAt' (preferred) and 'timestamp' (legacy)
        const processedMessages = messagesData.map((msg: Message) => {
          const timestamp = msg.createdAt || msg.timestamp;
          return {
            ...msg,
            createdAt:
              typeof timestamp === "object" && "seconds" in timestamp
                ? timestamp.seconds * 1000
                : typeof timestamp === "number"
                  ? timestamp
                  : Date.now(),
          };
        });
        
        setMessages(processedMessages);
        setLoading(false);
        setError("");
      },
      (error) => {
        console.error("ChatWindow: Error listening to messages:", error);
        console.error("ChatWindow: Error code:", error.code);
        console.error("ChatWindow: Error message:", error.message);
        setError(`Failed to load messages: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || sending) return;

    setSending(true);
    setError("");

    try {
      // Verify chat exists and user is a participant
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (!chatDoc.exists()) {
        setError("Chat not found");
        setSending(false);
        return;
      }

      const chat = chatDoc.data();
      console.log("ChatWindow: Chat participants:", chat.participants);
      console.log("ChatWindow: Current user UID:", user.uid);
      
      if (!chat.participants || !Array.isArray(chat.participants)) {
        setError("Invalid chat: missing participants array");
        setSending(false);
        return;
      }
      
      if (!chat.participants.includes(user.uid)) {
        console.error("ChatWindow: User not in participants array");
        setError("You are not a participant in this chat");
        setSending(false);
        return;
      }

      // Create message in subcollection
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });

      // Update chat's lastMessage and updatedAt
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageText.trim(),
        updatedAt: serverTimestamp(),
      });

      setMessageText("");
      inputRef.current?.focus();
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError(error.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user || deletingMessageId) return;

    setDeletingMessageId(messageId);
    setError("");

    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await deleteDoc(messageRef);

      const latestSnapshot = await getDocs(
        query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "desc"),
          limit(1)
        )
      );

      const latestData = latestSnapshot.docs[0]?.data();
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: latestData?.text || "",
        updatedAt: serverTimestamp(),
      });
    } catch (deleteError: any) {
      console.error("Error deleting message:", deleteError);
      setError(deleteError.message || "Failed to delete message. Please try again.");
    } finally {
      setDeletingMessageId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-[#6B7280]">Loading chat...</div>
      </div>
    );
  }

  if (error && !messages.length) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-[#FF3B30] mb-2">{error}</p>
          <p className="text-sm text-[#6B7280]">Please refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header - Instagram style */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-[#E5E7EB] bg-white px-3 sm:px-4 py-2.5 sm:py-3">
        {otherUser?.photoURL ? (
          <div className="h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full flex-shrink-0">
            <Image
              src={otherUser.photoURL}
              alt={otherUser.name}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#E5E7EB] flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-[#6B7280]">
              {otherUser?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#111827] truncate">{otherUser?.name || "Unknown"}</h2>
            {otherUser?.userType && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  otherUser.userType === "coach"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-blue-50 border-blue-200 text-blue-600 hidden sm:inline-flex"
                }`}
              >
                {otherUser.userType === "coach" ? "Coach" : "Athlete"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            {otherUser?.username && <span className="truncate">@{otherUser.username}</span>}
            <span>Active</span>
          </div>
        </div>
        {otherUser?.id && (
          <Link
            href={`/profile/${otherUser.id}`}
            className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-slate-50"
          >
            View Profile
          </Link>
        )}
      </div>

      {/* Safety reminder */}
      <div className="border-b border-[#E5E7EB] bg-amber-50 px-4 py-3 text-xs text-[#92400E]">
        Keep conversations respectful. Use safe language, avoid sharing personal info, and follow local laws and LockerLink community guidelines.
      </div>

      {/* Messages Area - Instagram style */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-3 sm:px-4 py-4 sm:py-6">
        <div className="space-y-1">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-[#6B7280] mb-1">No messages yet</p>
                <p className="text-xs text-[#9CA3AF]">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isSent = message.senderId === user?.uid;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showAvatar = !isSent && !shouldGroupMessages(prevMessage, message);
              const showTime = index === messages.length - 1 || 
                !shouldGroupMessages(message, messages[index + 1]);

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-1.5 sm:gap-2 ${isSent ? "justify-end" : "justify-start"} ${showAvatar ? "mt-4" : "mt-0.5"}`}
                >
                  {/* Avatar for received messages */}
                  {showAvatar && !isSent && (
                    <div className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 overflow-hidden rounded-full mb-1">
                      {otherUser?.photoURL ? (
                        <Image
                          src={otherUser.photoURL}
                          alt={otherUser.name}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#E5E7EB] flex items-center justify-center">
                          <span className="text-xs font-semibold text-[#6B7280]">
                            {otherUser?.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Spacer for sent messages to align properly */}
                  {isSent && <div className="w-5 sm:w-6 flex-shrink-0" />}

                  <div className={`flex flex-col ${isSent ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%]`}>
                    <div className="relative group">
                      <div
                        className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${
                          isSent
                            ? "bg-[#007AFF] text-white rounded-br-sm"
                            : "bg-white text-[#111827] border border-[#E5E7EB] rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">{message.text}</p>
                      </div>
                      {isSent && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                          className={`absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center rounded-full border border-white/60 bg-white/90 p-1 shadow-md transition hover:bg-white text-[#EF4444] ${deletingMessageId === message.id ? "opacity-100" : ""}`}
                          aria-label="Delete message"
                        >
                          {deletingMessageId === message.id ? (
                            <svg className="h-4 w-4 animate-spin text-[#EF4444]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    {showTime && (
                      <span className={`text-[10px] text-[#9CA3AF] mt-1 px-1 ${isSent ? "text-right" : "text-left"}`}>
                        {formatTime(toMillis(message.createdAt || message.timestamp))}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Instagram style */}
      {error && messages.length > 0 && (
        <div className="px-4 py-2 bg-[#FEF2F2] border-t border-[#FECACA]">
          <p className="text-xs text-[#DC2626]">{error}</p>
        </div>
      )}

      <form onSubmit={sendMessage} className="border-t border-[#E5E7EB] bg-white px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Message..."
              disabled={sending}
              className="w-full rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3 sm:px-4 py-2 sm:py-2.5 pr-10 sm:pr-12 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]/20 touch-manipulation disabled:bg-[#F3F4F6] disabled:cursor-not-allowed"
            />
            <motion.button
              type="submit"
              disabled={!messageText.trim() || sending}
              whileHover={{ scale: messageText.trim() && !sending ? 1.1 : 1 }}
              whileTap={{ scale: messageText.trim() && !sending ? 0.9 : 1 }}
              className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 rounded-full bg-[#007AFF] p-1.5 text-white transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed touch-manipulation min-h-[32px] min-w-[32px] flex items-center justify-center"
            >
              {sending ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HiPaperAirplane className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </form>
    </div>
  );
}

