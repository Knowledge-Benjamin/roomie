import React, { useState, useEffect, useCallback } from "react";
import { 
  Coins, 
  ShieldCheck, 
  Wifi, 
  User, 
  Power, 
  Crown, 
  Users, 
  Lock, 
  VolumeX, 
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { UserProfile, RoomState, TransactionLog, TriviaQuestion } from "./types";
import { TokenDashboard } from "./components/TokenDashboard";
import { AudioStage } from "./components/AudioStage";
import { InteractionCanvas } from "./components/InteractionCanvas";
import { ArenaFloor } from "./components/ArenaFloor";

export default function App() {
  // Client States
  const [selectedProfileId, setSelectedProfileId] = useState<string>("user_you");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [ledger, setLedger] = useState<TransactionLog[]>([]);
  const [gatedPassed, setGatedPassed] = useState<boolean>(false);
  const [isGeneratingLoading, setIsGeneratingLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; success: boolean } | null>(null);
  
  // Host settings edit states
  const [editRoomName, setEditRoomName] = useState<string>("");
  const [editEntryFee, setEditEntryFee] = useState<number>(75);

  // Get active selected user profile
  const activeProfile = profiles.find((p) => p.id === selectedProfileId);

  // 1. Fetch Server Status (State, users and ledgers)
  const fetchState = useCallback(async () => {
    try {
      // Fetch general room state
      const stateRes = await fetch("/api/room/state");
      if (stateRes.ok) {
        const contentType = stateRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await stateRes.json().catch(() => null);
          if (data && data.room) {
            setRoom(data.room);
            setLedger(data.ledger || []);

            // Check if current user paid/escrowed
            if (activeProfile) {
              const paid = data.room.escrow_users.some(
                (entry: any) => entry.user_id === activeProfile.id
              );
              // If self is host, gated is auto passed
              if (activeProfile.role === "host") {
                setGatedPassed(true);
              } else {
                setGatedPassed(paid);
              }
            }
          }
        }
      }

      // Fetch user profile list
      const usersRes = await fetch("/api/users");
      if (usersRes.ok) {
        const contentType = usersRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await usersRes.json().catch(() => null);
          if (data && data.users) {
            setProfiles(data.users);
          }
        }
      }
    } catch (err) {
      // Safe, silent catch to prevent periodic log noise when the container is booting up or restarting
      console.warn("Unable to sync state with server. Retrying...");
    }
  }, [selectedProfileId, activeProfile?.role]);

  // Periodic Poller loop for real-time responsiveness
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Synchronize host's configuration settings edit states with the real-time room object
  useEffect(() => {
    if (room) {
      if (!editRoomName) {
        setEditRoomName(room.name);
      }
      setEditEntryFee(room.entry_fee);
    }
  }, [room?.name]);

  // Utility to brief trigger feedback warnings on actions
  const triggerFeedback = (text: string, success: boolean) => {
    setFeedbackMsg({ text, success });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 2. Financial Wallet Actions
  const handleBuyGems = async (amount: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/wallet/buy-gems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        triggerFeedback(`Gems sandbox top-up of +${amount} successful!`, true);
        fetchState();
      }
    } catch (err) {
      triggerFeedback("Buy Gems failure.", false);
    }
  };

  // 3. Gated Ingestion Room Entry payment (Section 3 & 4)
  const handleJoinPremiumRoom = async () => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id }),
      });
      if (res.ok) {
        setGatedPassed(true);
        triggerFeedback("Welcome to ArenaStage! Gated ledger entry fee paid and verified.", true);
        fetchState();
      } else {
        const errorData = await res.json();
        triggerFeedback(errorData.error || "Gated entry failed.", false);
      }
    } catch (err) {
      triggerFeedback("Gated connection error.", false);
    }
  };

  // 4. Live Chats Trigger
  const handleSendChat = async (text: string) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/room/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id, text }),
      });
      if (res.ok) {
        fetchState();
        // AP listening progress
        await fetch("/api/users/accumulate-ap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: activeProfile.id, type: "chat" }),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Seating Microphone Seize
  const handleJoinStageSeat = async (seatIdx: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/room/request-mic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id, seat_index: seatIdx }),
      });
      if (res.ok) {
        triggerFeedback(`Seized microphone seat #${seatIdx + 1}! Live audio connected.`, true);
        fetchState();
      } else {
        const errData = await res.json();
        triggerFeedback(errData.error || "Seat occupied.", false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeaveStageSeat = async () => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/room/leave-mic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id }),
      });
      if (res.ok) {
        triggerFeedback("Microphone muted. Returned to listener floor.", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Send tips and tips multipliers (Formula calculation with exactly 30% platform rake)
  const handleSendGift = async (giftType: string) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/room/send-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id, gift_type: giftType }),
      });
      if (res.ok) {
        triggerFeedback(`Tip sent successfully! Platform rake (30%) audited securely.`, true);
        fetchState();
      } else {
        const errorData = await res.json();
        triggerFeedback(errorData.error || "Gifting failed.", false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Server-side Gemini AI Trivia Fetcher
  const handleGenerateTrivia = async (category: string) => {
    setIsGeneratingLoading(true);
    try {
      const res = await fetch("/api/gemini/generate-trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryPrompt: category }),
      });
      if (res.ok) {
        const data = await res.json();
        if (room) {
          // Temporarily stage custom questions on current room state server
          const qRes = await fetch("/api/game/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions: data.questions }),
          });
          if (qRes.ok) {
            triggerFeedback(
              data.from_gemini 
                ? `SUCCESS: Gemini extracted 5 premium questions on "${category}"!` 
                : "API Config alert: Spawned safe premium questions.", 
              true
            );
          }
        }
        fetchState();
      }
    } catch (err) {
      triggerFeedback("Failed to query Trivia generator.", false);
    } finally {
      setIsGeneratingLoading(false);
    }
  };

  // 8. Game Session Controls
  const handleStartGame = async (questions: TriviaQuestion[]) => {
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (res.ok) {
        triggerFeedback("Trivia game session active on host stage!", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitAnswer = async (optionIdx: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/game/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id, option_idx: optionIdx }),
      });
      if (res.ok) {
        triggerFeedback("Response locked! Scoring evaluation processed.", true);
        fetchState();
        // AP listening progress
        await fetch("/api/users/accumulate-ap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: activeProfile.id, type: "listen" }),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextQuestion = async () => {
    try {
      const res = await fetch("/api/game/next-question", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.mvp) {
          triggerFeedback(`Trivia Finished! MVP score released escrow payout to AriaGamer!`, true);
        } else {
          triggerFeedback("Advanced to next trivia index.", true);
        }
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Room Settings (Exclusive for Creator Host)
  const handleUpdateRoomSettings = async (name: string, entryFee: number) => {
    if (!activeProfile || activeProfile.id !== "admin_host") return;
    try {
      const res = await fetch("/api/room/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeProfile.id,
          name,
          entry_fee: entryFee
        }),
      });
      if (res.ok) {
        triggerFeedback(`Gated configurations updated successfully!`, true);
        fetchState();
      } else {
        const errData = await res.json();
        triggerFeedback(`Settings error: ${errData.error}`, false);
      }
    } catch (err) {
      triggerFeedback("Failure to update configurations.", false);
    }
  };

  // 9. Risk controls simulated
  const handleSimulateDisconnect = async (offline: boolean) => {
    try {
      const res = await fetch("/api/test-control/simulate-disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_status: offline }),
      });
      if (res.ok) {
        triggerFeedback(offline ? "Host offline! 180s Countdown active!" : "Host reestablished!", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceRollback = async () => {
    try {
      const res = await fetch("/api/test-control/force-rollback-now", { method: "POST" });
      if (res.ok) {
        triggerFeedback("Escrow secure rollback executed successfully!", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Streaks claiming checks
  const handleClaimStreak = async () => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/users/claim-streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id }),
      });
      if (res.ok) {
        triggerFeedback("Glowing Aura unlocked permanently + 100 AP awarded!", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetStreak = async () => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/users/reset-streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeProfile.id }),
      });
      if (res.ok) {
        triggerFeedback("Streak reset to Day 6 to allow retesting streak achievements!", true);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans" id="arenastage-app">
      {/* GLOBAL STATUS TOAST FEEDBACK NOTIFICATION */}
      {feedbackMsg && (
        <div 
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border text-xs font-bold font-mono py-3 flex items-center gap-2 animate-fadeIn ${
            feedbackMsg.success 
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10" 
              : "bg-red-950/90 text-red-300 border-red-500/30 shadow-red-500/10"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${feedbackMsg.success ? "bg-emerald-400" : "bg-red-400"}`} />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TOP NAVIGATION HEADER BAR */}
      <header className="bg-neutral-900/60 backdrop-blur-md border-b border-neutral-850 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-2 rounded-xl text-neutral-950 shadow-md">
            <Crown className="w-5 h-5 text-neutral-950 fill-neutral-950 font-black" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white">ArenaStage</h1>
            <p className="text-[10px] text-neutral-400 font-mono tracking-widest flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              LIVE AUDIO CREATOR MICRO-ECONOMY
            </p>
          </div>
        </div>

        {/* CONTROLS BAR: PROFILE SELECTOR & SERVER STATUS */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Server link status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-neutral-400">
              Latency: <b className="text-white">12ms SFU Ready</b>
            </span>
          </div>

          {/* ACTIVE PROFILE SELECTOR (Crucial for testing the micro-economy role transactions) */}
          <div className="flex items-center gap-2 bg-neutral-950 rounded-xl border border-neutral-800 px-3 py-1.5">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
              Audit Persona:
            </span>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="bg-transparent text-xs text-white outline-none font-bold cursor-pointer select-none"
            >
              <option value="user_you" className="bg-neutral-950 text-white font-bold">You (Guest Player)</option>
              <option value="admin_host" className="bg-neutral-950 text-white font-bold">AriaGamer (Creator Host)</option>
              <option value="user_sarah" className="bg-neutral-950 text-white font-bold">Sarah_Pro_Gifter (Audience)</option>
              <option value="user_crypto" className="bg-neutral-950 text-white font-bold">CryptoWizard (Audience)</option>
            </select>
          </div>

          {/* Active persona stats snippet */}
          {activeProfile && (
            <div className="hidden lg:flex items-center gap-2 bg-neutral-900 border border-neutral-820 py-1.5 px-3 rounded-lg text-xs text-neutral-300">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span>Gems: <strong className="text-amber-400 font-mono">{activeProfile.gem_balance}</strong></span>
              <span>•</span>
              <span>Level: <strong className="text-indigo-400 font-mono">{activeProfile.level}</strong></span>
            </div>
          )}
        </div>
      </header>

      {/* RENDER APP BODY STATE */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* VIEW A: GATED ENTRY VALIDATION SCREEN (Section 3 - Gated Ingestion) */}
        {!gatedPassed ? (
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-2xl relative my-auto animate-fadeIn" id="gated-ingestion-wall">
            <div className="absolute right-4 top-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 py-0.5 px-2 rounded-full font-bold text-[9px] font-mono animate-pulse">
              Premium Room
            </div>

            <div className="bg-amber-400/10 border border-amber-400/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-amber-400 shadow shadow-amber-400/5">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Gated Ingestion Verified Entry</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                You are entering Host <b>{room?.name || "AriaGamer's"}</b> stage arena floor. Low latency WebRTC voice streams and live game components require dynamic token registration.
              </p>
            </div>

            {/* Entry Cost requirements display */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex justify-between items-center text-xs">
              <span className="text-neutral-500">ENTRY COST RATE:</span>
              <span className="text-amber-400 font-extrabold font-mono text-sm">{room?.entry_fee} GEMS 💎</span>
            </div>

            <div className="space-y-3.5">
              <button
                onClick={handleJoinPremiumRoom}
                className="w-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs py-3 rounded-xl transition-all shadow-lg shadow-amber-500/10 cursor-pointer scale-100 hover:scale-[1.01]"
              >
                🔒 Deduct {room?.entry_fee} Gems & Enter Stage Room
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleBuyGems(250)}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] py-1.5 rounded-lg border border-neutral-705 transition-colors cursor-pointer"
                >
                  +250 Test Gems (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => handleBuyGems(1000)}
                  className="flex-1 bg-indigo-950/40 border border-indigo-900 text-indigo-300 text-[11px] py-1.5 rounded-lg hover:bg-indigo-950 transition-colors cursor-pointer"
                >
                  +1000 Test Gems (Super)
                </button>
              </div>
            </div>

            <p className="text-[10px] text-neutral-500 font-mono">
              Balance: {activeProfile?.gem_balance} Gems. Deductors held safely in server Escrow until settlement criteria met.
            </p>
          </div>
        ) : (
          
          /* VIEW B: ACTIVE CORE STAGE ROOM PANELS (VERTICAL SEGMENTS) */
          <div className="space-y-6 animate-fadeIn" id="applet-dashboard">
            {/* AUDITOR CONSOLE ALERT */}
            <div className="bg-emerald-950/20 border border-emerald-900/40 px-4 py-2.5 rounded-xl text-xs text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                🔒 SECURE MODE: Acting as audience/speaker role for <b>{activeProfile?.username}</b> (Balance: <b>{activeProfile?.gem_balance} Gems</b>).
              </span>
              <span className="text-[9px] bg-emerald-900/60 px-2 rounded-md font-mono py-0.5 uppercase tracking-widest text-white">
                SSL Auth Active
              </span>
            </div>

            {/* CREATOR HOST CONTROL DECK */}
            {activeProfile?.role === "host" && (
              <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/25 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4 animate-fadeIn" id="host-admin-deck">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-500/15 text-amber-400 p-2 rounded-xl border border-amber-500/30">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Creator Host Administrative Deck
                      </h3>
                      <p className="text-[10px] text-neutral-400">
                        Live room customization parameters broadcasted onto all client interfaces.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-500/90 text-neutral-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Authoritative Control
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                        Dynamic Room Name:
                      </label>
                      <input 
                        type="text"
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                        placeholder="E.g., Silicon Valley Hub"
                        maxLength={45}
                        className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Gated Entry Fee:</span>
                        <span className="text-amber-400 font-bold">{editEntryFee} Gems</span>
                      </label>
                      <input 
                        type="range"
                        min="0"
                        max="500"
                        step="25"
                        value={editEntryFee}
                        onChange={(e) => setEditEntryFee(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] text-neutral-600 font-mono mt-0.5">
                        <span>Free (0)</span>
                        <span>250 Gems</span>
                        <span>Max (500)</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Controls info and Action buttons */}
                  <div className="flex flex-col justify-between space-y-3 md:border-l md:border-neutral-850 md:pl-4">
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Saving metadata updates instantly posts a live ledger log to all active audience members and updates their gated entry costs dynamically.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateRoomSettings(editRoomName, editEntryFee)}
                        className="flex-grow bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs py-2 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/15 cursor-pointer text-center"
                      >
                        💾 Save & Broadcast Settings
                      </button>
                      
                      {room?.game_active ? (
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="flex-grow bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs py-2 px-4 rounded-xl border border-neutral-700 transition-all cursor-pointer text-center"
                        >
                          ⏭️ Next State
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!room?.game_questions || room.game_questions.length === 0}
                          onClick={() => handleStartGame(room?.game_questions || [])}
                          className="flex-grow bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 font-bold text-xs py-2 px-4 rounded-xl border border-neutral-700 transition-all cursor-pointer text-center"
                        >
                          ⚡ Boot Match Game
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEGMENT 1: THE AUDIO STAGE (Top 25% height equivalent) */}
            {profiles.length > 0 && room && (
              <AudioStage
                currentUser={activeProfile!}
                allUsers={profiles}
                room={room}
                onJoinStage={handleJoinStageSeat}
                onLeaveStage={handleLeaveStageSeat}
              />
            )}

            {/* SIDE-BY-SIDE INTERACTIVE LAYOUT (Middle 45% & Bottom 30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* SEGMENT 2: THE GAMES CANVAS VIEWPORT (Middle 45% priority) */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                {profiles.length > 0 && room && (
                  <InteractionCanvas
                    currentUser={activeProfile!}
                    allUsers={profiles}
                    room={room}
                    onGenerateTrivia={handleGenerateTrivia}
                    onStartGame={handleStartGame}
                    onSubmitAnswer={handleSubmitAnswer}
                    onNextQuestion={handleNextQuestion}
                    isGeneratingStatus={isGeneratingLoading}
                    geminiActive={true}
                  />
                )}
              </div>

              {/* SEGMENT 3: THE CHAT FEED ARENA FLOOR & CONTROLS (Bottom 30% priority) */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                {profiles.length > 0 && room && (
                  <ArenaFloor
                    currentUser={activeProfile!}
                    allUsers={profiles}
                    room={room}
                    onSendChat={handleSendChat}
                    onSendGift={handleSendGift}
                    onJoinStage={handleJoinStageSeat}
                    onLeaveStage={handleLeaveStageSeat}
                  />
                )}
              </div>
            </div>

            {/* DYNAMIC METRIC MONETARY LEDGER CONTROLLER */}
            {profiles.length > 0 && room && (
              <TokenDashboard
                currentUser={activeProfile!}
                allUsers={profiles}
                room={room}
                ledger={ledger}
                onBuyGems={handleBuyGems}
                onSimulateDisconnect={handleSimulateDisconnect}
                onForceRollback={handleForceRollback}
                onResetStreak={handleResetStreak}
                onClaimStreak={handleClaimStreak}
              />
            )}
          </div>
        )}
      </main>

      {/* FOOTER ACCREDITATION CODES */}
      <footer className="bg-neutral-900 border-t border-neutral-850 py-5 text-center text-[10px] text-neutral-500 font-mono mt-auto shrink-0">
        <p>© 2026 ArenaStage Inc. All rights reserved. Encrypted Ledger Row-Locked Sandbox Security Engine.</p>
      </footer>
    </div>
  );
}
