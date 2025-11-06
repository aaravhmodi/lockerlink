"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, getDocs, where, serverTimestamp } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import ChatList from "@/components/ChatList";

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

    // Load all users for creating new chat
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
      // Check if chat already exists
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
        // Create new chat
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors"
          >
            + New Message
          </button>
        </div>

        {/* Create Chat Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Start a New Conversation</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a user
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <button
                  onClick={createChat}
                  disabled={!selectedUserId}
                  className="flex-1 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Start Chat
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedUserId("");
                  }}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ChatList />
      </div>
    </div>
  );
}

