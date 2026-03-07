import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { StatsProvider } from './context/StatsContext';
import { Header } from './components/Header/Header';
import { FeedPage } from './pages/FeedPage/FeedPage';
import { QuienesSomosPage } from './pages/QuienesSomos/QuienesSomosPage';
import { ContactoPage } from './pages/Contacto/ContactoPage';
import { CrearPropiedadPage } from './pages/CrearPropiedad/CrearPropiedadPage';

export default function App() {
  return (
    <ThemeProvider>
      <StatsProvider>
        <Header />
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/quienes-somos" element={<QuienesSomosPage />} />
          <Route path="/contacto" element={<ContactoPage />} />
          <Route path="/crear" element={<CrearPropiedadPage />} />
        </Routes>
      </StatsProvider>
    </ThemeProvider>
  );
}
