import React, { useState, useEffect } from 'react';
import '../styles/global.css';

const StoryPlayer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);

  const storyPages = [
    {
      image: "/assets/img/cuento/1.png",
      text: "En lo alto del volcán Llaima, entre nubes de ceniza plateada y chispas de fuego mágico, nació Pangui. Ella es una pequeña puma de pelaje color arena y ojos brillantes como la miel."
    },
    {
      image: "/assets/img/cuento/2.png",
      text: "Pangui aprendió Mapudungun para poder conversar con la naturaleza. Cuando ella susurró 'Pehuén', el gran árbol milenario inclinó sus ramas."
    },
    {
      image: "/assets/img/cuento/3.png",
      text: "Pangui bajó trotando hacia los valles verdes. Allí aprendió Español para conocer a los humanos. '¡Hola!', le dijo con una gran sonrisa a su nuevo amigo Mateo."
    },
    {
      image: "/assets/img/cuento/4.png",
      text: "Juntos pasaron la tarde corriendo y descubriendo que las palabras son como puentes que unen los corazones."
    },
    {
      image: "/assets/img/cuento/5.png",
      text: "Después de su largo viaje, Pangui ha regresado a su cabaña. Ella te mira fijamente y te extiende su patita: 'Tengo una misión especial y necesito tu ayuda. ¿Entramos?'"
    }
  ];

  // Reproducir audio automáticamente al cambiar de página
  useEffect(() => {
    const audioPath = `/assets/audio/pangui_audio_0${currentPage + 1}.mp3`;
    const audio = new Audio(audioPath);
    audio.play().catch(err => console.log("Audio no cargado:", err));
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentPage]);

  const changePage = (increment: number) => {
    const next = currentPage + increment;
    if (next >= 0 && next < storyPages.length) {
      setCurrentPage(next);
    }
  };

  return (
    <div className="story-container">
      <div className="story-card">
        <div className="story-split-view">
          <div className="story-image-pane">
            <img src={storyPages[currentPage].image} alt="Escena del cuento" className="story-img" />
          </div>
          <div className="story-text-pane">
            <p className="story-text-content">{storyPages[currentPage].text}</p>
          </div>
        </div>

        <div className="story-footer-nav">
          <div className="nav-buttons-group">
            <button 
              className="nav-btn-story" 
              onClick={() => changePage(-1)} 
              disabled={currentPage === 0}
            >
              ← Atrás
            </button>
            <span className="page-num">{currentPage + 1} / 5</span>
            <button 
              className="nav-btn-story orange-btn" 
              onClick={() => changePage(1)}
              disabled={currentPage === 4}
            >
              {currentPage === 4 ? "¡Misión! 🐾" : "Siguiente →"}
            </button>
          </div>
          
          {/* El Avatar de Pangui que faltaba */}
          <div className="pangui-navigator-avatar">
            <img src="/assets/img/pangui/Pangui_imagen01.png" alt="Pangui" className="mini-avatar-img" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryPlayer;