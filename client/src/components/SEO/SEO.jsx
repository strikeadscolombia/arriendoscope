import { useEffect } from 'react';

/**
 * SEO — Dynamic meta tags per route (zero dependencies).
 *
 * Updates document.title, meta description, OG tags, canonical,
 * and optionally injects JSON-LD structured data.
 *
 * On unmount it restores the default index.html values so
 * navigating back to / never shows stale city-specific SEO.
 */

const DEFAULTS = {
  title: 'Arriendoscope — Arriendos en Tiempo Real | Colombia, Miami, Dubai',
  description:
    'Encuentra arriendos frescos en Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Miami y Dubai. Escaneamos Metrocuadrado, Ciencuadras, FincaRaiz y más cada 5 minutos. 100% gratis.',
  url: 'https://arriendoscope.com/',
};

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOg(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSON_LD_ID = 'seo-jsonld';

function setJsonLd(data) {
  let el = document.getElementById(JSON_LD_ID);
  if (data) {
    if (!el) {
      el = document.createElement('script');
      el.id = JSON_LD_ID;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  } else if (el) {
    el.remove();
  }
}

export function SEO({ title, description, url, jsonLd }) {
  useEffect(() => {
    const t = title || DEFAULTS.title;
    const d = description || DEFAULTS.description;
    const u = url || DEFAULTS.url;

    document.title = t;
    setMeta('description', d);
    setOg('og:title', t);
    setOg('og:description', d);
    setOg('og:url', u);
    setMeta('twitter:title', t);
    setMeta('twitter:description', d);
    setCanonical(u);

    if (jsonLd) setJsonLd(jsonLd);

    return () => {
      // Restore defaults on unmount
      document.title = DEFAULTS.title;
      setMeta('description', DEFAULTS.description);
      setOg('og:title', DEFAULTS.title);
      setOg('og:description', DEFAULTS.description);
      setOg('og:url', DEFAULTS.url);
      setMeta('twitter:title', DEFAULTS.title);
      setMeta('twitter:description', DEFAULTS.description);
      setCanonical(DEFAULTS.url);
      setJsonLd(null);
    };
  }, [title, description, url, jsonLd]);

  return null;
}
