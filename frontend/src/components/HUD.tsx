import React, { useState } from 'react';
import {
  Users,
  LogOut,
  Trophy,
  Send,
  Sun,
  Volume2,
  VolumeX,
  Columns,
  Bot,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import {
  AnimationState,
  CameraControlMode,
  CameraViewMode,
  CharacterAppearance,
  PetType,
  WeatherMode,
} from '@shared/types';
import { ChatBroadcastPayload } from '@shared/protocols/messages';
import { ConnectionStatus } from '../networking/NetworkManager';
import { LeaderboardEntry, QuestState } from '../scenes/WorldScene';

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
  minimapRef: React.RefObject<HTMLCanvasElement>;
  cameraControlMode: CameraControlMode;
  onToggleCameraMode: () => void;
  cameraViewMode: CameraViewMode;
  onCycleCameraView: () => void;
  weatherMode: WeatherMode;
  onCycleWeather: () => void;
  onBoardBus: () => void;
  onBoardSkyTrain: () => void;
  onDriveCar: () => void;
  onFlyPlane: () => void;
  onFlyHeli: () => void;
  onDriveBoat: () => void;
  onFastTravel: (tx: number, tz: number, label: string) => void;
  onInteract: () => void;
  onGrapple: () => void;
  onBlaster: () => void;
  onToggleJetpack: () => void;
  onToggleHoverboard: () => void;
  onBuildRamp: () => void;
  onMeteorEvent: () => void;
  onToggleRace: () => void;
  activeQuest: QuestState;
  onNextQuest: () => void;
  raceStatus: { active: boolean; text: string };
  mountedKind: string | null;
  nextBusStop: string;
  shopOpen: boolean;
  onSetShopOpen: (open: boolean) => void;
  perkSpeed: boolean;
  onTogglePerkSpeed: () => void;
  perkJump: boolean;
  onTogglePerkJump: () => void;
  perkTrail: boolean;
  onTogglePerkTrail: () => void;
  petType: PetType;
  onCyclePet: () => void;
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
  minimapRef,
  cameraControlMode,
  onToggleCameraMode,
  cameraViewMode,
  onCycleCameraView,
  weatherMode,
  onCycleWeather,
  onBoardBus,
  onBoardSkyTrain,
  onDriveCar,
  onFlyPlane,
  onFlyHeli,
  onDriveBoat,
  onFastTravel,
  onInteract,
  onGrapple,
  onBlaster,
  onToggleJetpack,
  onToggleHoverboard,
  onBuildRamp,
  onMeteorEvent,
  onToggleRace,
  activeQuest,
  onNextQuest,
  raceStatus,
  mountedKind,
  nextBusStop,
  shopOpen,
  onSetShopOpen,
  perkSpeed,
  onTogglePerkSpeed,
  perkJump,
  onTogglePerkJump,
  perkTrail,
  onTogglePerkTrail,
  petType,
  onCyclePet,
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

  const getBiomeName = () => {
    const x = playerCoords.x;
    const z = playerCoords.z;
    if (Math.sqrt(x * x + z * z) < 24) return '📍 Central Plaza';
    if (x > 135) return '⚓ Coral Harbor & Lighthouse';
    if (x > 30 && Math.abs(z) < 35) return '🌊 Serene Crystal Lake';
    if (z < -135) return '🏔️ Frostpeak Alpine Citadel';
    if (z < -32 && Math.abs(x) < 55) return '🌲 Whispering Pine Forest';
    if (x < -135) return '🏜️ Mirage Desert & Great Pyramid';
    if (x < -28 && Math.abs(z) < 40) return '🏡 Sunlit Windmill Village';
    if (z > 135) return '🌋 Emberforge Volcano Crater';
    if (z > 30 && Math.abs(x) < 45) return '🏛️ Sky-Citadel District';
    if (x > 85 && z < -85) return '🔭 Starlight Observatory';
    if (x < -85 && z > 85) return '🗿 Ancient Aether Monoliths';
    if (x < -75 && z < -75) return '🎡 Wonderland Playground Park';
    if (x > 75 && z > 75) return '🏎️ Stunt Overpass Valley';
    return '🛣️ Aether Grand Highway';
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none p-2.5 sm:p-4 flex flex-col justify-between overflow-hidden select-none">
        {/* Top Bar */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 p-2 pr-3.5 rounded-xl glass-panel">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow border border-white/20"
                style={{ backgroundColor: appearance.shirtColor || '#3b82f6' }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white leading-tight">{username}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-200 font-semibold">
                    Lv.{localStats?.level || 1} • {localStats?.score || 0} pts
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{leaderboard.length} Active</span>
                  <span className="text-slate-400">
                    ({isServerConnected ? `Server ${pingMs || 12}ms` : 'Multi-Tab P2P'})
                  </span>
                </div>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl glass-panel text-xs font-semibold text-cyan-200 border border-cyan-400/25">
              {getBiomeName()}
            </div>
          </div>

          {/* Top Right Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            <select
              aria-label="Fast Travel Region"
              onChange={(e) => {
                const parts = e.target.value.split(',');
                const tx = parseFloat(parts[0]) || 0;
                const tz = parseFloat(parts[1]) || 10;
                const label = e.target.options[e.target.selectedIndex].text;
                onFastTravel(tx, tz, label);
                e.target.blur();
              }}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-cyan-200 bg-slate-900/90 border border-cyan-500/30 focus:outline-none cursor-pointer"
            >
              <option value="0,10">🧭 Fast Travel: Central Plaza (0, 0)</option>
              <option value="-26,-20">🏢 Plaza 4-Story Enterable Sky-Tower (-26, -28)</option>
              <option value="26,20">🏢 East 4-Story Glass High-Rise (26, 28)</option>
              <option value="52,0">🌊 Serene Crystal Lake (65, 0)</option>
              <option value="175,0">⚓ Coral Harbor &amp; Lighthouse (195, 0)</option>
              <option value="0,-65">🌲 Whispering Pine Forest (0, -70)</option>
              <option value="0,-175">🏔️ Frostpeak Alpine Citadel (0, -195)</option>
              <option value="-55,10">🏡 Sunlit Windmill Village (-65, 0)</option>
              <option value="-170,0">🏜️ Mirage Desert &amp; Pyramid (-195, 0)</option>
              <option value="0,60">🏛️ Sky-Citadel District (0, 70)</option>
              <option value="0,170">🌋 Emberforge Volcano Crater (0, 195)</option>
              <option value="128,-128">🔭 Starlight Observatory (140, -140)</option>
              <option value="-128,128">🗿 Ancient Aether Monoliths (-140, 140)</option>
              <option value="-98,-98">🎡 Wonderland Playground Park (-110, -110)</option>
              <option value="95,95">🏎️ Stunt Overpass &amp; Ramps Valley (110, 110)</option>
              <option value="75,-48">✈️ Aether Airport &amp; Runway (75, -55)</option>
              <option value="-60,52">⚽ Town Soccer Stadium (-60, 65)</option>
              <option value="34,24">🎳 Bowling &amp; Basketball Plaza (34, 28)</option>
              <option value="-28,20">🎹 Giant Floor Piano &amp; Disco (-28, 22)</option>
              <option value="220,-220">🏘️ Northeast Suburbia &amp; Towers (220, -220)</option>
              <option value="-220,220">🏛️ Southwest Geometric Park (-220, 220)</option>
            </select>

            <button
              type="button"
              onClick={onBoardBus}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-amber-300 hover:text-white border border-amber-400/40 transition cursor-pointer"
            >
              {mountedKind === 'bus' ? '🚌 Exit Tour Bus' : '🚌 Board Tour Bus'}
            </button>

            <button
              type="button"
              onClick={onDriveCar}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-rose-300 hover:text-white border border-rose-400/40 transition cursor-pointer"
            >
              🏎️ Drive Car
            </button>

            <button
              type="button"
              onClick={onFlyPlane}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-violet-300 hover:text-white border border-violet-400/40 transition cursor-pointer"
            >
              ✈️ Fly Plane
            </button>

            <button
              type="button"
              onClick={onFlyHeli}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-emerald-300 hover:text-white border border-emerald-400/40 transition cursor-pointer"
            >
              🚁 Fly Heli
            </button>

            <button
              type="button"
              onClick={onDriveBoat}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-cyan-300 hover:text-white border border-cyan-400/40 transition cursor-pointer"
            >
              🚤 Drive Boat
            </button>

            <button
              type="button"
              onClick={onBoardSkyTrain}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-sky-300 hover:text-white border border-sky-400/40 transition cursor-pointer"
            >
              🚈 Sky-Train
            </button>

            <button
              type="button"
              onClick={onToggleCameraMode}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-indigo-300 hover:text-white border border-indigo-400/40 transition cursor-pointer"
              title="Toggle Drag Orbit vs Free Mouse-Move Look (Shortcut: M)"
            >
              {cameraControlMode === 'mouse_move' ? '🎯 Cam: Mouse Move' : '🖱️ Cam: Drag'}
            </button>

            <button
              type="button"
              onClick={onCycleCameraView}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-purple-300 hover:text-white transition cursor-pointer"
              title="Cycle 3rd-Person, 1st-Person, & Wide View (Shortcut: V)"
            >
              {cameraViewMode === 'first_person'
                ? '👁️ 1st-Person'
                : cameraViewMode === 'cinematic'
                  ? '🎬 Wide View'
                  : '🎥 3rd-Person'}
            </button>

            <button
              type="button"
              onClick={onCycleWeather}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-cyan-200 hover:text-white transition cursor-pointer capitalize"
            >
              🌦️ {weatherMode}
            </button>

            <button
              type="button"
              onClick={onMeteorEvent}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-orange-300 hover:text-white transition cursor-pointer"
            >
              ☄️ Meteor
            </button>

            <button
              type="button"
              onClick={onToggleRace}
              className="px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-lime-300 hover:text-white transition cursor-pointer"
            >
              🏁 Time Trial
            </button>

            <button
              type="button"
              onClick={() => onSetShopOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs font-bold text-amber-300 hover:text-white border border-amber-400/50 transition cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop</span>
            </button>

            <button
              type="button"
              onClick={onToggleSplitScreen}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold transition cursor-pointer ${
                splitScreen ? 'border-pink-400 text-pink-300 bg-pink-500/20' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{splitScreen ? '2P: ON' : '2P Split'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleBots}
              className={`p-2 rounded-xl glass-panel text-xs font-semibold transition cursor-pointer ${
                botsEnabled ? 'text-emerald-300' : 'text-slate-400'
              }`}
              title="Toggle Autonomous AI Companions"
            >
              <Bot className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCycleTime}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs font-semibold text-amber-300 hover:text-white transition cursor-pointer capitalize"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{timeOfDay}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white transition cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={onLeaveWorld}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-panel text-xs text-red-300 hover:text-white hover:bg-red-900/40 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customize</span>
            </button>
          </div>
        </div>

        {/* Middle Row: 2D Radar & Active Quest (Left) + Live Leaderboard (Right) */}
        <div className="flex items-start justify-between my-auto pointer-events-none">
          <div className="hidden sm:flex flex-col gap-2 pointer-events-auto">
            <div className="p-2.5 rounded-xl glass-panel flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span>World Radar</span>
                <span className="font-mono text-slate-300">
                  {playerCoords.x.toFixed(0)}, {playerCoords.z.toFixed(0)}
                </span>
              </div>
              <canvas
                ref={minimapRef}
                width={130}
                height={130}
                className="rounded-lg bg-slate-950/90 border border-slate-700/80"
              />
              <div className="flex items-center justify-between w-full text-[9px] text-slate-400 mt-1">
                <span>🔵 You</span>
                <span>🟡 Bus</span>
                <span>💎 Shard</span>
              </div>
            </div>

            <div className="w-44 p-2.5 rounded-xl glass-panel flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
                  📜 Active Quest
                </span>
                <button
                  type="button"
                  onClick={onNextQuest}
                  className="px-1.5 py-0.5 rounded bg-amber-500/25 hover:bg-amber-500/45 border border-amber-400/40 text-[10px] font-semibold text-amber-200 cursor-pointer"
                >
                  Next
                </button>
              </div>
              <div className="text-[11px] font-semibold text-white leading-tight">{activeQuest.title}</div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((activeQuest.progress / Math.max(1, activeQuest.goal)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>
                  {activeQuest.progress} / {activeQuest.goal}
                </span>
                <span className="text-emerald-300 font-semibold">+100 XP</span>
              </div>
              {raceStatus.active && (
                <div className="pt-1 border-t border-slate-700/70 text-[11px] font-mono text-lime-300 font-bold">
                  {raceStatus.text}
                </div>
              )}
            </div>
          </div>

          <div className="w-56 p-3 rounded-xl glass-panel pointer-events-auto ml-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span>Live Leaderboard</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {leaderboard.slice(0, 6).map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs ${
                    entry.isLocal
                      ? 'bg-blue-500/25 border border-blue-400/30 text-white font-semibold'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="truncate max-w-[125px]">
                    {idx + 1}. {entry.hasCrown ? '👑 ' : ''}
                    {entry.username}
                  </span>
                  <span className="font-mono text-amber-300">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Chat + Emotes & Action Gadgets */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2.5">
          <div className="w-full sm:w-80 p-2.5 rounded-xl glass-panel pointer-events-auto flex flex-col gap-1.5">
            <div className="h-24 sm:h-28 overflow-y-auto space-y-1 pr-1 text-xs">
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
                placeholder="Chat with players (shows 3D speech bubble)..."
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

          <div className="p-2.5 rounded-xl glass-panel pointer-events-auto flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>3D Animations, Vehicles &amp; Gadgets</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onTriggerEmote('wave')}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
              >
                👋 Wave (1)
              </button>
              <button
                type="button"
                onClick={() => onTriggerEmote('dance')}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
              >
                🕺 Dance (2)
              </button>
              <button
                type="button"
                onClick={() => onTriggerEmote('spin')}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
              >
                🌀 Spin (3)
              </button>
              <button
                type="button"
                onClick={() => onTriggerEmote('sit')}
                className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/60 border border-slate-600 text-xs text-white transition cursor-pointer"
              >
                🪑 Sit (4)
              </button>
              <button
                type="button"
                onClick={onDash}
                className="px-2 py-1 rounded-lg bg-cyan-600/40 hover:bg-cyan-500/60 border border-cyan-400/50 text-xs font-semibold text-cyan-200 transition cursor-pointer"
              >
                ⚡ Dash (F)
              </button>
              <button
                type="button"
                onClick={onJump}
                className="px-2 py-1 rounded-lg bg-emerald-600/40 hover:bg-emerald-500/60 border border-emerald-400/50 text-xs font-semibold text-emerald-200 transition cursor-pointer"
              >
                ⬆️ Jump (Space)
              </button>
              <button
                type="button"
                onClick={onInteract}
                className="px-2 py-1 rounded-lg bg-amber-500/40 hover:bg-amber-500/60 border border-amber-400/60 text-xs font-bold text-amber-100 transition cursor-pointer"
              >
                🔑 Interact / Ride (E)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/60">
              <button
                type="button"
                onClick={onGrapple}
                className="px-2 py-1 rounded-lg bg-sky-600/35 hover:bg-sky-500/55 border border-sky-400/50 text-[11px] font-semibold text-sky-200 transition cursor-pointer"
              >
                🪝 Grapple (Q)
              </button>
              <button
                type="button"
                onClick={onBlaster}
                className="px-2 py-1 rounded-lg bg-fuchsia-600/35 hover:bg-fuchsia-500/55 border border-fuchsia-400/50 text-[11px] font-semibold text-fuchsia-200 transition cursor-pointer"
              >
                🔫 Blaster (G)
              </button>
              <button
                type="button"
                onClick={onToggleJetpack}
                className="px-2 py-1 rounded-lg bg-orange-600/35 hover:bg-orange-500/55 border border-orange-400/50 text-[11px] font-semibold text-orange-200 transition cursor-pointer"
              >
                🚀 Jetpack (J)
              </button>
              <button
                type="button"
                onClick={onToggleHoverboard}
                className="px-2 py-1 rounded-lg bg-pink-600/35 hover:bg-pink-500/55 border border-pink-400/50 text-[11px] font-semibold text-pink-200 transition cursor-pointer"
              >
                🛹 Board (H)
              </button>
              <button
                type="button"
                onClick={onBuildRamp}
                className="px-2 py-1 rounded-lg bg-teal-600/35 hover:bg-teal-500/55 border border-teal-400/50 text-[11px] font-semibold text-teal-200 transition cursor-pointer"
              >
                🧱 Build (B)
              </button>
            </div>

            <div className="text-[11px] text-amber-200 font-medium truncate max-w-xs sm:max-w-md">
              {mountedKind
                ? `🎮 Currently Riding/Driving (${mountedKind.toUpperCase()}) • Press [E] to Exit`
                : `🚌 Tour Bus → ${nextBusStop} • Hold [Space] in mid-air to Glide!`}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Shop & 3D Pet Modal */}
      {shopOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl glass-panel border border-amber-400/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white">🛒 PolyWorld Upgrade Shop &amp; Gear</h3>
                <p className="text-xs text-slate-300">
                  Unlock permanent perks &amp; customize your 3D Pet Companion (auto-saved!).
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSetShopOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col justify-between gap-2">
                <div>
                  <div className="font-bold text-cyan-300">⚡ Hyper-Speed Boots</div>
                  <p className="text-[11px] text-slate-400">
                    +32% Walk, Sprint &amp; Hoverboard speed across the world.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTogglePerkSpeed}
                  className="py-1.5 px-3 rounded-lg bg-cyan-600/40 hover:bg-cyan-500/60 border border-cyan-400/50 font-bold text-white cursor-pointer"
                >
                  {perkSpeed ? '✅ Equipped (Click to Disable)' : 'Equip Speed Boots'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col justify-between gap-2">
                <div>
                  <div className="font-bold text-emerald-300">🦘 Moon-Gravity Jump</div>
                  <p className="text-[11px] text-slate-400">
                    +35% Jump height for leaping onto 2nd-floor balconies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTogglePerkJump}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600/40 hover:bg-emerald-500/60 border border-emerald-400/50 font-bold text-white cursor-pointer"
                >
                  {perkJump ? '✅ Equipped (Click to Disable)' : 'Equip Moon Jump'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col justify-between gap-2">
                <div>
                  <div className="font-bold text-pink-300">🌈 Rainbow Particle Trail</div>
                  <p className="text-[11px] text-slate-400">
                    Emit glowing rainbow sparkles as you run, drive, or glide.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTogglePerkTrail}
                  className="py-1.5 px-3 rounded-lg bg-pink-600/40 hover:bg-pink-500/60 border border-pink-400/50 font-bold text-white cursor-pointer"
                >
                  {perkTrail ? '✅ Active (Click to Disable)' : 'Activate Rainbow Trail'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex flex-col justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-300">🐉 Cycle 3D Pet Companion</div>
                  <p className="text-[11px] text-slate-400">
                    Current Pet: <strong className="uppercase text-white">{petType}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCyclePet}
                  className="py-1.5 px-3 rounded-lg bg-amber-600/40 hover:bg-amber-500/60 border border-amber-400/50 font-bold text-white cursor-pointer"
                >
                  Switch 3D Pet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
