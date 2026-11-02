import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { CanvasView } from './components/CanvasView';
import { CharacterAppearance } from '@shared/types';

export function App() {
  const [inWorld, setInWorld] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('Explorer');
  const [appearance, setAppearance] = useState<CharacterAppearance>({
    color: '#ffdbac',
    shirtColor: '#3b82f6',
    pantsColor: '#1e293b',
    avatarType: 'casual',
  });

  const handleEnterWorld = (chosenUsername: string, chosenAppearance: CharacterAppearance) => {
    setUsername(chosenUsername);
    setAppearance(chosenAppearance);
    setInWorld(true);
  };

  const handleLeaveWorld = () => {
    setInWorld(false);
  };

  return inWorld ? (
    <CanvasView
      username={username}
      appearance={appearance}
      onLeaveWorld={handleLeaveWorld}
    />
  ) : (
    <LandingPage onEnterWorld={handleEnterWorld} />
  );
}

export default App;
