import { useTranslation } from 'react-i18next';

export const usePanguiVoice = () => {
  const { i18n } = useTranslation();

  const speak = (text: string) => {
    // Cancela cualquier voz previa para evitar superposición
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuración según el idioma activo
    switch (i18n.language) {
      case 'en': utterance.lang = 'en-US'; break;
      case 'es': utterance.lang = 'es-CL'; break;
      case 'map': utterance.lang = 'es-ES'; utterance.pitch = 0.7; break; 
      default: utterance.lang = 'es-CL';
    }

    window.speechSynthesis.speak(utterance);
  };

  return { speak };
};