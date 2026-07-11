import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode는 개발 중 interval/effect가 두 번 실행되어
// 게임 루프(봇 채팅·타이머)가 중복될 수 있어 의도적으로 빼두었습니다.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
