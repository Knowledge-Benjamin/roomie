import React from "react";
import { Mic, MicOff, Crown, HelpCircle, User, Volume2 } from "lucide-react";
import { UserProfile, RoomState } from "../types";

interface AudioStageProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  room: RoomState;
  onJoinStage: (seatIdx: number) => void;
  onLeaveStage: () => void;
}

export const AudioStage: React.FC<AudioStageProps> = ({
  currentUser,
  allUsers,
  room,
  onJoinStage,
  onLeaveStage,
}) => {
  // Helpers to resolve user data from slots
  const getSlotUser = (id: string | null) => {
    if (!id) return null;
    return allUsers.find((u) => u.id === id) || null;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4" id="audio-stage">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-1.5 rounded-lg">
            <Volume2 className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Live WebRTC Audio Stage
              {!room.host_online && (
                <span className="text-[10px] normal-case bg-red-950/80 border border-red-900 text-red-400 px-2 rounded-full py-0.5 animate-pulse">
                  Unstable/Dropped
                </span>
              )}
            </h3>
            <p className="text-[10px] text-neutral-400">
              Low-latency sound channels active. Microphone permission verified.
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 text-[11px] text-neutral-500 font-mono bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-lg">
          <span>Active Seats Indicators: </span>
          <span className="text-white font-bold">
            {room.seats.filter((s) => s !== null).length} / 6
          </span>
        </div>
      </div>

      {/* STAGE MIC GRID (6 SLOTS - 3 Operational segments) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" id="audio-speakers-grid">
        {room.seats.map((userId, index) => {
          const user = getSlotUser(userId);
          const isHostSlot = index === 0;
          const isTalking = room.active_talking_seats.includes(index);
          const isSelf = userId === currentUser.id;

          // If seat vacant
          if (!user) {
            return (
              <div 
                key={index}
                className="bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center h-28 hover:border-neutral-700 transition-all cursor-pointer group hover:bg-neutral-900/30"
                onClick={() => onJoinStage(index)}
              >
                <div className="bg-neutral-900 group-hover:bg-neutral-800 p-2 rounded-full border border-neutral-800 text-neutral-600 group-hover:text-neutral-400 transition-colors">
                  <MicOff className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-3">
                  Seat #{index + 1} Empty
                </span>
                <span className="text-[9px] text-neutral-600 mt-0.5 group-hover:text-emerald-400 hover:underline transition-colors font-mono">
                  + Request Mic
                </span>
              </div>
            );
          }

          // Render Avatar & status
          return (
            <div 
              key={index}
              className={`relative rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all h-28 border ${
                isTalking 
                  ? "bg-neutral-950 border-emerald-500 shadow-xl shadow-emerald-500/5"
                  : "bg-neutral-950 border-neutral-800"
              }`}
            >
              {/* Talking Glow Halo */}
              {isTalking && (
                <div className="absolute inset-0 rounded-xl border border-emerald-400 animate-ping opacity-15 pointer-events-none" />
              )}

              {/* Top Icons Layer */}
              <div className="absolute top-1 right-1">
                {isHostSlot ? (
                  <div className="bg-amber-400 text-neutral-950 p-0.5 rounded-full" title="Creator Host">
                    <Crown className="w-3 h-3 text-neutral-950 font-bold" />
                  </div>
                ) : isSelf ? (
                  <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 p-0.5 rounded-full text-[8px] px-1 font-bold">
                    YOU
                  </div>
                ) : null}
              </div>

              {/* Avatar Image block with custom glows */}
              <div className="relative mt-1">
                <img 
                  src={user.avatar_url} 
                  alt={user.username}
                  className={`w-11 h-11 rounded-full object-cover relative z-10 p-0.5 bg-neutral-950 border-2 ${
                    isTalking 
                      ? "border-emerald-400" 
                      : user.has_glowing_aura 
                        ? "border-gradient-aura animate-pulse" 
                        : "border-neutral-700"
                  }`}
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual skin indicator: Glowing Aura Asset */}
                {user.has_glowing_aura && (
                  <div className="absolute inset-x-0 bottom-0 top-0 rounded-full bg-amber-400 blur-sm opacity-50 z-0 animate-pulse scale-[1.12]" />
                )}

                {/* Micro Soundwave pulsing visual */}
                {isTalking && (
                  <div className="absolute -bottom-1 left-12 right-0 flex items-center gap-0.5 h-3 z-20">
                    <span className="w-0.5 h-1.5 bg-emerald-400 animate-bounce" />
                    <span className="w-0.5 h-2.5 bg-emerald-400 animate-bounce delay-75" />
                    <span className="w-0.5 h-1 bg-emerald-400 animate-bounce delay-150" />
                  </div>
                )}
              </div>

              {/* Username block */}
              <div className="mt-2 w-full text-ellipsis overflow-hidden whitespace-nowrap">
                <span className="text-xs font-bold text-white flex justify-center items-center gap-1">
                  {user.username}
                </span>
                
                {/* Role / Level badge */}
                <span className="text-[9px] font-mono block text-neutral-400 mt-0.5">
                  {isHostSlot ? "Host Coach" : `Lvl ${user.level} Speaker`}
                </span>
              </div>

              {/* Self mic leave action button */}
              {isSelf && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeaveStage();
                  }}
                  className="absolute -bottom-2 bg-red-500 text-white rounded px-2 text-[8px] uppercase tracking-wider font-bold py-0.5 hover:bg-red-400 transition-all shadow shadow-red-500/10 cursor-pointer"
                >
                  Mute Mic
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
