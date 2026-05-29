import React, { useState } from "react";
import { 
  Sparkles, 
  Gamepad2, 
  Play, 
  ArrowRight, 
  ListChecks, 
  CheckCircle2, 
  Trophy, 
  UserCheck, 
  HelpCircle, 
  FileJson,
  BrainCircuit
} from "lucide-react";
import { UserProfile, RoomState, TriviaQuestion } from "../types";

interface InteractionCanvasProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  room: RoomState;
  onGenerateTrivia: (category: string) => Promise<void>;
  onStartGame: (questions: TriviaQuestion[]) => void;
  onSubmitAnswer: (optionIdx: number) => void;
  onNextQuestion: () => void;
  isGeneratingStatus: boolean;
  geminiActive: boolean;
}

export const InteractionCanvas: React.FC<InteractionCanvasProps> = ({
  currentUser,
  allUsers,
  room,
  onGenerateTrivia,
  onStartGame,
  onSubmitAnswer,
  onNextQuestion,
  isGeneratingStatus,
  geminiActive,
}) => {
  const [topicPrompt, setTopicPrompt] = useState("Silicon Valley Tech History");
  const [generatedPreview, setGeneratedPreview] = useState<TriviaQuestion[] | null>(null);

  const activeQuestion = room.game_active && room.game_questions[room.game_question_idx] 
    ? room.game_questions[room.game_question_idx] 
    : null;

  // Check if player submitted answer for current question
  const hasAnswered = activeQuestion && room.game_answers[currentUser.id] !== undefined;
  const selectedIdx = activeQuestion ? room.game_answers[currentUser.id] : null;

  // Handle local AI trivia requests
  const handleAITriviaClick = async () => {
    if (!topicPrompt.trim()) return;
    await onGenerateTrivia(topicPrompt);
    // Preview populated on state update
  };

  // Preset themes
  const handlePresetSelect = (themeName: string) => {
    setTopicPrompt(themeName);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[460px]" id="interaction-canvas">
      {/* BACKGROUND DECORATIVE WATERMARKS */}
      <div className="absolute right-0 bottom-0 opacity-5 select-none pointer-events-none">
        <Gamepad2 className="w-96 h-96 text-white" />
      </div>

      {/* ZONE HEADER */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 z-10">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-amber-500" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Interactive HTML5 Canvas Viewport</h4>
            <p className="text-[10px] text-neutral-400">Server-Authoritative Game Instance Feed</p>
          </div>
        </div>

        {/* Gemini Active Badge indicator */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono bg-indigo-950/40 border border-indigo-900 px-2 py-0.5 rounded-full text-indigo-300">
          <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gemini AI Core: ACTIVE</span>
        </div>
      </div>

      {/* MAIN OPERATIONS INTERFACE AREA */}
      <div className="my-auto py-5 z-10 flex-grow flex flex-col justify-center">
        {/* VIEW 1: PRE-GAME LOBBY (NO ACTIVE GAME) */}
        {!room.game_active ? (
          <div className="space-y-4 animate-fadeIn">
            {/* INSTRUCTIONS */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-extrabold text-white">Multiplayer Arena Trivia Lobby</h2>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Generate dynamic, AI-themed multiple-choice rounds server-side, or select a preset to begin the competitive match.
              </p>
            </div>

            {/* AI TRIVIA GENERATOR GENERATION CARD */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                <span>AI Creative Theme Engine (Gemini-3.5-flash)</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  placeholder="Enter custom trivia theme..." 
                  maxLength={50}
                  className="flex-grow bg-neutral-900 border border-neutral-700 rounded-lg py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  onClick={handleAITriviaClick}
                  disabled={isGeneratingStatus}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 shrink-0"
                >
                  {isGeneratingStatus ? (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Synthesizing...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Generate AI Match questions
                    </>
                  )}
                </button>
              </div>

              {/* Preset suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-neutral-500 flex items-center font-mono">Presets:</span>
                {["Space Colonization 🚀", "Retro Video Games 👾", "Modern Web3 Tech 🔗", "WebRTC & Video Streams 🎙️"].map((prs) => (
                  <button
                    key={prs}
                    type="button"
                    onClick={() => handlePresetSelect(prs.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim())}
                    className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-400 py-0.5 px-2 rounded-md border border-neutral-850 cursor-pointer"
                  >
                    {prs}
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW DISPLAY REFRESH PREPARATIONS */}
            {room.game_questions && room.game_questions.length > 0 && (
              <div className="bg-neutral-950/40 border border-neutral-800/65 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ListChecks className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <h5 className="text-[11px] font-bold text-neutral-300">
                      MATCH GAME QUESTIONS STAGED ({room.game_questions.length} questions)
                    </h5>
                    <p className="text-[10px] text-neutral-500">
                      Topic: <span className="text-indigo-400 font-mono">{room.game_questions[0].category}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onStartGame(room.game_questions)}
                  disabled={!room.host_online}
                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow hover:scale-[1.02]"
                >
                  <Play className="w-3.5 h-3.5 fill-black font-black" />
                  Boot Match
                </button>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: ACTIVE TRIVIA ROUND (GAME IS ON AIR) */
          <div className="space-y-5 animate-fadeIn" id="canvas-game-on">
            {/* QUESTION STATUS HEADER */}
            <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
              <span className="text-amber-400 font-bold text-[11px] uppercase tracking-wider font-mono">
                ✦ Active Question {room.game_question_idx + 1} of {room.game_questions.length}
              </span>
              <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                Type: {activeQuestion?.category}
              </span>
            </div>

            {/* DISPLAY LEVEL QUESTION STATEMENT */}
            <div className="text-center py-2 max-w-2xl mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                "{activeQuestion?.question}"
              </h3>
              <p className="text-[11px] text-neutral-500 tracking-wider">
                Select your answer option. Core scoring answers add AP level progression and credits you on the leaderboard!
              </p>
            </div>

            {/* MULTIPLE CHOICE GRID OPTIONS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto" id="trivia-options-tray">
              {activeQuestion?.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isCorrect = idx === activeQuestion.answerIndex;
                const borderDesign = isSelected 
                  ? "border-amber-400 bg-amber-400/5 text-amber-300"
                  : hasAnswered && isCorrect
                    ? "border-emerald-500 bg-emerald-500/5 text-emerald-300"
                    : "border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 text-neutral-300 hover:text-white";

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasAnswered}
                    onClick={() => onSubmitAnswer(idx)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all relative flex items-center justify-between cursor-pointer ${borderDesign}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] flex items-center justify-center text-neutral-400 shrink-0 uppercase font-mono">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {/* Right feedback checkmarks */}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    {hasAnswered && isCorrect && !isSelected && (
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Correct Answer" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* STATUS BOX NOTIFICATIONS */}
            <div className="text-center text-xs p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80 max-w-md mx-auto">
              <span className="text-neutral-400 italic block font-mono text-[11px]">
                {hasAnswered 
                  ? selectedIdx === activeQuestion?.answerIndex
                    ? "✨ CORRECT! AP LEVEL PROGRESSION CREDITED (+20 AP)"
                    : "❌ INCORRECT (Participation level feedback given +5 AP)"
                  : "⌛ Awaiting your telemetry submission..."}
              </span>
              <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-widest">{room.game_status_text}</p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: DYNAMIC MATCH SCOREBOARD / RANK (ONLY ACTIVE IN-GAME) */}
      {room.game_active ? (
        <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 z-10" id="canvas-active-footer">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Match Arena Scoreboard</h5>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-mono text-neutral-300">
                {allUsers.map((user) => {
                  const score = room.game_scores[user.id] || 0;
                  const isSelf = user.id === currentUser.id;
                  const isHost = user.role === "host";
                  return (
                    <span key={user.id} className="inline-block text-neutral-450">
                      {user.username} {isHost ? "(Host)" : isSelf ? "(You)" : ""}:{" "}
                      <strong className={isHost ? "text-amber-400" : isSelf ? "text-emerald-400 font-bold" : "text-sky-300"}>
                        {score} pts
                      </strong>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NEXT TRIGGER */}
          <button
            onClick={onNextQuestion}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs py-2 px-3.5 rounded-lg border border-neutral-700 transition-colors flex items-center justify-center gap-1 cursor-pointer select-none"
          >
            {room.game_question_idx + 1 === room.game_questions.length ? "Complete Trivia & Settle Escrow" : "Next Trivia State"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* GENERAL LOBBY STATISTICS BANNER */
        <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl flex items-center justify-between text-xs text-neutral-400 z-10">
          <span>Game Selection State: <strong className="text-neutral-300 font-mono">Ready to Host</strong></span>
          <span className="text-amber-400 font-mono text-[11px]">75 Gems Entry Verified (Escrow Backed)</span>
        </div>
      )}
    </div>
  );
};
