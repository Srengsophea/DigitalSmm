import { useEffect } from 'react';

export interface SEOConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string;
}

const DEFAULT_TITLE = 'DigitalSMM — Premier Automated Social Media Marketing Platform';
const DEFAULT_DESC = 'Access over 7,500+ direct provider services with automated instant delivery, AES-256 encrypted security, Bakong KHQR, and wholesale pricing on DigitalSMM.';

export const ROUTE_SEO: Record<string, SEOConfig> = {
  '/': {
    title: 'DigitalSMM — #1 SMM Panel & Automated Social Media Marketing Platform',
    description: 'Grow your reach instantly with DigitalSMM. Direct access to 7,500+ verified SMM services, instant dispatch, Cambodian Bakong KHQR payments, and wholesale rates.',
    canonicalPath: '/',
    keywords: 'smm panel, social media marketing, automated smm, buy followers, telegram members, bakong khqr smm',
  },
  '/home': {
    title: 'DigitalSMM — #1 SMM Panel & Automated Social Media Marketing Platform',
    description: 'Grow your reach instantly with DigitalSMM. Direct access to 7,500+ verified SMM services, instant dispatch, Cambodian Bakong KHQR payments, and wholesale rates.',
    canonicalPath: '/',
  },
  '/services': {
    title: 'Services & Wholesale Rates (7,500+ Services) — DigitalSMM',
    description: 'Explore live wholesale rates and specs for 7,500+ social media marketing services: Telegram, TikTok, Instagram, Facebook, YouTube, and X.',
    canonicalPath: '/services',
    keywords: 'smm services, wholesale smm rates, buy telegram subscribers, buy tiktok views, cheap smm rates',
  },
  '/api': {
    title: 'Reseller API Documentation & SMM v2 Integration — DigitalSMM',
    description: 'Connect your website, store, or Telegram bot directly to DigitalSMM with standard SMM API v2 endpoints. Fast response times and automated status polling.',
    canonicalPath: '/api',
    keywords: 'smm api, reseller smm api, automated smm api, smm v2 api docs',
  },
  '/faq': {
    title: 'Frequently Asked Questions & Support Center — DigitalSMM',
    description: 'Answers to frequently asked questions about Bakong KHQR wallet top-ups, order speeds, automated delivery, API integration, and account security.',
    canonicalPath: '/faq',
    keywords: 'digitalsmm faq, how to deposit bakong, smm delivery speed, smm panel support',
  },
  '/terms': {
    title: 'Terms of Service & Automatic Refund Policy — DigitalSMM',
    description: 'Read the official DigitalSMM Terms of Service, privacy protection guarantees, and automated order balance refund policies.',
    canonicalPath: '/terms',
  },
  '/login': {
    title: 'Sign In to Your Account — DigitalSMM Panel',
    description: 'Log in to your DigitalSMM client portal to manage orders, add funds with Bakong KHQR, track campaigns, and view reseller API keys.',
    canonicalPath: '/login',
  },
  '/signup': {
    title: 'Create a Free Account — DigitalSMM Panel',
    description: 'Register a free account on DigitalSMM in seconds. Instant access to wholesale rates, automated ordering, and 24/7 priority support.',
    canonicalPath: '/signup',
  },
  '/new-order': {
    title: 'Create New Order — DigitalSMM Client Dashboard',
    description: 'Place automated social media orders with instant live dispatch and wholesale pricing.',
  },
  '/orders': {
    title: 'Orders History & Live Tracking — DigitalSMM',
    description: 'Track real-time progress, start counts, remains, and completion status of your social media orders.',
  },
  '/add-funds': {
    title: 'Add Funds via Bakong KHQR — DigitalSMM',
    description: 'Scan dynamic KHQR with ABA Mobile, ACLEDA, Wing or any Cambodian bank for instant balance credit.',
  },
  '/tickets': {
    title: 'Support Tickets & Live Help — DigitalSMM',
    description: 'Open a support ticket for order inquiries, speed accelerations, or technical API assistance.',
  },
  '/settings': {
    title: 'Account Settings & Security — DigitalSMM',
    description: 'Manage your profile, password security, two-factor authentication, and API credentials.',
  },
};

/**
 * Hook to dynamically update SEO tags in document head on client route navigation
 */
export function usePageSEO(pathname: string) {
  useEffect(() => {
    const clean = pathname.split('?')[0] || '/';
    const seo = ROUTE_SEO[clean] || ROUTE_SEO['/'] || {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
    };

    // 1. Update document title
    document.title = seo.title;

    // 2. Update meta description
    const setMetaTag = (attr: string, key: string, content: string) => {
      let meta = document.querySelector(`meta[${attr}="${key}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, key);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMetaTag('name', 'description', seo.description);
    setMetaTag('property', 'og:title', seo.title);
    setMetaTag('property', 'og:description', seo.description);
    setMetaTag('name', 'twitter:title', seo.title);
    setMetaTag('name', 'twitter:description', seo.description);

    if (seo.keywords) {
      setMetaTag('name', 'keywords', seo.keywords);
    }

    // 3. Update Canonical Link
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://digitalsmm.site';
    const canonicalHref = `${currentOrigin}${seo.canonicalPath || clean}`;
    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalHref);

    // 4. Update og:url
    setMetaTag('property', 'og:url', canonicalHref);
  }, [pathname]);
}
