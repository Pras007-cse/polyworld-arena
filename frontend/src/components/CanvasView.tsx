import React, { useEffect, useRef, useState } from 'react';
import { WorldScene, LeaderboardEntry, QuestState } from '../scenes/WorldScene';
import {
  AnimationState,
  CameraControlMode,
  CameraViewMode,
  CharacterAppearance,
  PetType,
  WeatherMode,
} from '@shared/types';
import { ChatBroadcastPayload } from '@shared/protocols/messages';
import { HUD } from './HUD';
import { NetworkManager, ConnectionStatus } from '../networking/NetworkManager';
import { soundManager } from '../systems/SoundManager';

interface CanvasViewProps {
  username: string;
  appearance: CharacterAppearance;
  initialSplitScreen?: boolean;
  onLeaveWorld: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  username,
  appearance,
  initialSplitScreen = false,
  onLeaveWorld,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const worldSceneRef = useRef<WorldScene | null>(null);
  const networkManagerRef = useRef<NetworkManager | null>(null);

  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 10 });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [pingMs, setPingMs] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatBroadcastPayload[]>([
    {
      id: 'sys_1',
      senderId: 'system',
      senderName: 'System',
      text: 'Welcome to PolyWorld Arena! Open multiple tabs or toggle 2P Split-Screen to play together immediately!',
      timestamp: Date.now(),
    },
  ]);
  const [splitScreen, setSplitScreen] = useState<boolean>(initialSplitScreen);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>(
    appearance.cameraControlMode || 'drag'
  );
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('third_person');
  const [weatherMode, setWeatherMode] = useState<WeatherMode>('clear');
  const [petType, setPetType] = useState<PetType>(appearance.petType || 'dragon');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<QuestState>({
    id: 'q_shards',
    title: 'Mayor Aria: Collect 3 Aether Shards',
    goal: 3,
    progress: 0,
  });
  const [raceStatus, setRaceStatus] = useState<{ active: boolean; text: string }>({
    active: false,
    text: '',
  });
  const [mountedKind, setMountedKind] = useState<string | null>(null);
  const [nextBusStop, setNextBusStop] = useState<string>('East Lake & Canal Bridge Station');
  const [shopOpen, setShopOpen] = useState<boolean>(false);
  const [perkSpeed, setPerkSpeed] = useState<boolean>(false);
  const [perkJump, setPerkJump] = useState<boolean>(false);
  const [perkTrail, setPerkTrail] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const saveProfile = (scene: WorldScene) => {
    try {
      const payload = {
        username,
        score: scene.player.score,
        level: scene.player.level,
        appearance,
        cameraControlMode: scene.inputManager.cameraControlMode,
        petType: scene.currentPetType,
        perkSpeedBoots: scene.player.perkSpeedBoots,
        perkMoonJump: scene.player.perkMoonJump,
        perkRainbowTrail: scene.player.perkRainbowTrail,
      };
      window.localStorage.setItem('polyworld_save_v1', JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const net = new NetworkManager();
    networkManagerRef.current = net;

    const scene = new WorldScene(
      containerRef.current,
      net.localPlayerId,
      username,
      appearance,
      (pos, rot, anim) => {
        net.sendMove({ x: pos.x, y: pos.y, z: pos.z }, rot, anim);
      },
      (msg) => {
        triggerToast(msg);
        setCameraControlMode(scene.inputManager.cameraControlMode);
        setCameraViewMode(scene.cameraViewMode);
      }
    );
    worldSceneRef.current = scene;

    // Restore persisted score/perks if present
    try {
      const raw = window.localStorage.getItem('polyworld_save_v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.score === 'number') scene.player.score = saved.score;
        if (typeof saved.level === 'number') scene.player.level = saved.level;
        scene.player.perkSpeedBoots = !!saved.perkSpeedBoots;
        scene.player.perkMoonJump = !!saved.perkMoonJump;
        scene.player.perkRainbowTrail = !!saved.perkRainbowTrail;
        setPerkSpeed(!!saved.perkSpeedBoots);
        setPerkJump(!!saved.perkMoonJump);
        setPerkTrail(!!saved.perkRainbowTrail);
        scene.player.updateNameplate();
      }
    } catch {
      // Ignore
    }

    if (initialSplitScreen) {
      scene.setSplitScreen(true);
    }

    scene.onCollectCrystal = (item, newScore, newLevel) => {
      net.sendCollectItem(item, username, newScore, newLevel);
      saveProfile(scene);
    };

    scene.onCrownClaimed = (_holderId, holderName, pos) => {
      net.sendClaimCrown(holderName, pos, scene.player.score, scene.player.level);
      saveProfile(scene);
    };

    net.setCallbacks({
      onStatusChange: (status) => setConnectionStatus(status),
      onPingUpdate: (ping) => setPingMs(ping),
      onWelcome: (data) => {
        scene.player.id = data.playerId;
        if (data.existingPlayers) {
          data.existingPlayers.forEach((p) => scene.upsertRemotePlayer(p));
        }
        if (data.collectibles) {
          scene.syncServerCollectibles(data.collectibles);
        }
        if (data.crownPosition) {
          scene.applyCrownState(data.crownHolderId, data.crownPosition);
        }
      },
      onPlayerJoined: (newPlayer) => {
        scene.upsertRemotePlayer(newPlayer);
      },
      onPlayerLeft: (playerId) => {
        scene.removeRemotePlayer(playerId);
      },
      onPlayerMoved: (data) => {
        scene.moveRemotePlayer(data.playerId, data.position, data.rotation, data.animation);
      },
      onPlayerAnimated: (data) => {
        scene.animateRemotePlayer(data.playerId, data.animation);
      },
      onChatBroadcast: (msg) => {
        soundManager.playChat();
        setChatMessages((prev) => [...prev.slice(-24), msg]);
        scene.showPlayerChat(msg.senderId, msg.text);
      },
      onItemCollected: (data) => {
        scene.handleNetworkItemCollected(data.itemId, data.playerId, data.newScore, data.newLevel);
      },
      onItemRespawned: (data) => {
        scene.handleNetworkItemRespawned(data.item);
      },
      onCrownChanged: (data) => {
        scene.applyCrownState(data.crownHolderId, data.crownPosition, data.scores);
      },
    });

    net.connect().then(() => {
      net.joinWorld(username, appearance).then((res) => {
        if (res.existingPlayers) {
          res.existingPlayers.forEach((p) => scene.upsertRemotePlayer(p));
        }
        if (res.collectibles) {
          scene.syncServerCollectibles(res.collectibles);
        }
      });
    });

    const interval = window.setInterval(() => {
      if (scene && scene.player) {
        setCoords({
          x: scene.player.position.x,
          y: scene.player.position.y,
          z: scene.player.position.z,
        });
        setLeaderboard(scene.getLeaderboard());
        setMountedKind(scene.player.mountedInfo ? scene.player.mountedInfo.kind : null);
        if (scene.townBus) {
          setNextBusStop(scene.townBus.waypoints[scene.townBus.wpIndex]?.name || 'Town Ring Boulevard');
        }
        const q = scene.questsList[scene.currentQuestIdx];
        if (q) {
          setActiveQuest({ ...q });
        }
        if (scene.raceActive) {
          setRaceStatus({
            active: true,
            text: `🏁 Race: ${scene.raceElapsedSec}s (CP ${scene.raceIndex + 1}/8)`,
          });
        } else {
          setRaceStatus({ active: false, text: '' });
        }
        scene.drawMinimap(minimapRef.current);
      }
    }, 150);

    return () => {
      clearInterval(interval);
      saveProfile(scene);
      scene.destroy();
      net.disconnect();
      worldSceneRef.current = null;
      networkManagerRef.current = null;
    };
  }, [username, appearance, initialSplitScreen]);

  const handleSendChat = (text: string) => {
    networkManagerRef.current?.sendChatMessage(text, username);
  };

  const handleTriggerEmote = (emote: AnimationState) => {
    soundManager.playEmote();
    worldSceneRef.current?.inputManager.triggerEmote(emote);
    networkManagerRef.current?.sendAnimation(emote);
  };

  const handleToggleSplitScreen = () => {
    const next = !splitScreen;
    setSplitScreen(next);
    worldSceneRef.current?.setSplitScreen(next);
  };

  const handleToggleBots = () => {
    const next = !botsEnabled;
    setBotsEnabled(next);
    worldSceneRef.current?.setBotsEnabled(next);
  };

  const handleCycleTime = () => {
    const order: ('day' | 'sunset' | 'night')[] = ['day', 'sunset', 'night'];
    const next = order[(order.indexOf(timeOfDay) + 1) % order.length];
    setTimeOfDay(next);
    worldSceneRef.current?.setTimeOfDay(next);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundManager.muted = next;
  };

  const handleDash = () => {
    if (worldSceneRef.current) {
      worldSceneRef.current.inputManager.state.dash = true;
      setTimeout(() => {
        if (worldSceneRef.current) worldSceneRef.current.inputManager.state.dash = false;
      }, 150);
    }
  };

  const handleJump = () => {
    if (worldSceneRef.current) {
      worldSceneRef.current.inputManager.state.jump = true;
      setTimeout(() => {
        if (worldSceneRef.current) worldSceneRef.current.inputManager.state.jump = false;
      }, 180);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full min-h-screen cursor-grab active:cursor-grabbing"
      />

      {splitScreen && (
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-pink-500/80 via-white/60 to-cyan-400/80 pointer-events-none z-10" />
      )}

      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-2 rounded-full glass-panel border border-amber-400/40 text-xs sm:text-sm font-semibold text-amber-200 shadow-lg">
          {toastMessage}
        </div>
      )}

      <HUD
        username={username}
        appearance={appearance}
        onLeaveWorld={onLeaveWorld}
        playerCoords={coords}
        connectionStatus={connectionStatus}
        pingMs={pingMs}
        leaderboard={leaderboard}
        chatMessages={chatMessages}
        onSendChat={handleSendChat}
        onTriggerEmote={handleTriggerEmote}
        splitScreen={splitScreen}
        onToggleSplitScreen={handleToggleSplitScreen}
        botsEnabled={botsEnabled}
        onToggleBots={handleToggleBots}
        timeOfDay={timeOfDay}
        onCycleTime={handleCycleTime}
        muted={muted}
        onToggleMute={handleToggleMute}
        onDash={handleDash}
        onJump={handleJump}
        minimapRef={minimapRef}
        cameraControlMode={cameraControlMode}
        onToggleCameraMode={() => {
          if (worldSceneRef.current) {
            const next = worldSceneRef.current.toggleCameraControlMode();
            setCameraControlMode(next);
            saveProfile(worldSceneRef.current);
          }
        }}
        cameraViewMode={cameraViewMode}
        onCycleCameraView={() => {
          if (worldSceneRef.current) {
            setCameraViewMode(worldSceneRef.current.cycleCameraViewMode());
          }
        }}
        weatherMode={weatherMode}
        onCycleWeather={() => {
          if (worldSceneRef.current) {
            setWeatherMode(worldSceneRef.current.cycleWeather());
          }
        }}
        onBoardBus={() => worldSceneRef.current?.boardTownBus()}
        onBoardSkyTrain={() => worldSceneRef.current?.boardSkyTrain()}
        onDriveCar={() => worldSceneRef.current?.summonAndDriveCar()}
        onFlyPlane={() => worldSceneRef.current?.boardPlane()}
        onFlyHeli={() => worldSceneRef.current?.boardHeli()}
        onDriveBoat={() => worldSceneRef.current?.boardBoat()}
        onFastTravel={(tx, tz, label) => worldSceneRef.current?.fastTravelTo(tx, tz, label)}
        onInteract={() => worldSceneRef.current?.interactNearest()}
        onGrapple={() => worldSceneRef.current?.fireGrapplingHook()}
        onBlaster={() => worldSceneRef.current?.firePaintballBlaster()}
        onToggleJetpack={() => worldSceneRef.current?.toggleJetpack()}
        onToggleHoverboard={() => worldSceneRef.current?.toggleHoverboard()}
        onBuildRamp={() => worldSceneRef.current?.spawnCustomBuilderBlock()}
        onMeteorEvent={() => worldSceneRef.current?.triggerMeteorShower()}
        onToggleRace={() => worldSceneRef.current?.toggleTimeTrialRace()}
        activeQuest={activeQuest}
        onNextQuest={() => worldSceneRef.current?.nextQuest()}
        raceStatus={raceStatus}
        mountedKind={mountedKind}
        nextBusStop={nextBusStop}
        shopOpen={shopOpen}
        onSetShopOpen={setShopOpen}
        perkSpeed={perkSpeed}
        onTogglePerkSpeed={() => {
          if (worldSceneRef.current) {
            const next = !worldSceneRef.current.player.perkSpeedBoots;
            worldSceneRef.current.player.perkSpeedBoots = next;
            setPerkSpeed(next);
            soundManager.playCrown();
            triggerToast(next ? '⚡ Hyper-Speed Boots Equipped (+32% Speed)!' : '⚡ Speed Boots Unequipped');
            saveProfile(worldSceneRef.current);
          }
        }}
        perkJump={perkJump}
        onTogglePerkJump={() => {
          if (worldSceneRef.current) {
            const next = !worldSceneRef.current.player.perkMoonJump;
            worldSceneRef.current.player.perkMoonJump = next;
            setPerkJump(next);
            soundManager.playCrown();
            triggerToast(next ? '🦘 Moon-Gravity Jump Equipped (+35% Jump)!' : '🦘 Moon Jump Unequipped');
            saveProfile(worldSceneRef.current);
          }
        }}
        perkTrail={perkTrail}
        onTogglePerkTrail={() => {
          if (worldSceneRef.current) {
            const next = !worldSceneRef.current.player.perkRainbowTrail;
            worldSceneRef.current.player.perkRainbowTrail = next;
            setPerkTrail(next);
            soundManager.playCrown();
            triggerToast(next ? '🌈 Rainbow Particle Trail Activated!' : '🌈 Rainbow Trail Disabled');
            saveProfile(worldSceneRef.current);
          }
        }}
        petType={petType}
        onCyclePet={() => {
          if (worldSceneRef.current) {
            const order: PetType[] = ['dragon', 'drone', 'pup', 'none'];
            const next = order[(order.indexOf(petType) + 1) % order.length];
            setPetType(next);
            worldSceneRef.current.rebuildPetMesh(next);
            soundManager.playEmote();
            triggerToast(`🐉 Switched 3D Pet Companion to: ${next.toUpperCase()}`);
            saveProfile(worldSceneRef.current);
          }
        }}
      />
    </div>
  );
};
