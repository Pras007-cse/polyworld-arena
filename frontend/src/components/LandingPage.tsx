import React, { useState } from 'react';
import { AccessoryType, CameraControlMode, CharacterAppearance, PetType } from '@shared/types';
import { Sparkles, Users, Compass, Crown, Play, Gamepad2, Shuffle } from 'lucide-react';

interface LandingPageProps {
  initialUsername?: string;
  initialAppearance?: CharacterAppearance;
  onEnterWorld: (username: string, appearance: CharacterAppearance, gameMode?: string) => void;
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
  { id: 'visor', label: '🥽 Cyber Visor' },
  { id: 'crown', label: '👑 Royal Crown' },
  { id: 'wizard', label: '🧙 Wizard Hat' },
  { id: 'halo', label: '😇 Aether Halo' },
  { id: 'cap', label: '🧢 Explorer Cap' },
  { id: 'none', label: '✨ Classic Hair' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  initialUsername,
  initialAppearance,
  onEnterWorld,
}) => {
  const [username, setUsername] = useState<string>(
    initialUsername || `Explorer_${Math.floor(100 + Math.random() * 899)}`
  );
  const [shirtColor, setShirtColor] = useState<string>(initialAppearance?.shirtColor || '#3b82f6');
  const [skinColor, setSkinColor] = useState<string>(initialAppearance?.color || '#ffdbac');
  const [pantsColor, setPantsColor] = useState<string>(initialAppearance?.pantsColor || '#334155');
  const [avatarType, setAvatarType] = useState<'casual' | 'athletic' | 'formal'>(
    initialAppearance?.avatarType || 'athletic'
  );
  const [accessory, setAccessory] = useState<AccessoryType>(initialAppearance?.accessory || 'visor');
  const [petType, setPetType] = useState<PetType>(initialAppearance?.petType || 'dragon');
  const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>(
    initialAppearance?.cameraControlMode || 'drag'
  );
  const [gameMode, setGameMode] = useState<string>('all');

  const handleRandomize = () => {
    setShirtColor(PRESET_SHIRT_COLORS[Math.floor(Math.random() * PRESET_SHIRT_COLORS.length)]);
    setSkinColor(PRESET_SKIN_TONES[Math.floor(Math.random() * PRESET_SKIN_TONES.length)]);
    const accs: AccessoryType[] = ['visor', 'crown', 'wizard', 'halo', 'cap', 'none'];
    setAccessory(accs[Math.floor(Math.random() * accs.length)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    onEnterWorld(
      username.trim(),
      {
        color: skinColor,
        shirtColor,
        pantsColor,
        avatarType,
        accessory,
        petType,
        cameraControlMode,
      },
      gameMode
    );
  };

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 my-auto">
        <div className="md:col-span-6 flex flex-col justify-between p-6 sm:p-8 rounded-2xl glass-panel">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Compass className="w-5 h-5" />
                </span>
                <span className="text-xs uppercase tracking-widest font-bold text-blue-400">
                  Open-World 3D Multiplayer
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">v2.5 Full-Stack</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent mb-3">
              PolyWorld Arena
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
              Explore a dense <strong>1400m × 1400m</strong> 3D world with friends. Drive stunt cars, fly biplanes and rescue helicopters, pilot speedboats, board the 8-seat Town Tour Bus or Elevated Sky-Train, run inside 40+ multi-floor buildings, and jump right out of 3D windows!
            </p>

            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Users className="w-4 h-4" />
                </span>
                <span>
                  <strong>4-Way Multiplayer:</strong> Socket.IO + Multi-Tab P2P + 2P Split-Screen + AI
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Crown className="w-4 h-4" />
                </span>
                <span>
                  <strong>Vehicles &amp; Transit:</strong> Cars, Planes, Helicopter, Boats, Tour Bus &amp; Sky-Train
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Gamepad2 className="w-4 h-4" />
                </span>
                <span>
                  <strong>Enterable Towers &amp; Mini-Games:</strong> Multi-floor stairs, jumpable windows, Soccer, Bowling, Basketball &amp; Piano
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span>
                  <strong>Gadgets &amp; Events:</strong> Grapple (Q), Glider, Blaster (G), Jetpack (J), Hoverboard (H), Builder (B), Weather &amp; Pets
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Controls Reference
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="kbd-badge">WASD</span>
                <span>Move / Steer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="kbd-badge">Space</span>
                <span>Jump / Glide</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="kbd-badge">E</span>
                <span>Enter Vehicle / Ride</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="kbd-badge">Q / G / J / H / B</span>
                <span>Gadgets &amp; Build</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-6 p-6 sm:p-8 rounded-2xl glass-panel flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Customize 3D Explorer</h2>
                <p className="text-xs text-slate-400">Personalize your character, camera &amp; pet.</p>
              </div>
              <button
                type="button"
                onClick={handleRandomize}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 transition cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Randomize</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Player Handle
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={18}
                  required
                  placeholder="Enter handle..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Starting Mode
                </label>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">🌟 All Modes (Sandbox + Arena)</option>
                  <option value="crystal_rush">💎 Crystal Rush (Score Attack)</option>
                  <option value="crown_tag">👑 Crown Tag Arena (PvP)</option>
                  <option value="split_coop">🎮 2-Player Split-Screen Mode</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Camera Mouse Control
                </label>
                <select
                  value={cameraControlMode}
                  onChange={(e) => setCameraControlMode(e.target.value as CameraControlMode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="drag">🖱️ Drag &amp; Move (Hold Click)</option>
                  <option value="mouse_move">🎯 Free Mouse Move (Auto Look)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  3D Pet Companion
                </label>
                <select
                  value={petType}
                  onChange={(e) => setPetType(e.target.value as PetType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dragon">🐉 Mini Aether Dragon</option>
                  <option value="drone">🛸 Cyber Halo Drone</option>
                  <option value="pup">🐶 Golden Explorer Pup</option>
                  <option value="none">✨ No Pet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Outfit Color &amp; Skin Tone
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
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                3D Headwear Accessory
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {ACCESSORIES.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccessory(acc.id)}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition cursor-pointer ${
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
              <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Class Preset
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['athletic', 'casual', 'formal'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setAvatarType(style);
                      if (style === 'casual') setPantsColor('#1e293b');
                      if (style === 'athletic') setPantsColor('#334155');
                      if (style === 'formal') setPantsColor('#0f172a');
                    }}
                    className={`py-1.5 px-3 rounded-lg border text-center font-medium capitalize transition cursor-pointer ${
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
              <span>Enter PolyWorld Arena</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
