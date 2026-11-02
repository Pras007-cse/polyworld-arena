import React, { useEffect, useRef, useState } from 'react';
import { WorldScene, LeaderboardEntry } from '../scenes/WorldScene';
import { AnimationState, CharacterAppearance } from '@shared/types';
import { ChatBroadcastPayload } from '@shared/protocols/messages';
import { HUD } from './HUD';
import { NetworkManager, ConnectionStatus } from '../networking/NetworkManager';
import { soundManager } from '../systems/SoundManager';

interface CanvasViewProps {
  username: string;
  appearance: CharacterAppearance;
  onLeaveWorld: () => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  username,
  appearance,
  onLeaveWorld,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
      text: 'Welcome to PolyWorld Arena! Collect Aether Shards, claim the Golden Crown, or toggle 2P Split-Screen!',
      timestamp: Date.now(),
    },
  ]);
  const [splitScreen, setSplitScreen] = useState<boolean>(false);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [muted, setMuted] = useState<boolean>(false);

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
      }
    );
    worldSceneRef.current = scene;

    scene.onCollectCrystal = (item, newScore, newLevel) => {
      net.sendCollectItem(item, username, newScore, newLevel);
    };

    scene.onCrownClaimed = (_holderId, holderName, pos) => {
      net.sendClaimCrown(holderName, pos, scene.player.score, scene.player.level);
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
      }
    }, 150);

    return () => {
      clearInterval(interval);
      scene.destroy();
      net.disconnect();
      worldSceneRef.current = null;
      networkManagerRef.current = null;
    };
  }, [username, appearance]);

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
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30 pointer-events-none" />
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
      />
    </div>
  );
};
