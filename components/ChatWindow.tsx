"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";

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

    // Get other user info
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

    // Listen to messages
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

      // Update chat's lastMessage
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
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white p-4">
        <h2 className="text-lg font-semibold">{otherUserName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === user?.uid ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-lg px-4 py-2 ${
                message.senderId === user?.uid
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

