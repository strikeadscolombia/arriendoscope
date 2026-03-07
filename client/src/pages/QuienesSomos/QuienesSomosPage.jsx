import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from '../../hooks/useInView';
import { API_BASE } from '../../utils/constants';
import styles from './QuienesSomosPage.module.css';

/* ─── ANIMATED COUNTER ─── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, isInView] = useInView();

  useEffect(() => {
    if (!isInView || target <= 0) return;
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString('es-CO')}{suffix}</span>;
}

/* ─── SCROLL-TRIGGERED SECTION ─── */
function Section({ children, delay = 0, className = '' }) {
  const [ref, isInView] = useInView();
  return (
    <section
      ref={ref}
      className={`${styles.section} ${isInView ? styles.sectionVisible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
}

/* ─── BENEFIT CARD (interactive hover reveal) ─── */
function BenefitCard({ num, title, description, detail }) {
  const [expanded, setExpanded] = useState(false);
  const [ref, isInView] = useInView();

  return (
    <div
      ref={ref}
      className={`${styles.benefitCard} ${isInView ? styles.benefitCardVisible : ''} ${expanded ? styles.benefitCardExpanded : ''}`}
      style={{ transitionDelay: `${num * 120}ms` }}
      onClick={() => setExpanded(prev => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded(prev => !prev)}
    >
      <div className={styles.benefitHeader}>
        <span className={styles.benefitNum}>{String(num).padStart(2, '0')}</span>
        <h3 className={styles.benefitTitle}>{title}</h3>
        <span className={styles.benefitToggle}>{expanded ? '−' : '+'}</span>
      </div>
      <p className={styles.benefitDesc}>{description}</p>
      <div className={`${styles.benefitDetail} ${expanded ? styles.benefitDetailOpen : ''}`}>
        <p className={styles.benefitDetailText}>{detail}</p>
      </div>
    </div>
  );
}

/* ─── SCROLL PROGRESS WIPE ─── */
function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      // Start transition when element enters bottom, finish when top of element reaches center
      const start = windowH;
      const end = windowH * 0.3;
      const current = rect.top;
      if (current >= start) {
        setProgress(0);
      } else if (current <= end) {
        setProgress(1);
      } else {
        setProgress(1 - (current - end) / (start - end));
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ref]);

  return progress;
}

/* ─── MAIN PAGE ─── */
export function QuienesSomosPage() {
  const [totalListings, setTotalListings] = useState(0);
  const invertRef = useRef(null);
  const invertProgress = useScrollProgress(invertRef);

  useEffect(() => {
    fetch(`${API_BASE}/api/listings?limit=1`)
      .then(r => r.json())
      .then(data => setTotalListings(data.total || 0))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.radarPulse}>
          <div className={styles.radarDot} />
          <div className={styles.radarRing1} />
          <div className={styles.radarRing2} />
          <div className={styles.radarRing3} />
        </div>
        <h1 className={styles.heroTitle}>
          RADAR DE PROPIEDADES<br />AL ALCANCE DE TU MANO
        </h1>
        <p className={styles.heroSub}>
          ESCANEAMOS LOS PRINCIPALES PORTALES INMOBILIARIOS 24/7
          PARA QUE ENCUENTRES TU ARRIENDO ANTES QUE NADIE
        </p>
      </section>

      {/* PAIN POINT */}
      <Section>
        <span className={styles.tag}>EL PROBLEMA</span>
        <h2 className={styles.sectionTitle}>
          LA INFORMACION NO ESTA ACTUALIZADA
        </h2>
        <div className={styles.comparison}>
          <div className={styles.stale}>
            <span className={styles.staleX}>&#10005;</span>
            <div className={styles.staleLine} />
            <div className={styles.staleLine} />
            <div className={styles.staleLineShort} />
            <span className={styles.staleLabel}>YA ARRENDADO</span>
          </div>
          <div className={styles.fresh}>
            <span className={styles.freshCheck}>&#10003;</span>
            <div className={styles.freshLine} />
            <div className={styles.freshLine} />
            <div className={styles.freshLineShort} />
            <span className={styles.freshLabel}>DISPONIBLE AHORA</span>
          </div>
        </div>
        <p className={styles.sectionText}>
          LA MAYORIA DE PROPIEDADES QUE VES EN LINEA YA ESTAN ARRENDADAS.
          PIERDES TIEMPO CONTACTANDO DUEÑOS QUE YA NO TIENEN NADA DISPONIBLE.
        </p>
      </Section>

      {/* HOW IT WORKS */}
      <Section>
        <span className={styles.tag}>LA SOLUCION</span>
        <h2 className={styles.sectionTitle}>COMO FUNCIONA</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <h3 className={styles.stepTitle}>ESCANEAMOS</h3>
            <p className={styles.stepText}>
              NUESTRO RADAR BUSCA EN METROCUADRADO, CIENCUADRAS, FINCARAIZ,
              CRAIGSLIST Y MAS PORTALES CADA 5 MINUTOS
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <h3 className={styles.stepTitle}>FILTRAMOS</h3>
            <p className={styles.stepText}>
              SOLO ARRIENDOS FRESCOS Y RECIEN PUBLICADOS.
              ELIMINAMOS DUPLICADOS Y LISTINGS VIEJOS
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <h3 className={styles.stepTitle}>NOTIFICAMOS</h3>
            <p className={styles.stepText}>
              VES NUEVOS ARRIENDOS EN TIEMPO REAL EN TU FEED.
              SIN REFRESCAR, SIN ESPERAR
            </p>
          </div>
        </div>
      </Section>

      {/* ─── TRANSITION WIPE + BENEFITS (inverted section) ─── */}
      <div ref={invertRef} className={styles.invertWrapper}>
        {/* The wipe transition */}
        <div
          className={styles.invertWipe}
          style={{ transform: `scaleY(${invertProgress})` }}
        />

        <div
          className={styles.invertContent}
          style={{ opacity: invertProgress > 0.4 ? 1 : 0 }}
        >
          <span className={styles.invertTag}>BENEFICIOS</span>
          <h2 className={styles.invertTitle}>
            ¿POR QUE ARRIENDOSCOPE?
          </h2>

          <div className={styles.benefits}>
            <BenefitCard
              num={1}
              title="TIEMPO REAL"
              description="ARRIENDOS FRESCOS, NO PUBLICACIONES VIEJAS"
              detail="NUESTRO SISTEMA ESCANEA LOS PORTALES CADA 5 MINUTOS. CUANDO APARECE UN ARRIENDO NUEVO, LO VES EN SEGUNDOS EN TU FEED VIA WEBSOCKET. NO HAY DELAY."
            />
            <BenefitCard
              num={2}
              title="MULTIPLES FUENTES"
              description="5+ PORTALES EN UN SOLO LUGAR"
              detail="METROCUADRADO, CIENCUADRAS, FINCARAIZ, CRAIGSLIST Y MAS. NO TIENES QUE ABRIR 5 PESTAÑAS. TODO UNIFICADO EN UN SOLO FEED."
            />
            <BenefitCard
              num={3}
              title="FILTROS POTENTES"
              description="CIUDAD, BARRIO, PRECIO, TIPO, HABITACIONES"
              detail="FILTRA POR CUALQUIER COMBINACION. BARRIOS ESPECIFICOS, RANGO DE PRECIOS, TIPO DE PROPIEDAD. ENCUENTRA EXACTAMENTE LO QUE BUSCAS."
            />
            <BenefitCard
              num={4}
              title="PUBLICA GRATIS"
              description="DUEÑOS PUBLICAN DIRECTO SIN INTERMEDIARIOS"
              detail="¿ERES DUEÑO? PUBLICA TU PROPIEDAD EN 60 SEGUNDOS CON FOTOS. SIN REGISTRO, SIN COMISIONES. TU ARRIENDO APARECE EN EL FEED AL INSTANTE."
            />
            <BenefitCard
              num={5}
              title="7 CIUDADES"
              description="BOGOTA, MEDELLIN, CALI, BARRANQUILLA Y MAS"
              detail="CUBRIMOS LAS PRINCIPALES CIUDADES DE COLOMBIA MAS MIAMI. Y SEGUIMOS CRECIENDO. PRONTO MAS CIUDADES Y PAISES."
            />
            <BenefitCard
              num={6}
              title="100% GRATIS"
              description="SIN COSTO, SIN REGISTRO, SIN LIMITES"
              detail="ARRIENDOSCOPE ES COMPLETAMENTE GRATIS PARA BUSCAR Y PUBLICAR. NO HAY PLANES PREMIUM. NO HAY MUROS DE PAGO. NO HAY SPAM."
            />
          </div>
        </div>
      </div>

      {/* STATS */}
      <Section>
        <span className={styles.tag}>EN NUMEROS</span>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statNum}>
              <AnimatedCounter target={totalListings} />
            </span>
            <span className={styles.statLabel}>ARRIENDOS ENCONTRADOS</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>
              <AnimatedCounter target={7} duration={1000} />
            </span>
            <span className={styles.statLabel}>CIUDADES MONITOREADAS</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>
              <AnimatedCounter target={5} duration={1000} />
            </span>
            <span className={styles.statLabel}>FUENTES EN TIEMPO REAL</span>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>ARRIENDOSCOPE</div>
        <p className={styles.footerTagline}>RADAR DE ARRIENDOS EN COLOMBIA Y MIAMI</p>
        <div className={styles.socials}>
          <a href="https://instagram.com/arriendoscope" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>INSTAGRAM</a>
          <a href="https://x.com/arriendoscope" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>X</a>
          <a href="https://tiktok.com/@arriendoscope" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>TIKTOK</a>
          <a href="https://youtube.com/@arriendoscope" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>YOUTUBE</a>
        </div>
        <p className={styles.footerCopy}>&copy; 2026 ARRIENDOSCOPE</p>
      </footer>
    </div>
  );
}
