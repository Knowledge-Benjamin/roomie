import React, { useState } from "react";
import { 
  Coins, 
  HelpCircle, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  Lock 
} from "lucide-react";
import { UserProfile, RoomState, TransactionLog } from "../types";

interface TokenDashboardProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  room: RoomState;
  ledger: TransactionLog[];
  onBuyGems: (amount: number) => void;
  onSimulateDisconnect: (offline: boolean) => void;
  onForceRollback: () => void;
  onResetStreak: () => void;
  onClaimStreak: () => void;
}

export const TokenDashboard: React.FC<TokenDashboardProps> = ({
  currentUser,
  allUsers,
  room,
  ledger,
  onBuyGems,
  onSimulateDisconnect,
  onForceRollback,
  onResetStreak,
  onClaimStreak,
}) => {
  const [showLedger, setShowLedger] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  // Host info
  const hostUser = allUsers.find(u => u.id === room.host_id);

  // Calculate next streak goal
  const hasStreakBonus = currentUser.has_glowing_aura;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-5" id="token-dashboard">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Coins className="text-amber-400 w-5 h-5 animate-pulse" />
            ArenaStage Micro-Economy Engine
          </h2>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Authoritative Secure Server Ledger Protocol (Offline-Safe Sandbox)
          </p>
        </div>
        
        {/* Toggle Information Button */}
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-1 px-2.5 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
          {showInfo ? "Hide Guardrails" : "Explain Ledger rules"}
        </button>
      </div>

      {/* DETAILED LEDGER INFORMATION EXPLAINERS (ACCORDION) */}
      {showInfo && (
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl text-xs space-y-3 text-neutral-300 leading-relaxed transition-all animate-fadeIn">
          <p className="font-semibold text-neutral-200">💎 The Dual-Token Escrow Holding Framework:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
            <li>
              <strong className="text-neutral-200">Gated Ingestion:</strong> Entering the premium live stage deducts <span className="text-amber-400 font-bold">{room.entry_fee} Gems</span> from your wallet and holds them in a secure server-controlled <span className="text-sky-400 font-bold">Escrow Reserve</span>.
            </li>
            <li>
              <strong className="text-neutral-200">Host Settlement Rake:</strong> Upon successful game completion, the escrow is disbursed. Exactly <strong className="text-amber-400">30% Platform Rake</strong> is charged, and <strong className="text-emerald-400">70% Creator Profit Share</strong> is credited directly to the Host's earned balance.
            </li>
            <li>
              <strong className="text-neutral-200">Anti-Fraud Rollbacks:</strong> If the host drops connection for <strong className="text-red-400">&gt; 180 seconds</strong>, refunds trigger automatically—returning escrowed Gems to all participants and charging the host a server fee penalty.
            </li>
          </ul>
        </div>
      )}

      {/* CORE FINANCIAL STATISTICS METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="ledger-stats">
        {/* USER WALLET */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 tracking-wider">YOUR GEM WALLET</span>
              <span className="text-[10px] uppercase font-mono bg-neutral-900 border border-neutral-800 text-neutral-500 px-1 rounded">Locked SSL</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">{currentUser.gem_balance}</span>
              <span className="text-xs text-amber-400 font-mono">GEMS 💎</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => onBuyGems(250)}
              className="flex-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold py-1.5 rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              +250 Gems (Sandbox)
            </button>
            <button 
              onClick={() => onBuyGems(1000)}
              className="flex-1 text-[11px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              +1000 Gems (Super)
            </button>
          </div>
        </div>

        {/* CREATOR DISBURSED EARNED FEES */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 tracking-wider">CREATOR EARNED FEES</span>
              <span className="text-[10px] uppercase font-mono bg-emerald-900/20 border border-emerald-900/40 text-emerald-400 px-1.5 rounded">Rake Deducted</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {hostUser ? hostUser.earned_balance : 0}
              </span>
              <span className="text-xs text-emerald-500 font-mono">GEMS 💸</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Creator payouts hold 70% share from entry fees & gift tips.</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs border-t border-neutral-900 pt-3 text-neutral-400">
            <span>Platform Rake Charged:</span>
            <span className="text-emerald-500 font-mono font-bold">30.0% SECURE</span>
          </div>
        </div>

        {/* SECURE ESCROW POOL HOLD BOX */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-2 top-2 opacity-5">
            <Lock className="w-16 h-16 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 tracking-wider">ESCROW SECURE POOL</span>
              <span className="text-[10px] uppercase font-mono bg-sky-950/40 border border-sky-800/40 text-sky-400 px-1.5 rounded">Active Hold</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-sky-400 font-mono tracking-tight">{room.escrow_pool}</span>
              <span className="text-xs text-sky-400 font-mono">GEMS 🔒</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Currently holds entry fees from {room.escrow_users.length} participants until trivia is cleared.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs border-t border-neutral-900 pt-3 text-neutral-400">
            <span>Entry Verification Status:</span>
            <span className="text-sky-400 font-mono font-bold">GATED INGESTION</span>
          </div>
        </div>
      </div>

      {/* OPERATIONAL RISK CONTROL FRAMEWORK CRITICAL DEV PANEL */}
      <div className="bg-neutral-950 border border-red-950/60 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Section 7: Operational Risk Control Panel</h4>
            <p className="text-[11px] text-neutral-400">
              Audit the system security: Simulate host disconnection ungracefully to verify 180s grace windows and auto-refund procedures.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-900">
          {/* Host connection simulation toggles */}
          {room.host_online ? (
            <button 
              onClick={() => onSimulateDisconnect(true)}
              className="text-xs bg-red-950/65 text-red-300 font-bold py-1.5 px-3 rounded-lg border border-red-900/60 hover:bg-red-900/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              Simulate Host Disconnect
            </button>
          ) : (
            <button 
              onClick={() => onSimulateDisconnect(false)}
              className="text-xs bg-emerald-950 text-emerald-250 font-bold py-1.5 px-3 rounded-lg border border-emerald-900 hover:bg-emerald-900 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Simulate Host Reconnection
            </button>
          )}

          {/* Accelerate Rollback button - only if host offline */}
          <button 
            disabled={room.host_online || !room.abandoned_timer_active}
            onClick={onForceRollback}
            className={`text-xs font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
              !room.host_online && room.abandoned_timer_active
                ? "bg-amber-950 text-amber-300 border-amber-900 hover:bg-amber-900 text-amber-200"
                : "bg-neutral-900 text-neutral-600 border-neutral-800 opacity-40 cursor-not-allowed"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Accelerate Escrow Rollback Now
          </button>
        </div>

        {/* ACTIVE ROLLBACK COUNTDOWN STATE ALERT */}
        {room.abandoned_timer_active && (
          <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-3 text-red-200 text-xs flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="flex w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span>
                Host Disconnected! Secure Rollback Grace window counting down: 
                <strong className="text-white font-mono ml-1">{room.abandoned_time_remaining}s remaining</strong>.
              </span>
            </div>
            <span className="text-[10px] bg-red-900/80 px-1.5 rounded text-white py-0.5">STATUS: GRACE_LOCKED</span>
          </div>
        )}
      </div>

      {/* DAILY ENGAGEMENT TRIPLE DIAL - LOSS AVERSION SYSTEM */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-400 py-0.5 px-2 rounded-full font-bold">Quest Card</span>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">7-Day Engagement Loss Aversion Loop</h4>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Achieve a 7-day login streak to unlock a temporary <b className="text-amber-400">Glowing Avatar Aura</b>. Miss a day, and the record drops straight to zero!
          </p>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = day <= currentUser.daily_streak;
              const isGoal = day === 7;
              return (
                <div 
                  key={day}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono text-xs font-bold transition-all ${
                    active 
                      ? "bg-amber-400 text-neutral-900 border-amber-300"
                      : isGoal 
                        ? "bg-neutral-900 text-amber-400 border-amber-500/40 animate-pulse border-dashed"
                        : "bg-neutral-900 text-neutral-600 border-neutral-800"
                  }`}
                  title={`Day ${day}`}
                >
                  {isGoal ? "👑" : day}
                </div>
              );
            })}
            <span className="text-xs text-neutral-400 ml-2">({currentUser.daily_streak}/7 Days)</span>
          </div>
        </div>

        {/* Claim button or active indicator */}
        <div className="flex gap-2">
          {currentUser.daily_streak === 6 && !hasStreakBonus ? (
            <button 
              onClick={onClaimStreak}
              className="text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 py-2 px-4 rounded-xl shadow-lg shadow-amber-400/10 transition-all flex items-center gap-1 cursor-pointer animate-bounce"
            >
              🎉 Claim 7th Day Streak!
            </button>
          ) : hasStreakBonus ? (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2 text-center">
              <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">Avatar Skin Unlocked</span>
              <span className="text-xs font-bold text-white flex items-center gap-1 justify-center mt-0.5">
                🌟 Glowing Aura Active
              </span>
            </div>
          ) : (
            <div className="text-neutral-500 text-xs py-2">
              (Achieve 6 days first)
            </div>
          )}

          <button 
            type="button"
            onClick={onResetStreak}
            className="text-[10px] bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 p-2 rounded-lg cursor-pointer"
            title="Reset Streak to Day 6 to re-test achievement!"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECURE AUDITED TRANSACTIONS LEDGER TRAIL */}
      <div className="border-t border-neutral-800 pt-4">
        <button 
          onClick={() => setShowLedger(!showLedger)}
          className="w-full flex items-center justify-between text-neutral-400 hover:text-white transition-colors text-xs font-bold py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-400" />
            Audit Protocol Ledger Tracks ({ledger.length} entries)
          </span>
          <span className="text-[11px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full">
            {showLedger ? "Collapse Ledger" : "View Ledger Logs"}
          </span>
        </button>

        {showLedger && (
          <div className="mt-3 overflow-y-auto max-h-56 bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[10px] text-neutral-400 space-y-2 animate-fadeIn">
            {ledger.slice().reverse().map((lg) => {
              let typeColor = "text-neutral-400";
              if (lg.type === "room_entry") typeColor = "text-sky-400";
              if (lg.type === "gift") typeColor = "text-pink-400";
              if (lg.type === "escrow_payout") typeColor = "text-emerald-400";
              if (lg.type === "escrow_rollback") typeColor = "text-red-400";
              if (lg.type === "gems_purchase") typeColor = "text-amber-400";

              return (
                <div key={lg.id} className="border-b border-neutral-900 pb-2">
                  <div className="flex items-center justify-between">
                    <span className={typeColor}>[{lg.id}] - {lg.type.toUpperCase()}</span>
                    <span className="text-neutral-600">{new Date(lg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-neutral-200 mt-1">{lg.description}</div>
                  <div className="text-neutral-500 mt-0.5 flex gap-3">
                    <span>Sender: <b>{lg.sender_username}</b></span>
                    <span>To: <b>{lg.receiver_username}</b></span>
                    <span>Tokens: <b className="text-amber-500">{lg.amount} Gems</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
