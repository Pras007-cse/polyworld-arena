import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { CanvasView } from './components/CanvasView';
import { CharacterAppearance } from '@shared/types';

export function App() {
  const [inWorld, setInWorld] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(() => `Explorer_${Math.floor(100 + Math.random() * 899)}`);
  const [startSplitScreen, setStartSplitScreen] = useState<boolean>(false);
  const [appearance, setAppearance] = useState<CharacterAppearance>({
    color: '#ffdbac',
    shirtColor: '#3b82f6',
    pantsColor: '#334155',
    avatarType: 'athletic',
    accessory: 'visor',
    petType: 'dragon',
    cameraControlMode: 'drag',
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('polyworld_save_v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.username) setUsername(saved.username);
        if (saved.appearance) {
          setAppearance((prev) => ({
            ...prev,
            ...saved.appearance,
            petType: saved.petType || prev.petType,
            cameraControlMode: saved.cameraControlMode || prev.cameraControlMode,
          }));
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleEnterWorld = (
    chosenUsername: string,
    chosenAppearance: CharacterAppearance,
    chosenMode?: string
  ) => {
    setUsername(chosenUsername);
    setAppearance(chosenAppearance);
    setStartSplitScreen(chosenMode === 'split_coop');
    setInWorld(true);
  };

  const handleLeaveWorld = () => {
    setInWorld(false);
  };

  return inWorld ? (
    <CanvasView
      username={username}
      appearance={appearance}
      initialSplitScreen={startSplitScreen}
      onLeaveWorld={handleLeaveWorld}
    />
  ) : (
    <LandingPage
      initialUsername={username}
      initialAppearance={appearance}
      onEnterWorld={handleEnterWorld}
    />
  );
}

export default App;
