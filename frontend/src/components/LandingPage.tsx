import React, { useState } from 'react';
import { AccessoryType, CharacterAppearance } from '@shared/types';
import { Sparkles, Users, Compass, Crown, Play, Gamepad2 } from 'lucide-react';

interface LandingPageProps {
  onEnterWorld: (username: string, appearance: CharacterAppearance) => void;
}

const PRESET_SHIRT_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const PRESET_SKIN_TONES = [
  '#ffdbac',
  '#f1c27d',
  '#e0ac69',
  '#c68642',
  '#8d5524',
];

const ACCESSORIES: { id: AccessoryType; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'crown', label: '👑 Crown' },
  { id: 'wizard', label: '🧙 Wizard' },
  { id: 'visor', label: '🥽 Visor' },
  { id: 'cap', label: '🧢 Cap' },
  { id: 'halo', label: '😇 Halo' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterWorld }) => {
  const [username, setUsername] = useState<string>(() => `Explorer_${Math.floor(100 + Math.random() * 900)}`);
  const [shirtColor, setShirtColor] = useState<string>('#3b82f6');
  const [skinColor, setSkinColor] = useState<string>('#ffdbac');
  const [pantsColor, setPantsColor] = useState<string>('#1e293b');
  const [avatarType, setAvatarType] = useState<'casual' | 'athletic' | 'formal'>('athletic');
  const [accessory, setAccessory] = useState<AccessoryType>('visor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    onEnterWorld(username.trim(), {
      color: skinColor,
      shirtColor,
      pantsColor,
      avatarType,
      accessory,
    });
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 my-auto">
        <div className="md:col-span-6 flex flex-col justify-between p-6 sm:p-8 rounded-2xl glass-panel">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Compass className="w-6 h-6" />
              </span>
              <span className="text-xs uppercase tracking-widest font-bold text-blue-400">
                3D Multiplayer Arena & Sandbox
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent mb-3">
              PolyWorld Arena
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed mb-5">
              Jump into a real-time 3D multiplayer world. Collect Aether Shards, compete for the Golden Crown, launch off Jump Pads, chat with 3D speech bubbles, or toggle 2-Player Split-Screen Co-op/PvP!
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Users className="w-4 h-4" />
                </span>
                <span><strong>Multi-Transport Sync:</strong> Socket.IO + Instant Cross-Tab P2P</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Crown className="w-4 h-4" />
                </span>
                <span><strong>Game Modes:</strong> Crystal Rush, Crown Tag Arena & Parkour</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Gamepad2 className="w-4 h-4" />
                </span>
                <span><strong>2P Split-Screen:</strong> Play 2 players on 1 screen or across tabs</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span><strong>3D Animations:</strong> Walk, Sprint, Dash, Jump, Wave, Dance & Sit</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Quick Controls</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2"><span className="kbd-badge">WASD</span><span>Move (P1)</span></div>
              <div className="flex items-center gap-2"><span className="kbd-badge">Space</span><span>Jump</span></div>
              <div className="flex items-center gap-2"><span className="kbd-badge">Shift / F</span><span>Sprint / Dash</span></div>
              <div className="flex items-center gap-2"><span className="kbd-badge">1 - 4</span><span>3D Emotes</span></div>
            </div>
          </div>
        </div>

        <div className="md:col-span-6 p-6 sm:p-8 rounded-2xl glass-panel flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Customize 3D Avatar</h2>
              <p className="text-xs text-slate-400">Personalize your character before entering the realm.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                Player Handle
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={18}
                required
                placeholder="Enter handle..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Outfit Color & Skin Tone
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {PRESET_SHIRT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setShirtColor(c)}
                    className={`w-6 h-6 rounded-lg transition-transform ${
                      shirtColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_SKIN_TONES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSkinColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      skinColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                3D Headwear Accessory
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccessory(acc.id)}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition ${
                      accessory === acc.id
                        ? 'bg-indigo-600/40 border-indigo-400 text-white'
                        : 'bg-slate-900/50 border-slate-700/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Class Preset
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['casual', 'athletic', 'formal'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setAvatarType(style);
                      if (style === 'casual') setPantsColor('#1e293b');
                      if (style === 'athletic') setPantsColor('#334155');
                      if (style === 'formal') setPantsColor('#0f172a');
                    }}
                    className={`py-1.5 px-3 rounded-lg border text-center font-medium capitalize transition ${
                      avatarType === style
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                        : 'bg-slate-900/50 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl glass-button font-bold text-sm sm:text-base flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Enter 3D World</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
