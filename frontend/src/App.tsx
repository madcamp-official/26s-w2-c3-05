import { useState } from 'react';
import type { Room, Scores } from './types/game';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import WaitingPage from './pages/WaitingPage';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

type Stage =
  | { screen: 'login' }
  | { screen: 'lobby' }
  | { screen: 'waiting'; room: Room }
  | { screen: 'game'; room: Room }
  | { screen: 'result'; room: Room; scores: Scores };

export default function App() {
  const [nick, setNick] = useState('');
  const [stage, setStage] = useState<Stage>({ screen: 'login' });

  switch (stage.screen) {
    case 'login':
      return (
        <LoginPage
          onEnter={(name) => {
            setNick(name);
            setStage({ screen: 'lobby' });
          }}
        />
      );
    case 'lobby':
      return (
        <LobbyPage
          nick={nick}
          onRetreat={() => setStage({ screen: 'login' })}
          onJoin={(room) => setStage({ screen: 'waiting', room })} 
        />
      );
    case 'waiting':
      return (
        <WaitingPage
          nick={nick}
          room={stage.room}
          onLeave={() => setStage({ screen: 'lobby' })}
          onStart={() => setStage({ screen: 'game', room: stage.room })}
        />
      );
    case 'game':
      return (
        <GamePage
          nick={nick}
          onFinish={(scores) => setStage({ screen: 'result', room: stage.room, scores })}
        />
      );
    case 'result':
      return (
        <ResultPage
          nick={nick}
          scores={stage.scores}
          onLobby={() => setStage({ screen: 'lobby' })}
          onAgain={() => setStage({ screen: 'waiting', room: stage.room })}
        />
      );
  }
}
