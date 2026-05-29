import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Gift, 
  MessageSquare, 
  Mic, 
  ChevronsUp, 
  UserPlus, 
  UserMinus, 
  Heart,
  VolumeX,
} from "lucide-react";
import { UserProfile, RoomState } from "../types";

interface ArenaFloorProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  room: RoomState;
  onSendChat: (text: string) => void;
  onSendGift: (giftType: string) => void;
  onJoinStage: (seatIdx: number) => void;
  onLeaveStage: () => void;
}

export const ArenaFloor: React.FC<ArenaFloorProps> = ({
  currentUser,
  allUsers,
  room,
  onSendChat,
  onSendGift,
  onJoinStage,
  onLeaveStage,
}) => {
  const [chatText, setChatText] = useState("");
  const [showGiftTray, setShowGiftTray] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll chat list to bottom on updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room.chat_feed]);

  // Handle standard word submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText("");
  };

  // Check if self is on the stage
  const currentSeatIndex = room.seats.indexOf(currentUser.id);
  const isOnStage = currentSeatIndex !== -1;

  // Find a vacant seat
  const getFirstVacantSeat = () => {
    for (let i = 1; i <= 5; i++) {
      if (room.seats[i] === null) return i;
    }
    return -1;
  };

  const vacantIndex = getFirstVacantSeat();

  // Premium gifts configurations
  const premiumGifts = [
    { type: "mic", label: "Golden Mic", cost: 50, icon: "🎙️", color: "from-amber-400 to-amber-600" },
    { type: "crown", label: "Royal Crown", cost: 250, icon: "👑", color: "from-yellow-400 to-yellow-600" },
    { type: "aura", label: "Galaxy Aura", cost: 500, icon: "💫", color: "from-pink-400 to-pink-600" },
    { type: "rocket", label: "Hyper Rocket", cost: 1000, icon: "🚀", color: "from-purple-500 to-purple-700" }
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between h-[420px]" id="arena-floor">
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Arena Floor Live Conversations</h4>
            <p className="text-[10px] text-neutral-400">Secure WebSockets Simulated Broadcast Feed</p>
          </div>
        </div>

        {/* Quick Mic Seating Controls */}
        <div className="flex gap-2">
          {isOnStage ? (
            <button
              onClick={onLeaveStage}
              className="text-[10px] bg-red-950/60 hover:bg-red-900 text-red-300 font-bold py-1 px-3 rounded-lg border border-red-800/80 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <UserMinus className="w-3 h-3" />
              Mute Mic
            </button>
          ) : (
            <button
              disabled={vacantIndex === -1}
              onClick={() => vacantIndex !== -1 && onJoinStage(vacantIndex)}
              className={`text-[10px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                vacantIndex !== -1
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-900/60 hover:bg-emerald-900"
                  : "bg-neutral-800 text-neutral-600 border border-neutral-750 cursor-not-allowed"
              }`}
            >
              <UserPlus className="w-3 h-3" />
              {vacantIndex !== -1 ? "Request Mic Seat" : "Stage Seats Full"}
            </button>
          )}

          <button
            onClick={() => setShowGiftTray(!showGiftTray)}
            className="text-[10px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-1 px-3 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 fill-neutral-950" />
            Gift Tray Tips
          </button>
        </div>
      </div>

      {/* CHAT CHANNELS DISPLAY FEED AREA */}
      <div 
        ref={scrollRef}
        className="flex-grow my-3 bg-neutral-950 rounded-xl border border-neutral-850 p-4 overflow-y-auto space-y-3 shadow-inner relative max-h-56"
        id="chat-feed-box"
      >
        {room.chat_feed.map((msg) => {
          // Different message style depending on type
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block bg-neutral-900 border border-neutral-800/85 text-[10px] text-neutral-400 py-1 px-3 rounded-lg font-mono">
                  ⚙️ {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === "error") {
            return (
              <div key={msg.id} className="bg-red-950/20 border border-red-900/40 p-2.5 rounded-lg text-left">
                <span className="text-[10px] text-red-400 font-mono block font-black">🛑 SECURITY NOTIFICATION RULE:</span>
                <p className="text-[11px] text-red-200 font-mono leading-normal mt-0.5">{msg.text}</p>
              </div>
            );
          }

          if (msg.type === "entrance") {
            return (
              <div key={msg.id} className="text-center animate-fadeIn">
                <span className={`inline-block border text-[10px] px-3.5 py-1.5 rounded-full font-bold shadow-md ${
                  msg.glowing_aura 
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400/45 text-amber-200 shadow-amber-500/5 animate-pulse"
                    : "bg-neutral-900 border-neutral-800 text-neutral-300"
                }`}>
                  {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === "gift") {
            return (
              <div key={msg.id} className="bg-gradient-to-r from-purple-950/20 to-pink-950/15 border border-purple-900/50 p-3 rounded-xl shadow-lg relative overflow-hidden animate-fadeIn">
                <div className="absolute right-2 -bottom-2 text-3xl opacity-10 select-none">🎁</div>
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded uppercase tracking-wider font-mono shrink-0">GIFTED</span>
                  <div>
                    <span className="font-extrabold text-white block mt-0.5">{msg.username}</span>
                    <p className="text-purple-200 text-[11px] mt-1 italic font-medium leading-normal">{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          }

          // Standard Chat Message
          return (
            <div key={msg.id} className="flex gap-2.5 text-xs animate-fadeIn pb-1">
              {/* Badge if available */}
              {msg.badge ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 h-fit ${
                  msg.badge.includes("Host") 
                    ? "bg-amber-400 text-neutral-950" 
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400"
                }`}>
                  {msg.badge}
                </span>
              ) : (
                <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono shrink-0">Guest</span>
              )}

              <div>
                <span className={`font-extrabold block text-neutral-200 ${msg.glowing_aura ? "text-amber-300 underline decoration-amber-400/30" : ""}`}>
                  {msg.username}
                </span>
                <span className="text-neutral-300 break-all leading-normal mt-0.5 block">{msg.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* GIFT SELECTION DRAWER BAR TRAY */}
      {showGiftTray && (
        <div className="bg-neutral-950 border border-amber-500/20 rounded-xl p-3 mb-2 animate-fadeIn grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
          <button 
            type="button" 
            onClick={() => setShowGiftTray(false)}
            className="absolute top-1 right-2 text-neutral-500 hover:text-white text-[10px]"
          >
            ✕ Close
          </button>
          
          {premiumGifts.map((gf) => (
            <button
              key={gf.type}
              type="button"
              onClick={() => {
                onSendGift(gf.type);
                setShowGiftTray(false);
              }}
              className="bg-neutral-900 border border-neutral-800/80 rounded-lg p-2 hover:border-amber-400/60 transition-all flex flex-col items-center justify-between text-center group cursor-pointer"
            >
              <div className="text-2xl pt-1 group-hover:scale-110 transition-transform">{gf.icon}</div>
              <div className="mt-2">
                <span className="text-[10px] font-black text-white block uppercase">{gf.label}</span>
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 py-0.5 px-1 rounded block mt-1">
                  {gf.cost} Gems
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FOOTER INTERACTIVE SEND TEXT COMPONENT FORM */}
      <form onSubmit={handleChatSubmit} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder={isOnStage ? "📢 Speak to the arena... (Mics active)" : "💬 Text chat to support host & co-hosts..."}
          maxLength={100}
          className="flex-grow bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-medium"
        />
        <button
          type="submit"
          disabled={!chatText.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer text-xs"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
};
