import React, { useState } from 'react';
import {
  Users,
  LogOut,
  Compass,
  Trophy,
  Send,
  Sun,
  Volume2,
  VolumeX,
  Columns,
  Bot,
  Sparkles,
} from 'lucide-react';
import { AnimationState, CharacterAppearance } from '@shared/types';
import { ChatBroadcastPayload } from '@shared/protocols/messages';
import { ConnectionStatus } from '../networking/NetworkManager';
import { LeaderboardEntry } from '../scenes/WorldScene';

interface HUDProps {
  username: string;
  appearance: CharacterAppearance;
  onLeaveWorld: () => void;
  playerCoords: { x: number; y: number; z: number };
  connectionStatus: ConnectionStatus;
  pingMs: number;
  leaderboard: LeaderboardEntry[];
  chatMessages: ChatBroadcastPayload[];
  onSendChat: (text: string) => void;
  onTriggerEmote: (emote: AnimationState) => void;
  splitScreen: boolean;
  onToggleSplitScreen: () => void;
  botsEnabled: boolean;
  onToggleBots: () => void;
  timeOfDay: 'day' | 'sunset' | 'night';
  onCycleTime: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onDash: () => void;
  onJump: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  username,
  appearance,
  onLeaveWorld,
  playerCoords,
  connectionStatus,
  pingMs,
  leaderboard,
  chatMessages,
  onSendChat,
  onTriggerEmote,
  splitScreen,
  onToggleSplitScreen,
  botsEnabled,
  onToggleBots,
  timeOfDay,
  onCycleTime,
  muted,
  onToggleMute,
  onDash,
  onJump,
}) => {
  const [chatInput, setChatInput] = useState('');
  const isServerConnected = connectionStatus === 'connected';
  const localStats = leaderboard.find((e) => e.username === username);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top Left: Player Profile & Multiplayer Status */}
        <div className="flex items-center gap-3 p-2.5 pr-4 rounded-xl glass-panel pointer-events-auto">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-base shadow border border-white/20"
            style={{ backgroundColor: appearance.shirtColor || '#3b82f6' }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white leading-tight">{username}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                Lv.{localStats?.level || 1} • {localStats?.score || 0} pts
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{leaderboard.length} Active in World</span>
              <span className="text-[11px] text-slate-400">
                ({isServerConnected ? `Server ${pingMs || 12}ms` : 'Multi-Tab P2P Ready'})
              </span>
            </div>
          </div>
        </div>

        {/* Top Center / Right Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleSplitScreen}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-xs font-semibold transition cursor-pointer ${
              splitScreen ? 'border-pink-400 text-pink-300 bg-pink-500/20' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>{splitScreen ? '2P Split-Screen: ON' : '2P Split-Screen'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBots}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-xs font-semibold transition cursor-pointer ${
              botsEnabled ? 'text-emerald-300' : 'text-slate-400'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Companions: {botsEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onCycleTime}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-xs font-semibold text-amber-300 hover:text-white transition cursor-pointer capitalize"
          >
            <Sun className="w-4 h-4" />
            <span>{timeOfDay}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white transition cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-xs text-slate-300">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>
              {playerCoords.x.toFixed(0)}, {playerCoords.z.toFixed(0)}
            </span>
          </div>

          <button
            type="button"
            onClick={onLeaveWorld}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel text-xs text-red-300 hover:text-white hover:bg-red-900/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        </div>
      </div>

      {/* Middle Row: Leaderboard on Right */}
      <div className="flex justify-end my-auto">
        <div className="w-56 p-3 rounded-xl glass-panel pointer-events-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            <Trophy className="w-4 h-4" />
            <span>Live Leaderboard</span>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {leaderboard.slice(0, 6).map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                  entry.isLocal ? 'bg-blue-500/25 border border-blue-400/30 text-white font-semibold' : 'text-slate-300'
                }`}
              >
                <span className="truncate max-w-[125px]">
                  {idx + 1}. {entry.hasCrown ? '👑 ' : ''}{entry.username}
                </span>
                <span className="font-mono text-amber-300">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Chat + Emote & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
        {/* Bottom Left: Live Multiplayer Chat */}
        <div className="w-full sm:w-80 p-3 rounded-xl glass-panel pointer-events-auto flex flex-col gap-2">
          <div className="h-28 overflow-y-auto space-y-1 pr-1 text-xs">
            {chatMessages.map((m) => (
              <div key={m.id} className="leading-snug break-words">
                <span className="font-bold text-blue-400">{m.senderName}: </span>
                <span className="text-slate-200">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={140}
              placeholder="Press Enter or type to chat..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Bottom Right: 3D Emotes & Quick Actions */}
        <div className="p-3 rounded-xl glass-panel pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>3D Animations & Actions</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTriggerEmote('wave')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
            >
              👋 Wave (1)
            </button>
            <button
              type="button"
              onClick={() => onTriggerEmote('dance')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
            >
              🕺 Dance (2)
            </button>
            <button
              type="button"
              onClick={() => onTriggerEmote('spin')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
            >
              🌀 Spin (3)
            </button>
            <button
              type="button"
              onClick={() => onTriggerEmote('sit')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
            >
              🪑 Sit (4)
            </button>
            <button
              type="button"
              onClick={onDash}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-600/40 hover:bg-cyan-500/60 border border-cyan-400/50 text-xs font-semibold text-cyan-200 transition cursor-pointer"
            >
              ⚡ Dash (F)
            </button>
            <button
              type="button"
              onClick={onJump}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/40 hover:bg-emerald-500/60 border border-emerald-400/50 text-xs font-semibold text-emerald-200 transition cursor-pointer"
            >
              ⬆️ Jump (Space)
            </button>
          </div>
          {splitScreen && (
            <div className="text-[11px] text-pink-300 font-medium">
              P1: WASD + Space + Shift | P2: Arrow Keys / IJKL + Enter + RightShift + P
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
