import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CITIES, API_BASE } from '../../utils/constants';
import styles from './CrearPropiedadPage.module.css';

const STEPS = ['TIPO', 'UBICACION', 'DETALLES', 'PRECIO', 'FOTOS', 'CONTACTO', 'REVISION'];

const INITIAL_DATA = {
  property_type: '',
  city: '',
  neighborhood: '',
  address: '',
  rooms: '',
  bathrooms: '',
  area_m2: '',
  stratum: '',
  price: '',
  admin_fee: '',
  images: [],
  contact_name: '',
  contact_phone: ''
};

function isStepValid(step, data) {
  switch (step) {
    case 0: return !!data.property_type;
    case 1: return !!data.city;
    case 2: return true; // optional details
    case 3: return data.price && parseInt(data.price) > 0;
    case 4: return true; // photos optional
    case 5: return data.contact_name.trim().length > 0 && data.contact_phone.trim().length >= 7;
    case 6: return true;
    default: return false;
  }
}

function resizeImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── STEP COMPONENTS ─── */

function StepTipo({ data, onChange }) {
  const types = [
    { value: 'apartamento', label: 'APTO', icon: '▦' },
    { value: 'casa', label: 'CASA', icon: '⌂' },
    { value: 'habitacion', label: 'HAB', icon: '▣' }
  ];
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>¿QUE TIPO DE PROPIEDAD?</h2>
      <div className={styles.typeGrid}>
        {types.map(t => (
          <button
            key={t.value}
            className={`${styles.typeBtn} ${data.property_type === t.value ? styles.typeBtnActive : ''}`}
            onClick={() => onChange('property_type', t.value)}
          >
            <span className={styles.typeIcon}>{t.icon}</span>
            <span className={styles.typeLabel}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepUbicacion({ data, onChange }) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>¿DONDE ESTA?</h2>
      <div className={styles.cityGrid}>
        {CITIES.map(c => (
          <button
            key={c.value}
            className={`${styles.cityBtn} ${data.city === c.value ? styles.cityBtnActive : ''}`}
            onClick={() => onChange('city', c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>BARRIO</label>
        <input
          type="text"
          className={styles.fieldInput}
          value={data.neighborhood}
          onChange={(e) => onChange('neighborhood', e.target.value)}
          placeholder="EJ: CHAPINERO, LAURELES..."
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>DIRECCION (OPCIONAL)</label>
        <input
          type="text"
          className={styles.fieldInput}
          value={data.address}
          onChange={(e) => onChange('address', e.target.value)}
          placeholder="CRA 7 #45-67"
        />
      </div>
    </div>
  );
}

function StepDetalles({ data, onChange }) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>DETALLES</h2>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>HABITACIONES</label>
        <div className={styles.optionRow}>
          {['1', '2', '3', '4'].map(v => (
            <button
              key={v}
              className={`${styles.optionBtn} ${data.rooms === v ? styles.optionBtnActive : ''}`}
              onClick={() => onChange('rooms', data.rooms === v ? '' : v)}
            >
              {v}{v === '4' ? '+' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>BANOS</label>
        <div className={styles.optionRow}>
          {['1', '2', '3'].map(v => (
            <button
              key={v}
              className={`${styles.optionBtn} ${data.bathrooms === v ? styles.optionBtnActive : ''}`}
              onClick={() => onChange('bathrooms', data.bathrooms === v ? '' : v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>AREA M²</label>
          <input
            type="number"
            className={`${styles.fieldInput} ${styles.monoInput}`}
            value={data.area_m2}
            onChange={(e) => onChange('area_m2', e.target.value)}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>ESTRATO</label>
          <div className={styles.optionRow}>
            {['1', '2', '3', '4', '5', '6'].map(v => (
              <button
                key={v}
                className={`${styles.optionBtnSmall} ${data.stratum === v ? styles.optionBtnActive : ''}`}
                onClick={() => onChange('stratum', data.stratum === v ? '' : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPrecio({ data, onChange }) {
  const formatted = (val) => {
    if (!val) return '';
    return parseInt(val).toLocaleString('es-CO');
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>¿CUANTO VALE?</h2>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>ARRIENDO MENSUAL</label>
        <div className={styles.priceWrap}>
          <span className={styles.priceCurrency}>$</span>
          <input
            type="number"
            className={`${styles.fieldInput} ${styles.priceInput}`}
            value={data.price}
            onChange={(e) => onChange('price', e.target.value)}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
        {data.price > 0 && (
          <span className={styles.priceFormatted}>
            ${formatted(data.price)} COP
          </span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>ADMINISTRACION (OPCIONAL)</label>
        <div className={styles.priceWrap}>
          <span className={styles.priceCurrency}>$</span>
          <input
            type="number"
            className={`${styles.fieldInput} ${styles.priceInput}`}
            value={data.admin_fee}
            onChange={(e) => onChange('admin_fee', e.target.value)}
            placeholder="0"
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}

function StepFotos({ data, onChange }) {
  const handleFiles = useCallback(async (files) => {
    const remaining = 10 - data.images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const newImages = await Promise.all(toProcess.map(f => resizeImage(f)));
    onChange('images', [...data.images, ...newImages]);
  }, [data.images, onChange]);

  const removeImage = (idx) => {
    onChange('images', data.images.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>FOTOS</h2>
      <p className={styles.stepHint}>{data.images.length}/10 — ARRASTRA O TOCA PARA AGREGAR</p>

      {data.images.length < 10 && (
        <label
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <span className={styles.dropIcon}>+</span>
          <span className={styles.dropText}>AGREGAR FOTOS</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className={styles.fileInput}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}

      {data.images.length > 0 && (
        <div className={styles.photoGrid}>
          {data.images.map((src, i) => (
            <div key={i} className={styles.photoThumb}>
              <img src={src} alt={`Foto ${i + 1}`} className={styles.photoImg} />
              <button
                className={styles.photoRemove}
                onClick={() => removeImage(i)}
                aria-label="Remover foto"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepContacto({ data, onChange }) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>TUS DATOS</h2>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>NOMBRE</label>
        <input
          type="text"
          className={styles.fieldInput}
          value={data.contact_name}
          onChange={(e) => onChange('contact_name', e.target.value)}
          placeholder="TU NOMBRE"
          autoComplete="name"
        />
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>WHATSAPP / TELEFONO</label>
        <input
          type="tel"
          className={styles.fieldInput}
          value={data.contact_phone}
          onChange={(e) => onChange('contact_phone', e.target.value)}
          placeholder="+57 300 123 4567"
          autoComplete="tel"
        />
      </div>
    </div>
  );
}

function StepRevision({ data }) {
  const typeLabel = { apartamento: 'APARTAMENTO', casa: 'CASA', habitacion: 'HABITACION' };
  const cityLabel = CITIES.find(c => c.value === data.city)?.label || data.city;
  const price = data.price ? parseInt(data.price).toLocaleString('es-CO') : '0';

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepQuestion}>REVISA TU PUBLICACION</h2>

      <div className={styles.reviewCard}>
        {data.images.length > 0 && (
          <img src={data.images[0]} alt="Preview" className={styles.reviewImg} />
        )}
        <div className={styles.reviewBody}>
          <span className={styles.reviewType}>{typeLabel[data.property_type] || ''}</span>
          <span className={styles.reviewPrice}>${price}</span>
          {data.admin_fee > 0 && (
            <span className={styles.reviewAdmin}>
              +${parseInt(data.admin_fee).toLocaleString('es-CO')} ADM
            </span>
          )}
          <span className={styles.reviewLocation}>
            {data.neighborhood ? `${data.neighborhood.toUpperCase()} · ` : ''}{cityLabel}
          </span>
          <div className={styles.reviewDetails}>
            {data.rooms && <span>{data.rooms} HAB</span>}
            {data.bathrooms && <span>{data.bathrooms} BANO</span>}
            {data.area_m2 && <span>{data.area_m2} M²</span>}
            {data.stratum && <span>E{data.stratum}</span>}
          </div>
          <span className={styles.reviewContact}>
            {data.contact_name} · {data.contact_phone}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */

export function CrearPropiedadPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(INITIAL_DATA);
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const navigate = useNavigate();

  const onChange = useCallback((field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const canNext = useMemo(() => isStepValid(step, data), [step, data]);

  const handlePublish = async () => {
    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_type: data.property_type,
          city: data.city,
          neighborhood: data.neighborhood || undefined,
          address: data.address || undefined,
          rooms: data.rooms || undefined,
          bathrooms: data.bathrooms || undefined,
          area_m2: data.area_m2 || undefined,
          stratum: data.stratum || undefined,
          price: parseInt(data.price),
          admin_fee: data.admin_fee ? parseInt(data.admin_fee) : 0,
          images: data.images.length > 0 ? data.images : undefined,
          contact_name: data.contact_name,
          contact_phone: data.contact_phone
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <span className={styles.successIcon}>&#10003;</span>
          <h2 className={styles.successTitle}>PUBLICADO</h2>
          <p className={styles.successText}>
            TU PROPIEDAD YA ESTA EN EL FEED
          </p>
          <button className={styles.goFeedBtn} onClick={() => navigate('/')}>
            VER EN EL FEED
          </button>
        </div>
      </div>
    );
  }

  const stepComponents = [
    <StepTipo key={0} data={data} onChange={onChange} />,
    <StepUbicacion key={1} data={data} onChange={onChange} />,
    <StepDetalles key={2} data={data} onChange={onChange} />,
    <StepPrecio key={3} data={data} onChange={onChange} />,
    <StepFotos key={4} data={data} onChange={onChange} />,
    <StepContacto key={5} data={data} onChange={onChange} />,
    <StepRevision key={6} data={data} />
  ];

  const isLast = step === STEPS.length - 1;

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className={styles.stepIndicator}>
        <span className={styles.stepCount}>
          {String(step + 1).padStart(2, '0')}/{String(STEPS.length).padStart(2, '0')}
        </span>
        <span className={styles.stepName}>{STEPS[step]}</span>
      </div>

      {/* Step content (animated) */}
      <div className={styles.stepWrap} key={step}>
        {stepComponents[step]}
      </div>

      {/* Navigation */}
      <div className={styles.navBar}>
        {step > 0 && (
          <button
            className={styles.backBtn}
            onClick={() => setStep(s => s - 1)}
          >
            ATRAS
          </button>
        )}
        <div className={styles.navSpacer} />
        {isLast ? (
          <button
            className={styles.publishBtn}
            onClick={handlePublish}
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'PUBLICANDO...' : 'PUBLICAR'}
          </button>
        ) : (
          <button
            className={styles.nextBtn}
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
          >
            SIGUIENTE
          </button>
        )}
      </div>

      {status === 'error' && (
        <p className={styles.error}>ERROR AL PUBLICAR. INTENTA DE NUEVO.</p>
      )}
    </div>
  );
}
