import { useState, useMemo } from 'react';
import { API_BASE } from '../../utils/constants';
import styles from './ContactoPage.module.css';

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
}

export function ContactoPage() {
  const [form, setForm] = useState({ nombre: '', whatsapp: '', motivo: '' });
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha] = useState(() => generateCaptcha());
  const [status, setStatus] = useState(null); // null | 'sending' | 'sent' | 'error'

  const isValid = useMemo(() => {
    return (
      form.nombre.trim().length > 0 &&
      form.whatsapp.trim().length >= 7 &&
      form.motivo.trim().length > 0 &&
      parseInt(captchaInput) === captcha.answer
    );
  }, [form, captchaInput, captcha.answer]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || status === 'sending') return;

    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          whatsapp: form.whatsapp.trim(),
          motivo: form.motivo.trim()
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
          <h2 className={styles.successTitle}>MENSAJE ENVIADO</h2>
          <p className={styles.successText}>
            TE CONTACTAREMOS POR WHATSAPP
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>CONTACTO</h1>
        <p className={styles.subtitle}>
          ESCRIBENOS Y TE RESPONDEMOS POR WHATSAPP
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          <span className={styles.labelText}>NOMBRE</span>
          <input
            type="text"
            className={styles.input}
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="TU NOMBRE"
            autoComplete="name"
          />
        </label>

        <label className={styles.label}>
          <span className={styles.labelText}>WHATSAPP</span>
          <input
            type="tel"
            className={styles.input}
            value={form.whatsapp}
            onChange={handleChange('whatsapp')}
            placeholder="+57 300 123 4567"
            autoComplete="tel"
          />
        </label>

        <label className={styles.label}>
          <span className={styles.labelText}>MOTIVO</span>
          <textarea
            className={styles.textarea}
            value={form.motivo}
            onChange={handleChange('motivo')}
            rows={5}
            placeholder="CUENTANOS EN QUE TE PODEMOS AYUDAR..."
          />
        </label>

        <label className={styles.label}>
          <span className={styles.labelText}>
            VERIFICACION: ¿CUANTO ES {captcha.question}?
          </span>
          <input
            type="number"
            className={`${styles.input} ${styles.captchaInput}`}
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="?"
            inputMode="numeric"
          />
        </label>

        {status === 'error' && (
          <p className={styles.error}>ERROR AL ENVIAR. INTENTA DE NUEVO.</p>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!isValid || status === 'sending'}
        >
          {status === 'sending' ? 'ENVIANDO...' : 'ENVIAR'}
        </button>
      </form>
    </div>
  );
}
