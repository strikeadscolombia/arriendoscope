import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StatsProvider } from './context/StatsContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { Header } from './components/Header/Header';
import { SEO } from './components/SEO/SEO';
import { SplashPage } from './pages/SplashPage/SplashPage';
import { FeedPage } from './pages/FeedPage/FeedPage';
import { CityPage } from './pages/CityPage/CityPage';
import { QuienesSomosPage } from './pages/QuienesSomos/QuienesSomosPage';
import { ContactoPage } from './pages/Contacto/ContactoPage';
import { CrearPropiedadPage } from './pages/CrearPropiedad/CrearPropiedadPage';
import { FavoritosPage } from './pages/Favoritos/FavoritosPage';
import { warmupNotificationSound } from './utils/notificationSound';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    return !localStorage.getItem('arriendoscope_intro_seen');
  });

  const handleEnter = () => {
    localStorage.setItem('arriendoscope_intro_seen', '1');
    setShowSplash(false);
  };

  // Warm up notification AudioContext on first user gesture
  // This ensures WebSocket-triggered sounds can play later
  useEffect(() => {
    function onFirstGesture() {
      warmupNotificationSound();
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('touchstart', onFirstGesture);
    }

    document.addEventListener('click', onFirstGesture, { once: true });
    document.addEventListener('touchstart', onFirstGesture, { once: true });

    return () => {
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('touchstart', onFirstGesture);
    };
  }, []);

  // Splash — always black, outside ThemeProvider
  if (showSplash) {
    return <SplashPage onEnter={handleEnter} />;
  }

  return (
    <ThemeProvider>
      <StatsProvider>
        <FavoritesProvider>
          <Header />
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/arriendos/:city" element={<CityPage />} />
            <Route
              path="/quienes-somos"
              element={
                <>
                  <SEO
                    title="Quiénes Somos — Arriendoscope"
                    description="Arriendoscope es el radar de arriendos en tiempo real. Escaneamos Metrocuadrado, Ciencuadras, FincaRaiz y más cada 5 minutos para que encuentres tu arriendo antes que nadie."
                    url="https://arriendoscope.com/quienes-somos"
                  />
                  <QuienesSomosPage />
                </>
              }
            />
            <Route
              path="/contacto"
              element={
                <>
                  <SEO
                    title="Contacto — Arriendoscope"
                    description="Contáctanos para preguntas, sugerencias o alianzas comerciales. Arriendoscope — radar de arriendos en Colombia, Miami y Dubai."
                    url="https://arriendoscope.com/contacto"
                  />
                  <ContactoPage />
                </>
              }
            />
            <Route
              path="/crear"
              element={
                <>
                  <SEO
                    title="Publicar Propiedad Gratis — Arriendoscope"
                    description="Publica tu propiedad en arriendo gratis en Arriendoscope. Sin registro, sin comisiones. Tu arriendo aparece en el feed en tiempo real."
                    url="https://arriendoscope.com/crear"
                  />
                  <CrearPropiedadPage />
                </>
              }
            />
            <Route path="/favoritos" element={<FavoritosPage />} />
          </Routes>
        </FavoritesProvider>
      </StatsProvider>
    </ThemeProvider>
  );
}
