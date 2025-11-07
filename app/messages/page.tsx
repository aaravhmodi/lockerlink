"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, getDocs, where, serverTimestamp, onSnapshot } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import ChatList from "@/components/ChatList";
import { motion } from "framer-motion";
import { Search, ChevronRight, Plus, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function MessagesPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Debounced search for modal users
  useEffect(() => {
    if (!user || !showCreateModal) {
      setUsers([]);
      return;
    }

    // Clear users if search query is empty
    if (!modalSearchQuery.trim()) {
      setUsers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = usersSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.id !== user.uid);

        const queryLower = modalSearchQuery.toLowerCase().trim();
        const filtered = allUsers.filter(
          (u) =>
            u.name?.toLowerCase().includes(queryLower) ||
            u.username?.toLowerCase().includes(queryLower) ||
            u.team?.toLowerCase().includes(queryLower) ||
            u.position?.toLowerCase().includes(queryLower) ||
            u.city?.toLowerCase().includes(queryLower)
        );

        setUsers(filtered);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [user, showCreateModal, modalSearchQuery]);

  // Reset modal search when modal closes
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setSelectedUserId("");
    setModalSearchQuery("");
    setUsers([]);
  };

  const createChat = async () => {
    if (!user || !selectedUserId) return;

    try {
      // Check if chat already exists
      const chatsQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      const snapshot = await getDocs(chatsQuery);
      
      let existingChat = null;
      snapshot.forEach((doc) => {
        const chat = doc.data();
        if (chat.participants && chat.participants.includes(selectedUserId)) {
          existingChat = doc.id;
        }
      });

      if (existingChat) {
        handleCloseModal();
        router.push(`/messages/${existingChat}`);
      } else {
        // Create new chat
        const chatRef = await addDoc(collection(db, "chats"), {
          participants: [user.uid, selectedUserId],
          lastMessage: "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        
        handleCloseModal();
        router.push(`/messages/${chatRef.id}`);
      }
    } catch (error: any) {
      console.error("Error creating chat:", error);
      alert(`Error creating chat: ${error.message || "Please try again."}`);
    }
  };

  return (
    <ProfileGuard>
      <div className="min-h-screen bg-white pb-20 md:pb-0">
        <Navbar />
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="px-4 py-4">
              <h1 className="text-[#0F172A] mb-4 font-semibold text-xl">Messages</h1>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl h-11 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                />
              </div>

              {/* New Message Button */}
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-4 py-3 text-white font-medium shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="w-5 h-5" />
                New Message
              </motion.button>
            </div>
          </div>

          {/* Conversations list */}
          <div className="px-4">
            <ChatList />
          </div>
        </div>

        {/* Create Chat Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 max-h-[80vh] flex flex-col"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#0F172A]">Start a New Conversation</h2>
              
              {/* Search in modal */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                />
              </div>

              {/* Users list */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                {!modalSearchQuery.trim() ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">Type a username, name, or team to search</p>
                  </div>
                ) : searching ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-slate-500">Searching...</p>
                  </div>
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <motion.div
                      key={u.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedUserId === u.id
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          selectedUserId === u.id ? 'bg-white/20' : 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB]'
                        }`}>
                          <span className={`text-lg font-semibold ${
                            selectedUserId === u.id ? 'text-white' : 'text-white'
                          }`}>
                            {u.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${
                            selectedUserId === u.id ? 'text-white' : 'text-[#0F172A]'
                          }`}>
                            {u.name}
                          </div>
                          {u.username && (
                            <div className={`text-sm truncate ${
                              selectedUserId === u.id ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              @{u.username}
                            </div>
                          )}
                          {u.team && (
                            <div className={`text-xs truncate ${
                              selectedUserId === u.id ? 'text-white/70' : 'text-slate-400'
                            }`}>
                              {u.team}
                            </div>
                          )}
                        </div>
                        {selectedUserId === u.id && (
                          <ChevronRight className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No users found</p>
                    <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[#111827] font-medium transition-all hover:bg-slate-50"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={createChat}
                  disabled={!selectedUserId}
                  whileHover={{ scale: !selectedUserId ? 1 : 1.02 }}
                  whileTap={{ scale: !selectedUserId ? 1 : 0.98 }}
                  className="flex-1 rounded-xl bg-[#007AFF] px-4 py-3 text-white font-medium transition-all hover:bg-[#0056CC] disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Start Chat
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProfileGuard>
  );
}
