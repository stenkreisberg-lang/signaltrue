import { useEffect } from 'react';

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  lang?: string;
  socialImage?: string;
  socialImageAlt?: string;
  type?: 'website' | 'article';
}

const SITE_URL = 'https://www.signaltrue.ai';
const SOCIAL_IMAGE = `${SITE_URL}/social-preview-v2.png`;

const upsertMeta = (selector: string, attribute: string, value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    if (selector.includes('property=')) {
      const property = selector.match(/property="([^"]+)"/)?.[1];
      if (property) element.setAttribute('property', property);
    } else {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export default function PageMeta({
  title,
  description,
  path,
  lang = 'en',
  socialImage = SOCIAL_IMAGE,
  socialImageAlt = 'SignalTrue — Early evidence for safer work',
  type = 'website',
}: PageMetaProps) {
  useEffect(() => {
    const canonical = `${SITE_URL}${path || window.location.pathname}`;

    document.documentElement.lang = lang;
    document.title = title;
    upsertMeta('meta[name="description"]', 'content', description);
    upsertMeta('meta[property="og:title"]', 'content', title);
    upsertMeta('meta[property="og:description"]', 'content', description);
    upsertMeta('meta[property="og:url"]', 'content', canonical);
    upsertMeta('meta[property="og:type"]', 'content', type);
    upsertMeta('meta[property="og:image"]', 'content', socialImage);
    upsertMeta('meta[property="og:image:alt"]', 'content', socialImageAlt);
    upsertMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'content', title);
    upsertMeta('meta[name="twitter:description"]', 'content', description);
    upsertMeta('meta[name="twitter:image"]', 'content', socialImage);
    upsertCanonical(canonical);
  }, [description, lang, path, socialImage, socialImageAlt, title, type]);

  return null;
}
