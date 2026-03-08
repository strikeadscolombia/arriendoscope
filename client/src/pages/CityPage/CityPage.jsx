import { useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../../components/SEO/SEO';
import { useListings } from '../../hooks/useListings';
import { useStats } from '../../context/StatsContext';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { TimeRangeBar } from '../../components/TimeRangeBar/TimeRangeBar';
import { Feed } from '../../components/Feed/Feed';
import { NewListingToast } from '../../components/NewListingToast/NewListingToast';
import styles from './CityPage.module.css';

/* ─── City SEO data ──────────────────────────────────── */

const CITY_SEO = {
  bogota: {
    name: 'Bogotá',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Bogotá Hoy — Apartamentos y Casas en Tiempo Real | Arriendoscope',
    description: 'Arriendos frescos en Bogotá actualizados cada 5 minutos. Apartamentos y casas en arriendo desde $500.000. Metrocuadrado, Ciencuadras y FincaRaiz en un solo lugar. 100% gratis.',
    h1: 'ARRIENDOS EN BOGOTÁ',
    subtitle: 'Apartamentos y casas en arriendo en Bogotá, Chapinero, Usaquén, Suba, Kennedy y más barrios. Feed en tiempo real.',
    neighborhoods: ['Chapinero', 'Usaquén', 'Suba', 'Kennedy', 'Cedritos', 'Teusaquillo', 'Engativá', 'La Candelaria'],
  },
  medellin: {
    name: 'Medellín',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Medellín Hoy — Apartamentos en El Poblado, Laureles | Arriendoscope',
    description: 'Arriendos en Medellín actualizados cada 5 minutos. Poblado, Laureles, Envigado, Sabaneta y más. Metrocuadrado, Ciencuadras, FincaRaiz. Gratis.',
    h1: 'ARRIENDOS EN MEDELLÍN',
    subtitle: 'Arriendos frescos en Medellín. El Poblado, Laureles, Envigado, Sabaneta, Belén y toda el Área Metropolitana.',
    neighborhoods: ['El Poblado', 'Laureles', 'Envigado', 'Sabaneta', 'Belén', 'Estadio', 'Calasanz', 'Robledo'],
  },
  cali: {
    name: 'Cali',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Cali Hoy — Apartamentos y Casas en Arriendo | Arriendoscope',
    description: 'Arriendos en Cali en tiempo real. Apartamentos y casas desde hoy. Ciudad Jardín, Granada, San Fernando y más. 100% gratis.',
    h1: 'ARRIENDOS EN CALI',
    subtitle: 'Arriendos frescos en Cali. Ciudad Jardín, Granada, San Fernando, El Peñón, Tequendama y más.',
    neighborhoods: ['Ciudad Jardín', 'Granada', 'San Fernando', 'El Peñón', 'Tequendama', 'Valle del Lili', 'Chipichape'],
  },
  barranquilla: {
    name: 'Barranquilla',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Barranquilla Hoy — Apartamentos al Mejor Precio | Arriendoscope',
    description: 'Arriendos en Barranquilla al mejor precio. Apartamentos y casas en Riomar, Villa Country, Alto Prado y más. Actualizado cada 5 minutos.',
    h1: 'ARRIENDOS EN BARRANQUILLA',
    subtitle: 'Arriendos en Barranquilla en tiempo real. Riomar, Villa Country, Alto Prado, Buenavista y toda la ciudad.',
    neighborhoods: ['Riomar', 'Villa Country', 'Alto Prado', 'Buenavista', 'El Prado', 'Ciudad Jardín', 'Paraíso'],
  },
  bucaramanga: {
    name: 'Bucaramanga',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Bucaramanga Hoy — Propiedades Frescas | Arriendoscope',
    description: 'Arriendos en Bucaramanga. Propiedades frescas en Cabecera, Cañaveral, Lagos del Cacique y más. Actualizado cada 5 minutos. Gratis.',
    h1: 'ARRIENDOS EN BUCARAMANGA',
    subtitle: 'Arriendos en Bucaramanga en tiempo real. Cabecera, Cañaveral, Lagos del Cacique, Floridablanca y área metropolitana.',
    neighborhoods: ['Cabecera', 'Cañaveral', 'Lagos del Cacique', 'Floridablanca', 'San Alonso', 'Girón', 'Piedecuesta'],
  },
  cartagena: {
    name: 'Cartagena',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Cartagena Hoy — Apartamentos y Casas | Arriendoscope',
    description: 'Arriendos en Cartagena de Indias. Bocagrande, Castillogrande, Manga, Centro Histórico y más. En tiempo real.',
    h1: 'ARRIENDOS EN CARTAGENA',
    subtitle: 'Arriendos en Cartagena de Indias. Bocagrande, Castillogrande, Manga, Centro Histórico y toda la ciudad amurallada.',
    neighborhoods: ['Bocagrande', 'Castillogrande', 'Manga', 'Centro Histórico', 'Pie de la Popa', 'Crespo', 'Turbaco'],
  },
  pereira: {
    name: 'Pereira',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Pereira Hoy — Eje Cafetero en Tiempo Real | Arriendoscope',
    description: 'Arriendos en Pereira en tiempo real. Apartamentos y casas en el Eje Cafetero. Álamos, Pinares, Circunvalar y más. Gratis.',
    h1: 'ARRIENDOS EN PEREIRA',
    subtitle: 'Arriendos frescos en Pereira, eje cafetero. Álamos, Pinares, Circunvalar, Dosquebradas y alrededores.',
    neighborhoods: ['Álamos', 'Pinares', 'Circunvalar', 'Dosquebradas', 'Cuba', 'Centro', 'Cerritos'],
  },
  manizales: {
    name: 'Manizales',
    country: 'Colombia',
    currency: 'COP',
    lang: 'es',
    title: 'Arriendos en Manizales Hoy — Eje Cafetero | Arriendoscope',
    description: 'Arriendos en Manizales, eje cafetero. Apartamentos y casas en Palermo, Chipre, La Estrella y más. Actualizado cada 5 minutos.',
    h1: 'ARRIENDOS EN MANIZALES',
    subtitle: 'Arriendos en Manizales en tiempo real. Palermo, Chipre, La Estrella, Milán, Palogrande y más.',
    neighborhoods: ['Palermo', 'Chipre', 'La Estrella', 'Milán', 'Palogrande', 'Centro', 'La Enea'],
  },
  miami: {
    name: 'Miami',
    country: 'United States',
    currency: 'USD',
    lang: 'en',
    title: 'Apartments for Rent in Miami — Real-Time Listings | Arriendoscope',
    description: 'Real-time rent listings in Miami. Apartments from Brickell, Wynwood, Doral, Coral Gables and more. Updated every 5 minutes. Free.',
    h1: 'APARTMENTS FOR RENT IN MIAMI',
    subtitle: 'Real-time rental listings in Miami. Brickell, Wynwood, Doral, Coral Gables, Downtown and more neighborhoods.',
    neighborhoods: ['Brickell', 'Wynwood', 'Doral', 'Coral Gables', 'Downtown', 'Little Havana', 'Hialeah', 'Kendall'],
  },
  dubai: {
    name: 'Dubai',
    country: 'United Arab Emirates',
    currency: 'AED',
    lang: 'en',
    title: 'Rent in Dubai — Apartments & Villas | Arriendoscope',
    description: 'Rent apartments and villas in Dubai. Dubai Marina, JBR, Downtown, Business Bay, Palm Jumeirah and more. Real-time from Bayut. Free.',
    h1: 'RENT IN DUBAI',
    subtitle: 'Real-time rental listings in Dubai. Marina, JBR, Downtown, Business Bay, Palm Jumeirah, Deira and more.',
    neighborhoods: ['Dubai Marina', 'JBR', 'Downtown', 'Business Bay', 'Palm Jumeirah', 'Deira', 'Bur Dubai', 'Al Barsha'],
  },
};

/* All city slugs for internal links */
const ALL_CITIES = Object.keys(CITY_SEO);

const RANGE_LABELS = {
  today: 'HOY',
  '5m':  'ÚLTIMOS 5 MINUTOS',
  '15m': 'ÚLTIMOS 15 MINUTOS',
  '30m': 'ÚLTIMOS 30 MINUTOS',
  '1h':  'ÚLTIMA HORA',
  '6h':  'ÚLTIMAS 6 HORAS',
  '12h': 'ÚLTIMAS 12 HORAS',
  '1day': 'ÚLTIMAS 24 HORAS',
  week:  'ÚLTIMA SEMANA',
  month: 'ÚLTIMO MES',
};

/* ─── Component ──────────────────────────────────────── */

export function CityPage() {
  const { city } = useParams();
  const seo = CITY_SEO[city];

  // If invalid city, show 404-style
  if (!seo) {
    return (
      <div className={styles.notFound}>
        <h1>CIUDAD NO ENCONTRADA</h1>
        <p>No tenemos listings para esta ciudad.</p>
        <Link to="/" className={styles.backLink}>VOLVER AL FEED</Link>
      </div>
    );
  }

  return <CityContent city={city} seo={seo} />;
}

function CityContent({ city, seo }) {
  const {
    listings,
    loading,
    hasMore,
    total,
    pendingNew,
    filters,
    connected,
    loadMore,
    showNew,
    applyFilters,
    setIsNearTop
  } = useListings({ city });

  const { setStats } = useStats();

  // When city changes (navigating between city pages)
  useEffect(() => {
    applyFilters({ ...filters, city, timeRange: filters.timeRange || 'today' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    setStats({ connected, total });
  }, [connected, total, setStats]);

  const handleTimeRange = useCallback((timeRange) => {
    applyFilters({ ...filters, timeRange: timeRange || 'today' });
  }, [filters, applyFilters]);

  const feedbackLabel = useMemo(() => {
    const range = filters.timeRange || 'today';
    const label = RANGE_LABELS[range];
    if (!label) return null;
    return `${total} RESULTADO${total !== 1 ? 'S' : ''} — ${label}`;
  }, [filters.timeRange, total]);

  // JSON-LD ItemList for this city
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Arriendos en ${seo.name}`,
    description: seo.description,
    url: `https://arriendoscope.com/arriendos/${city}`,
    numberOfItems: total,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'RealEstateListing',
        name: l.title || `Arriendo en ${seo.name}`,
        url: l.url || `https://arriendoscope.com/arriendos/${city}`,
        ...(l.price && {
          offers: {
            '@type': 'Offer',
            price: String(l.price),
            priceCurrency: seo.currency,
          }
        }),
      }
    })),
  }), [city, seo, total, listings]);

  const otherCities = ALL_CITIES.filter(c => c !== city);

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        url={`https://arriendoscope.com/arriendos/${city}`}
        jsonLd={jsonLd}
      />

      {/* Hero SEO section */}
      <div className={styles.hero}>
        <h1 className={styles.h1}>{seo.h1}</h1>
        <p className={styles.subtitle}>{seo.subtitle}</p>
        <div className={styles.statsRow}>
          <span className={`${styles.dot} ${connected ? styles.dotLive : styles.dotOff}`} />
          <span className={styles.statsText}>
            {total.toLocaleString('es-CO')} {seo.lang === 'es' ? 'arriendos disponibles' : 'listings available'}
          </span>
        </div>
      </div>

      {/* Neighborhood tags for SEO */}
      <div className={styles.neighborhoods}>
        {seo.neighborhoods.map(n => (
          <span key={n} className={styles.neighborhoodTag}>{n.toUpperCase()}</span>
        ))}
      </div>

      {/* Feed controls */}
      <FilterBar filters={filters} onApply={applyFilters} />
      <TimeRangeBar value={filters.timeRange || 'today'} onChange={handleTimeRange} />
      {feedbackLabel && (
        <div className={styles.feedback}>{feedbackLabel}</div>
      )}
      <NewListingToast count={pendingNew.length} onClick={showNew} />
      <Feed
        listings={listings}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        onScrollPositionChange={setIsNearTop}
      />

      {/* Internal links — SEO link juice */}
      <nav className={styles.crossLinks}>
        <h2 className={styles.crossLinksTitle}>
          {seo.lang === 'es' ? 'TAMBIÉN EN' : 'ALSO IN'}
        </h2>
        <div className={styles.crossLinksGrid}>
          {otherCities.map(c => (
            <Link
              key={c}
              to={`/arriendos/${c}`}
              className={styles.crossLink}
            >
              {CITY_SEO[c]?.lang === 'es'
                ? `ARRIENDOS EN ${CITY_SEO[c]?.name?.toUpperCase()}`
                : `RENT IN ${CITY_SEO[c]?.name?.toUpperCase()}`
              }
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
