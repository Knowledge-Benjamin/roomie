import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });
        console.log("Gemini client successfully initialized server-side.");
      } catch (err) {
        console.error("Failed to initialize Gemini client:", err);
      }
    }
  }
  return aiClient;
}

// ==========================================
// CENTRAL SERVER DATA STORE (Simulating DB + Redis)
// ==========================================

interface UserProfile {
  id: string;
  username: string;
  role: 'host' | 'user' | 'bot';
  gem_balance: number;
  earned_balance: number;
  ap: number;
  level: number;
  daily_streak: number;
  last_login: string;
  has_glowing_aura: boolean;
  avatar_url: string;
}

interface TransactionLog {
  id: string;
  timestamp: string;
  sender_username: string;
  receiver_username: string;
  amount: number;
  type: 'room_entry' | 'gift' | 'escrow_payout' | 'escrow_rollback' | 'gems_purchase';
  description: string;
}

interface TriviaQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  category: string;
}

interface RoomState {
  id: string;
  name: string;
  host_id: string;
  entry_fee: number;
  listener_count: number;
  escrow_pool: number;
  escrow_users: { user_id: string; fee_paid: number }[]; // Escrow participants
  participants: string[];
  seats: (string | null)[]; // mic stage slots 0 through 5 (0 is host, 1-5 represent audience seats)
  active_talking_seats: number[]; // Index of seats currently speaking
  game_active: boolean;
  game_question_idx: number;
  game_questions: TriviaQuestion[];
  game_answers: Record<string, number>; // user_id -> optionIndex selected
  game_scores: Record<string, number>; // user_id -> total correct score
  game_status_text: string;
  chat_feed: {
    id: string;
    username: string;
    text: string;
    timestamp: string;
    type: 'chat' | 'system' | 'gift' | 'error' | 'entrance';
    badge?: string;
    glowing_aura?: boolean;
  }[];
  host_online: boolean;
  abandoned_timer_active: boolean;
  abandoned_time_remaining: number; // in seconds
}

// Predefined fallback premium trivia
const fallbackTrivia: TriviaQuestion[] = [
  {
    category: "Science & AI",
    question: "What does 'GPT' stand for in modern deep learning language architectures?",
    options: ["Generative Pre-trained Transformer", "General Purpose Tensor", "Global Pattern Transfer", "Graphical Processing Unit"],
    answerIndex: 0,
  },
  {
    category: "Gaming History",
    question: "Which of the following is widely credited as the first commercial coin-operated arcade video game?",
    options: ["Pong", "Computer Space", "Pac-Man", "Space Invaders"],
    answerIndex: 1,
  },
  {
    category: "Sound & Audio",
    question: "What component is used in WebRTC audio to resolve echo between speaker output and mic input?",
    options: ["Dynamic Compressor", "Audio Bandwidth Enhancer", "Acoustic Echo Canceller (AEC)", "Frequency Transposed Buffer"],
    answerIndex: 2,
  },
  {
    category: "Crypto Currency",
    question: "In ledger double-spending prevention, what mechanism forces transactions to wait sequentially for validation?",
    options: ["Simultaneous Threads", "Atomic Locks & Queues", "Virtual Partitioning", "Optimistic Overrides"],
    answerIndex: 1,
  },
  {
    category: "Internet Lore",
    question: "What is the name of the standard port used for HTTP communication?",
    options: ["Port 443", "Port 80", "Port 3000", "Port 8080"],
    answerIndex: 1,
  }
];

// Seed initial database state
let users: Record<string, UserProfile> = {
  "admin_host": {
    id: "admin_host",
    username: "AriaGamer",
    role: "host",
    gem_balance: 50,
    earned_balance: 1450,
    ap: 4500,
    level: 25,
    daily_streak: 15,
    last_login: "2026-05-29",
    has_glowing_aura: true,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  "user_you": {
    id: "user_you",
    username: "You [Player]",
    role: "user",
    gem_balance: 750, // Starting Gems
    earned_balance: 0,
    ap: 85,
    level: 1,
    daily_streak: 6, // 6 Days, 1 day away from 7-day streak Glowing Aura!
    last_login: "2026-05-28",
    has_glowing_aura: false,
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  },
  "user_sarah": {
    id: "user_sarah",
    username: "Sarah_Pro_Gifter",
    role: "bot",
    gem_balance: 5000,
    earned_balance: 120,
    ap: 12000,
    level: 42,
    daily_streak: 28,
    last_login: "2026-05-29",
    has_glowing_aura: true,
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  "user_crypto": {
    id: "user_crypto",
    username: "CryptoWizard",
    role: "bot",
    gem_balance: 320,
    earned_balance: 0,
    ap: 850,
    level: 5,
    daily_streak: 2,
    last_login: "2026-05-29",
    has_glowing_aura: false,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  }
};

let ledger: TransactionLog[] = [
  {
    id: "tx_init_01",
    timestamp: new Date().toISOString(),
    sender_username: "Platform",
    receiver_username: "AriaGamer",
    amount: 1450,
    type: "escrow_payout",
    description: "Successful game settlement payout for Trivia session #882."
  },
  {
    id: "tx_init_02",
    timestamp: new Date().toISOString(),
    sender_username: "Sarah_Pro_Gifter",
    receiver_username: "AriaGamer",
    amount: 50,
    type: "gift",
    description: "Sent Golden Mic gift (Creator earned: 35 Gems, Platform rake: 15 Gems)."
  }
];

// Room active state
let room: RoomState = {
  id: "room_grand_arena",
  name: "The Cosmic Theater Live Game",
  host_id: "admin_host",
  entry_fee: 100, // 100 Gems entry
  listener_count: 3, // AriaGamer, Sarah_Pro_Gifter, CryptoWizard
  escrow_pool: 0,
  escrow_users: [],
  participants: [],
  seats: ["admin_host", "user_crypto", null, null, null, null], // host in seat 0, user_crypto on stage
  active_talking_seats: [0], // Host is talking initially
  game_active: false,
  game_question_idx: 0,
  game_questions: fallbackTrivia,
  game_answers: {},
  game_scores: {},
  game_status_text: "Host hasn't started the game yet.",
  chat_feed: [
    {
      id: "msg_init_01",
      username: "System",
      text: "Welcome to ArenaStage! Connect your audio, join the audience, or request a seat on the stage.",
      timestamp: new Date().toISOString(),
      type: "system",
    },
    {
      id: "msg_init_02",
      username: "AriaGamer",
      text: "Hey everyone! Welcome to my dynamic live stage! We are starting the multiplayer trivia arena soon. Grab a seat on the stage or enter the arena floor now!",
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: "chat",
      badge: "★ Host",
      glowing_aura: true,
    },
    {
      id: "msg_init_03",
      username: "Sarah_Pro_Gifter",
      text: "Let's do this! Checking my daily quests, ready to drop some crowns today 👑!",
      timestamp: new Date(Date.now() - 15000).toISOString(),
      type: "chat",
      badge: "⚡ Level 42",
      glowing_aura: true,
    }
  ],
  host_online: true,
  abandoned_timer_active: false,
  abandoned_time_remaining: 180,
};

// ==========================================
// SIMULATE PARALLEL TRANSACTION MUTEX/LOCKS
// ==========================================
// To prevent double spending simulation or fast race conditions
let balanceLock = false;
const acquireLock = () => new Promise<boolean>((resolve) => {
  const check = () => {
    if (!balanceLock) {
      balanceLock = true;
      resolve(true);
    } else {
      setTimeout(check, 10);
    }
  };
  check();
});
const releaseLock = () => {
  balanceLock = false;
};

// ==========================================
// ASYNCHRONOUS SIMULATED BACKEND WORKERS & TIME LOOPS
// ==========================================
// Let's create periodic simulations (e.g. simulated host voice flashes, automated bot chat helper comments, timer countdowns)
setInterval(() => {
  // Simulate active talking seats shifting to model dynamic WebRTC stream audio indicators
  if (room.host_online) {
    const talkers = [0]; // Host talks mostly
    if (room.seats[1] && Math.random() > 0.4) talkers.push(1); // Seat 1 talks sometimes
    if (room.seats[2] && Math.random() > 0.6) talkers.push(2);
    if (room.seats[3] && Math.random() > 0.5) talkers.push(3);
    room.active_talking_seats = talkers;
  } else {
    room.active_talking_seats = [];
  }

  // Simulate active trivia participation by bot attendees
  if (room.game_active) {
    const bots = ["user_sarah", "user_crypto"];
    bots.forEach(botId => {
      // If the bot has not answered the current question yet
      if (room.game_answers[botId] === undefined) {
        // 20% chance to answer each second to simulate realistic thinking delays
        if (Math.random() > 0.8) {
          const currentQ = room.game_questions[room.game_question_idx];
          if (currentQ) {
            // Select correct option mostly (e.g. 75% accuracy for bots)
            const isCorrect = Math.random() < 0.75;
            const chosenIdx = isCorrect ? currentQ.answerIndex : Math.floor(Math.random() * currentQ.options.length);
            
            room.game_answers[botId] = chosenIdx;
            
            const uObj = users[botId];
            if (uObj) {
              if (chosenIdx === currentQ.answerIndex) {
                room.game_scores[botId] = (room.game_scores[botId] || 0) + 100;
                uObj.ap += 20;
              } else {
                uObj.ap += 5;
              }
              uObj.level = Math.floor(uObj.ap / 250) + 1;
            }
          }
        }
      }
    });
  }

  // Handle Host Abandonment Disconnection Timer
  if (room.abandoned_timer_active && !room.host_online) {
    if (room.abandoned_time_remaining > 0) {
      room.abandoned_time_remaining -= 1;
      
      // Auto Rollback when timer hits zero!
      if (room.abandoned_time_remaining === 0) {
        executeEscrowRollback("Host failed to reconnect within grace timeout.");
      }
    }
  }
}, 1000);

// Bot chatter to make the stage feel alive at intervals
setInterval(() => {
  if (!room.host_online) return;
  const prompts = [
    "Wow, this visual dashboard is clean!",
    "Can someone request Mic seat 3 and co-host?",
    "Just sent some AP interactions. Daily quests are resetting soon!",
    "The audio WebRTC latency is incredibly low here.",
    "Trivia questions generated via AI are so much better.",
    "Let's play Trivia! Host, start the round!"
  ];
  const bots = ["Sarah_Pro_Gifter", "CryptoWizard"];
  const bot = bots[Math.floor(Math.random() * bots.length)];
  const text = prompts[Math.floor(Math.random() * prompts.length)];
  const userObj = users[bot === "Sarah_Pro_Gifter" ? "user_sarah" : "user_crypto"];

  if (Math.random() > 0.82) {
    room.chat_feed.push({
      id: "bot_msg_" + Date.now(),
      username: bot,
      text: text,
      timestamp: new Date().toISOString(),
      type: "chat",
      badge: `⚡ Level ${userObj.level}`,
      glowing_aura: userObj.has_glowing_aura
    });
    // Keep chat log readable
    if (room.chat_feed.length > 50) {
      room.chat_feed.shift();
    }
  }
}, 16000);

// Helper to execute Escrow Rollback securely
function executeEscrowRollback(reason: string) {
  room.abandoned_timer_active = false;
  const refundCount = room.escrow_users.length;
  
  if (refundCount > 0) {
    room.escrow_users.forEach((entry) => {
      const u = users[entry.user_id];
      if (u) {
        u.gem_balance += entry.fee_paid; // Return fee atomically
        ledger.push({
          id: `rollback_refund_${Date.now()}_${u.id}`,
          timestamp: new Date().toISOString(),
          sender_username: "Escrow Reserve",
          receiver_username: u.username,
          amount: entry.fee_paid,
          type: "escrow_rollback",
          description: `Refunded entry fee of ${entry.fee_paid} Gems due to host abandonment.`
        });
      }
    });
  }

  // Deduct penalty from host profile earned_balance as prepaid server overhead fee
  const hostUserProfile = users[room.host_id];
  if (hostUserProfile) {
    const penalty = 150;
    hostUserProfile.earned_balance = Math.max(0, hostUserProfile.earned_balance - penalty);
    ledger.push({
      id: `rollback_penalty_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender_username: hostUserProfile.username,
      receiver_username: "Platform Overhead",
      amount: penalty,
      type: "escrow_rollback",
      description: `Disconnection Penalty charged to host AriaGamer (-${penalty} Earned Gems).`
    });
  }

  room.escrow_pool = 0;
  room.escrow_users = [];
  room.chat_feed.push({
    id: "system_rollback_" + Date.now(),
    username: "System Security Monitor",
    text: `🛑 CRITICAL: Host connection dropped for over 180s. Rollback script executed: refunded ${refundCount} participants. Charged host penalty fee of 150 Gems.`,
    timestamp: new Date().toISOString(),
    type: "error"
  });
}

// ==========================================
// REST API INSTANCES / INTERFACES
// ==========================================

// 1. Get User Profile or switch selected active user profile
app.get("/api/users", (req, res) => {
  res.json({ users: Object.values(users) });
});

app.post("/api/users/claim-streak", async (req, res) => {
  const { user_id } = req.body;
  const user = users[user_id];
  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }

  await acquireLock();
  try {
    if (user.daily_streak >= 6 && !user.has_glowing_aura) {
      user.daily_streak += 1;
      user.has_glowing_aura = true; // Complete 7-day streak to trigger avatar glowing aura!
      user.ap += 100; // Quest Completion AP
      
      room.chat_feed.push({
        id: "streak_" + Date.now(),
        username: "System",
        text: `🎉 CONGRATS: ${user.username} achieved 7-day login streak milestone! Glowing Avatar Aura unlocked + 100 AP awarded!`,
        timestamp: new Date().toISOString(),
        type: "entrance"
      });
      
      res.json({ success: true, message: "Claimed 7-day login streak successfully!", user });
    } else {
      res.status(400).json({ error: "Streak criteria not met or already claimed today." });
    }
  } finally {
    releaseLock();
  }
});

// Reset streak testing endpoint (forces user back to Day 6 to allow interactive test or reset)
app.post("/api/users/reset-streak", (req, res) => {
  const { user_id } = req.body;
  const user = users[user_id];
  if (user) {
    user.daily_streak = 6;
    user.has_glowing_aura = false;
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Dynamic AP accumulation hook
app.post("/api/users/accumulate-ap", (req, res) => {
  const { user_id, type } = req.body;
  const user = users[user_id];
  if (!user) return res.status(404).json({ error: "User not found" });

  let award = 0;
  let description = "";
  if (type === "listen") {
    award = 5;
    description = "Listen duration increment (+5 AP)";
  } else if (type === "chat") {
    award = 1;
    description = "Chat message activity participation (+1 AP)";
  } else if (type === "game") {
    award = 20;
    description = "Game completed victory state (+20 AP)";
  }

  user.ap += award;
  // Calculate level calculation
  const newLevel = Math.floor(user.ap / 250) + 1;
  const didLevelUp = newLevel > user.level;
  user.level = newLevel;

  res.json({ success: true, ap: user.ap, level: user.level, didLevelUp });
});

// Buy Gems Integration Simulation (Safe server-side simulation)
app.post("/api/wallet/buy-gems", async (req, res) => {
  const { user_id, amount } = req.body;
  if (amount <= 0) return res.status(400).json({ error: "Invalid amount value." });

  await acquireLock();
  try {
    const userObj = users[user_id];
    if (!userObj) return res.status(404).json({ error: "User profile not found" });

    userObj.gem_balance += amount;
    
    ledger.push({
      id: "buy_" + Date.now(),
      timestamp: new Date().toISOString(),
      sender_username: "Standard Google Pay/Stripe Sandbox Gateway",
      receiver_username: userObj.username,
      amount: amount,
      type: "gems_purchase",
      description: `Deposited token packet of ${amount} Gems securely via in-app authorization.`
    });

    res.json({ success: true, new_balance: userObj.gem_balance });
  } finally {
    releaseLock();
  }
});

// Get general Room State
app.get("/api/room/state", (req, res) => {
  res.json({ room, ledger });
});

// Join Room Entry validation & Gated Ingestion Flow (Section 3 & 4)
app.post("/api/room/join", async (req, res) => {
  const { user_id } = req.body;
  const userObj = users[user_id];
  if (!userObj) return res.status(404).json({ error: "User not found" });

  await acquireLock();
  try {
    // 1. Check if user already entered/verified
    const alreadyEscrowed = room.escrow_users.some(entry => entry.user_id === user_id);
    if (alreadyEscrowed) {
      if (!room.participants.includes(user_id)) {
        room.participants.push(user_id);
        room.listener_count = room.participants.length + 2; // + host and Sarah
        
        // Broadcast arrival
        room.chat_feed.push({
          id: "join_" + Date.now(),
          username: "System",
          text: `👋 User ${userObj.username} rejoined the arena floor floor!`,
          timestamp: new Date().toISOString(),
          type: "entrance",
          glowing_aura: userObj.has_glowing_aura
        });
      }
      return res.json({ success: true, status: "already_paid", room });
    }

    // 2. Perform Gated Ingestion balance checks
    if (userObj.gem_balance < room.entry_fee) {
      return res.status(402).json({
        error: "Insufficient Gems",
        required: room.entry_fee,
        current: userObj.gem_balance,
        msg: "Please exchange/deposit micro-gems in the wallet settings panel before joining."
      });
    }

    // 3. Execute atomic transaction
    userObj.gem_balance -= room.entry_fee;
    room.escrow_pool += room.entry_fee;
    room.escrow_users.push({ user_id: user_id, fee_paid: room.entry_fee });
    
    if (!room.participants.includes(user_id)) {
      room.participants.push(user_id);
    }
    room.listener_count = room.participants.length + 3; // audience scaling

    // Record Ledger
    ledger.push({
      id: "entry_tx_" + Date.now(),
      timestamp: new Date().toISOString(),
      sender_username: userObj.username,
      receiver_username: "Room Escrow Pool",
      amount: room.entry_fee,
      type: "room_entry",
      description: `Gated room entry fee transaction of ${room.entry_fee} Gems deducted. Tokens locked in Escrow Pool pending Host Settlement.`
    });

    // Send visual priority high-badge entrance banner if user profile has glowing aura!
    const customText = userObj.has_glowing_aura 
      ? `👑 PRIORITY BADGE: Elite Member ${userObj.username} entered the grand arena! Aura active.`
      : `👋 User ${userObj.username} paid entry fee and joined the arena floor.`;

    room.chat_feed.push({
      id: "join_welcome_" + Date.now(),
      username: "System",
      text: customText,
      timestamp: new Date().toISOString(),
      type: "entrance",
      glowing_aura: userObj.has_glowing_aura
    });

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Lock failure error" });
  } finally {
    releaseLock();
  }
});

// Update room settings (only allowed by the Creator Host)
app.post("/api/room/update-settings", async (req, res) => {
  const { user_id, name, entry_fee } = req.body;
  
  if (user_id !== "admin_host") {
    return res.status(403).json({ error: "Only the matching Creator Host has permission to alter Room metadata settings." });
  }

  await acquireLock();
  try {
    if (name && name.trim()) {
      room.name = name.trim();
    }
    if (typeof entry_fee === "number" && entry_fee >= 0) {
      room.entry_fee = entry_fee;
    }

    room.chat_feed.push({
      id: "system_" + Date.now(),
      username: "System",
      text: `Host updated room settings: Name is now "${room.name}", Entry Gated Fee is ${room.entry_fee} Gems.`,
      timestamp: new Date().toISOString(),
      type: "system"
    });

    res.json({ success: true, room });
  } catch (err: any) {
    res.status(500).json({ error: "Lock failure" });
  } finally {
    releaseLock();
  }
});

// Interactive state actions
app.post("/api/room/chat", (req, res) => {
  const { user_id, text } = req.body;
  const user = users[user_id];
  if (!user) return res.status(404).json({ error: "User profile missing" });

  // Append new chat
  room.chat_feed.push({
    id: "msg_" + Date.now(),
    username: user.username,
    text: text,
    timestamp: new Date().toISOString(),
    type: "chat",
    badge: user.role === "host" ? "★ Host" : `⚡ Level ${user.level}`,
    glowing_aura: user.has_glowing_aura
  });

  // Give 1 AP
  user.ap += 1;
  const oldLevel = user.level;
  user.level = Math.floor(user.ap / 250) + 1;

  res.json({ success: true, levelUp: user.level > oldLevel });
});

// Mic Stage state modifications (Request mic/Leave mic)
app.post("/api/room/request-mic", (req, res) => {
  const { user_id, seat_index } = req.body;
  const user = users[user_id];
  if (!user) return res.status(404).json({ error: "User missing" });

  if (seat_index <= 0 || seat_index > 5) {
    return res.status(400).json({ error: "Invalid seating selection index." });
  }

  if (room.seats[seat_index] !== null) {
    return res.status(409).json({ error: "That microphone seat is currently occupied." });
  }

  // Remove user from any existing seats they occupied
  for (let i = 1; i <= 5; i++) {
    if (room.seats[i] === user_id) {
      room.seats[i] = null;
    }
  }

  // Occupy seat
  room.seats[seat_index] = user_id;
  room.chat_feed.push({
    id: "mic_" + Date.now(),
    username: "Stage Coordinator",
    text: `🎙️ ${user.username} requested a mic and took Seat #${seat_index + 1}! Live audio incoming on WebRTC channel.`,
    timestamp: new Date().toISOString(),
    type: "system"
  });

  res.json({ success: true, seats: room.seats });
});

app.post("/api/room/leave-mic", (req, res) => {
  const { user_id } = req.body;
  let cleared = false;
  for (let i = 1; i <= 5; i++) {
    if (room.seats[i] === user_id) {
      room.seats[i] = null;
      cleared = true;
    }
  }

  if (cleared) {
    const user = users[user_id];
    room.chat_feed.push({
      id: "mic_exit_" + Date.now(),
      username: "Stage Coordinator",
      text: `🎙️ ${user ? user.username : "Player"} released their mic and returned to the audience floor.`,
      timestamp: new Date().toISOString(),
      type: "system"
    });
  }

  res.json({ success: true, seats: room.seats });
});

// Virtual Gifting logic + Creator payout calculations (Section 4)
app.post("/api/room/send-gift", async (req, res) => {
  const { user_id, gift_type } = req.body;
  const userObj = users[user_id];
  const hostObj = users[room.host_id];
  if (!userObj || !hostObj) return res.status(404).json({ error: "Sender/Receiver profiles missing Error." });

  // Definition of premium gifts
  const giftValues: Record<string, { label: string; cost: number; icon: string }> = {
    mic: { label: "Golden Mic", cost: 50, icon: "🎙️" },
    crown: { label: "Royal Crown", cost: 250, icon: "👑" },
    aura: { label: "Galaxy Aura", cost: 500, icon: "💫" },
    rocket: { label: "Hyper Rocket", cost: 1000, icon: "🚀" }
  };

  const selectedGift = giftValues[gift_type];
  if (!selectedGift) return res.status(400).json({ error: "Invalid gift type selected." });

  await acquireLock();
  try {
    // 1. Transactional check for double-spend protection
    if (userObj.gem_balance < selectedGift.cost) {
      return res.status(402).json({
        error: "Insufficient token tokens",
        current: userObj.gem_balance,
        required: selectedGift.cost,
        msg: "Cannot execute transaction. Deposit micro-gems to afford this interactive gift."
      });
    }

    // 2. Perform transactions
    userObj.gem_balance -= selectedGift.cost;
    
    // Formula calculation of platform rake (exactly 30%)
    const grossTokens = selectedGift.cost;
    const platformRake = Math.round(grossTokens * 0.3);
    const creatorShare = grossTokens - platformRake;

    hostObj.earned_balance += creatorShare;

    // Log transaction Ledger (ACID audit trail)
    ledger.push({
      id: "gift_tx_" + Date.now(),
      timestamp: new Date().toISOString(),
      sender_username: userObj.username,
      receiver_username: hostObj.username,
      amount: selectedGift.cost,
      type: "gift",
      description: `Sent ${selectedGift.label} gift. Gross: ${grossTokens} Gems (Creator payout: +${creatorShare} Gems, platform rake: ${platformRake} Gems).`
    });

    // Inject system interaction into room chat
    room.chat_feed.push({
      id: "gift_announcement_" + Date.now(),
      username: "Gifting Alert",
      text: `🎁 WOW! ${userObj.username} sent Host ${hostObj.username} a ${selectedGift.icon} ${selectedGift.label}! The gameplay elements warp with excitement!`,
      timestamp: new Date().toISOString(),
      type: "gift",
      badge: `⭐ Special Gift`,
      glowing_aura: userObj.has_glowing_aura
    });

    // Gameplay alterations: Sending a gift boosts scores or provides bonuses to interactive play
    if (room.game_active) {
      room.game_status_text = `🔥 GIFT HYPED! sending ${selectedGift.label} added scoring score multipliers to active stage members!`;
      // Bonus scores to trivia submitters
      Object.keys(room.game_scores).forEach((pId) => {
        room.game_scores[pId] = (room.game_scores[pId] || 0) + 10;
      });
    }

    res.json({
      success: true,
      new_gem_balance: userObj.gem_balance,
      creatorPayout: creatorShare,
      platformRake,
      host_new_earned: hostObj.earned_balance
    });
  } finally {
    releaseLock();
  }
});

// AI Trivia Generator powered on the Gemini-3.5-flash model server-side
app.post("/api/gemini/generate-trivia", async (req, res) => {
  const { categoryPrompt } = req.body;
  const promptInput = categoryPrompt || "Tech & Silicon Valley";

  const gemini = getGeminiClient();
  if (!gemini) {
    // Graceful fallback when API Key is absent in preview container
    console.log("No active Gemini API key found, spawning pre-crafted theme questions.");
    return res.json({
      success: true,
      from_gemini: false,
      questions: [
        {
          category: promptInput,
          question: `Which tech company built the iconic Macintosh computer, launched in 1984?`,
          options: ["IBM", "Microsoft", "Apple", "Commodore"],
          answerIndex: 2,
        },
        {
          category: promptInput,
          question: `In full-stack architectures, what does the 'M' stand for in the popular MEAN stack?`,
          options: ["MySQL", "MongoDB", "MariaDB", "MemoryCached"],
          answerIndex: 1,
        },
        {
          category: promptInput,
          question: `What was the codename of Android OS version 10?`,
          options: ["Honeycomb", "Pie", "Android Q", "KitKat"],
          answerIndex: 2,
        },
        {
          category: promptInput,
          question: `How many micro-tokens fit into one standard platform diamond?`,
          options: ["10 Gems", "100 Gems", "1000 Gems", "10,000 Gems"],
          answerIndex: 1,
        },
        {
          category: promptInput,
          question: `Which database engine natively implements the highly structured sorting lists known as Redis Sorted Sets?`,
          options: ["Redis", "PostgreSQL", "SQLite", "Firebase Firestore"],
          answerIndex: 0,
        }
      ]
    });
  }

  try {
    const formattedPrompt = `Generate a set of 5 very tricky multiple-choice trivia questions on the topic: "${promptInput}". 
    Create distinct, interesting incorrect options. Make sure the 'answerIndex' points to the 0-indexed correct option.
    Return EXACTLY a JSON array matching this typescript schema: 
    Array<{ question: string, options: string[], answerIndex: number, category: string }>`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              answerIndex: { type: Type.INTEGER },
              category: { type: Type.STRING }
            },
            required: ["question", "options", "answerIndex", "category"]
          }
        }
      }
    });

    const textContent = response.text;
    if (textContent) {
      const parsed = JSON.parse(textContent);
      res.json({
        success: true,
        from_gemini: true,
        questions: parsed
      });
    } else {
      throw new Error("Empty model response text received from Gemini endpoint.");
    }
  } catch (error: any) {
    console.error("Gemini compilation / response parsing failed:", error);
    res.status(500).json({
      error: "Gemini server extraction error.",
      details: error.message,
      msg: "Falling back to safe embedded categories."
    });
  }
});

// Interactive Game State administration control (Start, Next, Answer, Settle)
app.post("/api/game/start", (req, res) => {
  const { questions } = req.body;
  if (questions && Array.isArray(questions) && questions.length > 0) {
    room.game_questions = questions;
  } else {
    // default category choice
    room.game_questions = fallbackTrivia;
  }

  room.game_active = true;
  room.game_question_idx = 0;
  room.game_answers = {};
  room.game_scores = {};
  room.game_status_text = `Trivia round active! Question 1 of ${room.game_questions.length} displayed on the canvas. Submit your response fast!`;

  room.chat_feed.push({
    id: "game_alert_" + Date.now(),
    username: "System Matchmaker",
    text: `🎮 GAME ALERT: Host AriaGamer started are multiplayer Trivia Round: "${room.game_questions[0].category}"! Let's compete on the live stage.`,
    timestamp: new Date().toISOString(),
    type: "system"
  });

  res.json({ success: true, room });
});

app.post("/api/game/submit-answer", (req, res) => {
  const { user_id, option_idx } = req.body;
  if (!room.game_active) return res.status(400).json({ error: "No active game in progress." });

  const currentQ = room.game_questions[room.game_question_idx];
  room.game_answers[user_id] = option_idx;

  // Add listener points & reward checks
  const uObj = users[user_id];
  if (uObj) {
    if (option_idx === currentQ.answerIndex) {
      room.game_scores[user_id] = (room.game_scores[user_id] || 0) + 100;
      uObj.ap += 20; // 20 Activity Points for answering a question correct!
    } else {
      uObj.ap += 5; // 5 AP participation point!
    }
    // Level up calculation logic
    uObj.level = Math.floor(uObj.ap / 250) + 1;
  }

  res.json({ success: true, your_score: room.game_scores[user_id] || 0 });
});

app.post("/api/game/next-question", (req, res) => {
  if (!room.game_active) return res.status(400).json({ error: "Game not active" });

  if (room.game_question_idx + 1 < room.game_questions.length) {
    room.game_question_idx += 1;
    room.game_answers = {};
    room.game_status_text = `Warping to Question ${room.game_question_idx + 1} of ${room.game_questions.length}! Lock in your scores.`;
    
    room.chat_feed.push({
      id: "game_next_" + Date.now(),
      username: "System Matchmaker",
      text: `⚡ Question ${room.game_question_idx + 1}: ${room.game_questions[room.game_question_idx].question}`,
      timestamp: new Date().toISOString(),
      type: "system"
    });
    
    res.json({ success: true, room });
  } else {
    // Game completed - triggers Automated Escrow Settlement Disbursements!
    room.game_active = false;
    room.game_status_text = "Trivia round finished. Tabulating scores and releasing escrow pool gems!";

    // Automate disbursement to Host's earned_balance with 플랫폼 30% platform rake applied
    const grossTokens = room.escrow_pool;
    const platformRake = Math.round(grossTokens * 0.3);
    const hostDisbursed = grossTokens - platformRake;

    const host = users[room.host_id];
    if (host) {
      host.earned_balance += hostDisbursed;
    }

    // Push payout ledger entries
    if (grossTokens > 0) {
      ledger.push({
        id: "escrow_settle_tx_" + Date.now(),
        timestamp: new Date().toISOString(),
        sender_username: "Room Escrow Pool",
        receiver_username: host ? host.username : "Host",
        amount: grossTokens,
        type: "escrow_payout",
        description: `Automated Escrow pool Disbursement completed: Session achieved games criterion. Paid Host: +${hostDisbursed} Gems (Platform rake: ${platformRake} Gems).`
      });
    }

    // Identify trivia MVP for entry records
    let mvpName = "None";
    let highestSc = -1;
    Object.entries(room.game_scores).forEach(([uId, sc]) => {
      const u = users[uId];
      if (u && sc > highestSc) {
        highestSc = sc;
        mvpName = u.username;
      }
    });

    room.chat_feed.push({
      id: "game_end_" + Date.now(),
      username: "System Matchmaker",
      text: `🏆 GAME SET: The Trivia competition wraps! MVP is ${mvpName} with ${highestSc || 0} scores. Escrow pool of ${grossTokens} Gems released to host.`,
      timestamp: new Date().toISOString(),
      type: "entrance"
    });

    // Clear escrow details for next clean state
    room.escrow_pool = 0;
    room.escrow_users = [];

    res.json({ success: true, room, mvp: mvpName, score: highestSc });
  }
});

// Operational Risk Control testing Hooks
app.post("/api/test-control/simulate-disconnect", (req, res) => {
  const { disconnect_status } = req.body;
  
  if (disconnect_status) {
    // Simulated host goes offline! Triggers 180s rollback countdown immediately
    room.host_online = false;
    room.abandoned_timer_active = true;
    room.abandoned_time_remaining = 180;
    
    room.chat_feed.push({
      id: "disconnect_" + Date.now(),
      username: "System Connection Monitor",
      text: "💥 WARNING: Host AriaGamer's WebRTC link dropped! Server heartbeat missed. Grace rollback countdown started: 180s remaining.",
      timestamp: new Date().toISOString(),
      type: "error"
    });
  } else {
    // Reconnection successful - timer suspended!
    room.host_online = true;
    room.abandoned_timer_active = false;
    room.abandoned_time_remaining = 180;
    
    room.chat_feed.push({
      id: "reconnect_" + Date.now(),
      username: "System Connection Monitor",
      text: "🟢 SECURED: Host AriaGamer reconnected successfully! Heartbeat link active. Rollback countdown suspended safely.",
      timestamp: new Date().toISOString(),
      type: "system"
    });
  }
  res.json({ success: true, room });
});

// Force fast-forward disconnection countdown for audit testing
app.post("/api/test-control/force-rollback-now", (req, res) => {
  if (!room.host_online) {
    executeEscrowRollback("Forced rollback requested by test suite audit pipeline.");
    res.json({ success: true, room });
  } else {
    res.status(400).json({ error: "Host must be offline to execute escrow refund rollback." });
  }
});


// ==========================================
// VITE AND MIDDLEWARE COMPACT ENTRY POINT
// ==========================================

async function startServer() {
  // Integrate Vite for seamless frontend delivery matching the platform requirements
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite asset handling middlewares
    app.use(vite.middlewares);
  } else {
    // serve built static client in prod
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArenaStage Server running at container port: ${PORT}`);
  });
}

startServer();
