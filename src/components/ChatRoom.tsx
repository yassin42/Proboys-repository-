import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Send, User as UserIcon, Clock } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  timestamp: any;
}

interface ChatRoomProps {
  user: any;
}

export default function ChatRoom({ user }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(msgs);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !db) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        userId: user.uid,
        userName: user.displayName || user.email || "Admin",
        userPhoto: user.photoURL || "",
        timestamp: new Date().toISOString(), // Using string ISO for now as per rules/blueprint consistency
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-bold text-white">Admins Only Chat</h3>
          <p className="text-xs text-slate-400">Secure internal communication for ProBoys team</p>
        </div>
        <div className="flex -space-x-2">
           {/* Placeholder for active users if needed */}
           <div className="h-8 w-8 rounded-full bg-brand ring-2 ring-slate-900 flex items-center justify-center text-[10px] font-bold">Live</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-hide">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
             <UserIcon className="h-12 w-12 text-slate-700 mb-4" />
             <p className="text-slate-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.userId === user.uid ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="flex-shrink-0">
                {msg.userPhoto ? (
                  <img src={msg.userPhoto} className="h-10 w-10 rounded-xl" alt={msg.userName} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 font-bold uppercase">
                    {msg.userName.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className={`flex max-w-[80%] flex-col ${msg.userId === user.uid ? "items-end" : "items-start"}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">{msg.userName}</span>
                  <span className="text-[10px] text-slate-500">
                    {msg.timestamp ? format(new Date(msg.timestamp), "p") : ""}
                  </span>
                </div>
                <div 
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.userId === user.uid 
                      ? "bg-brand text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-900/80 border-t border-slate-800 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-2xl border border-slate-800 bg-slate-950 px-6 py-4 text-sm text-white placeholder-slate-500 outline-none ring-brand/30 transition-all focus:ring-4"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:grayscale"
          >
            <Send className="h-6 w-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
