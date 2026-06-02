import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '@/stores/useStore';
import RecognizerPanel from '@/components/RecognizerPanel/RecognizerPanel';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [showRecognizer, setShowRecognizer] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="header-logo">✍ Handwrite2KaTeX</Link>
        <span className="header-spacer" />

        <button className="btn-icon" onClick={toggleTheme} title="테마 전환">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {isAuthenticated && (
          <button
            className="btn-icon"
            onClick={() => setShowRecognizer((v) => !v)}
            title="OCR 인식기 선택"
          >
            ⚙️
          </button>
        )}

        {isAuthenticated ? (
          <>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {user?.email}
            </span>
            <button className="btn" onClick={handleLogout}>로그아웃</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn">로그인</Link>
            <Link to="/register" className="btn btn-primary">회원가입</Link>
          </>
        )}
      </header>

      <RecognizerPanel
        open={showRecognizer}
        onClose={() => setShowRecognizer(false)}
      />
    </>
  );
}
