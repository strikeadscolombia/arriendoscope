import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StatsProvider } from './context/StatsContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { Header } from './components/Header/Header';
import { FeedPage } from './pages/FeedPage/FeedPage';
import { QuienesSomosPage } from './pages/QuienesSomos/QuienesSomosPage';
import { ContactoPage } from './pages/Contacto/ContactoPage';
import { CrearPropiedadPage } from './pages/CrearPropiedad/CrearPropiedadPage';
import { FavoritosPage } from './pages/Favoritos/FavoritosPage';

export default function App() {
  return (
    <ThemeProvider>
      <StatsProvider>
        <FavoritesProvider>
          <Header />
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/quienes-somos" element={<QuienesSomosPage />} />
            <Route path="/contacto" element={<ContactoPage />} />
            <Route path="/crear" element={<CrearPropiedadPage />} />
            <Route path="/favoritos" element={<FavoritosPage />} />
          </Routes>
        </FavoritesProvider>
      </StatsProvider>
    </ThemeProvider>
  );
}
