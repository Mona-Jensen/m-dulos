import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StoryPlayer from './components/StoryPlayer';
import './styles/global.css';

function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('video'); // 'video', 'home', 'story'

  if (view === 'video') {
    return (
      <div className="video-overlay">
        <video autoPlay muted onEnded={() => setView('home')} className="video-player-full">
          <source src="/assets/video/intro_historia.mp4" type="video/mp4" />
        </video>
        <button className="skip-video-btn" onClick={() => setView('home')}>Saltar Intro 🐾</button>
      </div>
    );
  }

  if (view === 'story') {
    return <StoryPlayer />;
  }

  return (
    <div className="home-page">
      <div className="lang-bar">
        <button onClick={() => i18n.changeLanguage('es')}>Español</button>
        <button onClick={() => i18n.changeLanguage('en')}>English</button>
        <button onClick={() => i18n.changeLanguage('map')}>Mapudungun</button>
      </div>

      <h1 className="main-title">{t('welcome_title') || "¡Bienvenidos al Mundo de Pangi!"}</h1>

      <div className="central-paw-button" onClick={() => new Audio('/assets/audio/greeting_es.mp3').play()}>
        <img src="/assets/img/pangui/huella.png" alt="Huella" />
      </div>

      <p className="instruction">{t('instruction_text') || "Presiona la huella de Pangi"}</p>

      <button className="start-btn-home" onClick={() => setView('story')}>
        {t('adventure_start') || "Empezar Aventura"}
      </button>
    </div>
  );
}

export default App;