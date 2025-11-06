"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, getDocs, where, serverTimestamp } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import ChatList from "@/components/ChatList";
import { motion } from "framer-motion";
import { HiPlus } from "react-icons/hi";

export default function MessagesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.id !== user.uid);
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (showCreateModal) {
      fetchUsers();
    }
  }, [user, showCreateModal]);

  const createChat = async () => {
    if (!user || !selectedUserId) return;

    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      
      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants.includes(selectedUserId)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        router.push(`/messages/${existingChat}`);
      } else {
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [user.uid, selectedUserId],
          lastMessage: "",
          updatedAt: serverTimestamp(),
        });
        router.push(`/messages/${chatRef.id}`);
      }
      setShowCreateModal(false);
      setSelectedUserId("");
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Error creating chat");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 md:pb-0">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-semibold text-[#111827]"
          >
            Messages
          </motion.h1>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 sm:px-5 py-2.5 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
          >
            <HiPlus className="w-5 h-5" />
            <span className="hidden sm:inline">New Message</span>
            <span className="sm:hidden">New</span>
          </motion.button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#E5E7EB]"
            >
              <h2 className="text-2xl font-semibold mb-6 text-[#111827]">Start a New Conversation</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Select a user
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                >
                  <option value="">Choose a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.team && `(${u.team})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={createChat}
                  disabled={!selectedUserId}
                  whileHover={{ scale: !selectedUserId ? 1 : 1.02 }}
                  whileTap={{ scale: !selectedUserId ? 1 : 0.98 }}
                  className="flex-1 rounded-xl bg-[#007AFF] px-4 py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
                >
                  Start Chat
                </motion.button>
                <motion.button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedUserId("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 rounded-xl border border-[#E5E7EB] px-4 py-3 text-[#111827] font-medium transition-all duration-200 hover:bg-[#F9FAFB] touch-manipulation min-h-[44px]"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        <ChatList />
      </div>
    </div>
  );
}
