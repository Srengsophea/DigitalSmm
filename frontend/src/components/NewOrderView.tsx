import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ServiceItem } from './ServicesTable';
import { PlatformPillsBar } from './PlatformPillsBar';
import { Search, X, ChevronDown } from 'lucide-react';
import { ResponsivePickerSheet } from './ResponsivePickerSheet';

export interface PreselectedServiceData {
  serviceId: string;
  serviceName?: string;
  category?: string;
  platform?: string;
  link?: string;
  quantity?: number;
}

interface NewOrderViewProps {
  services: ServiceItem[];
  categories: string[];
  initialTab?: 'new-order' | 'mass-order';
  preselectedService?: PreselectedServiceData | null;
  onClearPreselectedService?: () => void;
  onOrderSuccess: () => void;
  openAuthModal: () => void;
  openDepositModal: () => void;
}

// Built-in exact reference services matching the user's template
const EXACT_REFERENCE_SERVICES: ServiceItem[] = [
  {
    id: 'fb-live-11901',
    externalId: 11901,
    name: 'Facebook Live Stream Views | ⏱ Duration: 15 Minutes | 👥 Concurrent: 100% | ✅ Quality: Good Quality | ⚡ Start: 0–5 Minutes | 🚀 Speed: Fast | 🔝 MAX: 100K',
    category: 'Facebook Live Stream Views - 100% Concurrent',
    platform: 'Facebook',
    originalRate: 0.50,
    customRate: 0.66,
    markupPercent: 30,
    min: 10,
    max: 100000,
    type: 'Default',
    isActive: true,
    dripfeed: true,
    refill: false,
    cancel: false,
  },
  {
    id: 'fb-live-11902',
    externalId: 11902,
    name: 'Facebook Live Stream Views | ⏱ Duration: 30 Minutes | 👥 Concurrent: 100% | ✅ Quality: Good Quality | ⚡ Start: 0–5 Minutes | 🚀 Speed: Fast | 🔝 MAX: 100K',
    category: 'Facebook Live Stream Views - 100% Concurrent',
    platform: 'Facebook',
    originalRate: 1.00,
    customRate: 1.31,
    markupPercent: 30,
    min: 10,
    max: 100000,
    type: 'Default',
    isActive: true,
    dripfeed: true,
    refill: false,
    cancel: false,
  },
  {
    id: 'fb-live-11903',
    externalId: 11903,
    name: 'Facebook Live Stream Views | ⏱ Duration: 60 Minutes | 👥 Concurrent: 100% | ✅ Quality: Good Quality | ⚡ Start: 0–5 Minutes | 🚀 Speed: Fast | 🔝 MAX: 100K',
    category: 'Facebook Live Stream Views - 100% Concurrent',
    platform: 'Facebook',
    originalRate: 2.00,
    customRate: 2.61,
    markupPercent: 30,
    min: 10,
    max: 100000,
    type: 'Default',
    isActive: true,
    dripfeed: true,
    refill: false,
    cancel: false,
  },
  {
    id: 'fb-live-11904',
    externalId: 11904,
    name: 'Facebook Live Stream Views | ⏱ Duration: 90 Minutes | 👥 Concurrent: 100% | ✅ Quality: Good Quality | ⚡ Start: 0–5 Minutes | 🚀 Speed: Fast | 🔝 MAX: 100K',
    category: 'Facebook Live Stream Views - 100% Concurrent',
    platform: 'Facebook',
    originalRate: 3.00,
    customRate: 3.92,
    markupPercent: 30,
    min: 10,
    max: 100000,
    type: 'Default',
    isActive: true,
    dripfeed: true,
    refill: false,
    cancel: false,
  },
  {
    id: 'fb-live-11905',
    externalId: 11905,
    name: 'Facebook Live Stream Views | ⏱ Duration: 120 Minutes | 👥 Concurrent: 100% | ✅ Quality: Good Quality | ⚡ Start: 0–5 Minutes | 🚀 Speed: Fast | 🔝 MAX: 100K',
    category: 'Facebook Live Stream Views - 100% Concurrent',
    platform: 'Facebook',
    originalRate: 4.00,
    customRate: 5.22,
    markupPercent: 30,
    min: 10,
    max: 100000,
    type: 'Default',
    isActive: true,
    dripfeed: true,
    refill: false,
    cancel: false,
  },
];

// Helper to decode HTML entities in service names (e.g. &amp;, &#39;, &quot;)
const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

interface ParsedServiceSpecs {
  baseName: string;
  location?: string;
  quality?: string;
  duration?: string;
  concurrent?: string;
  start?: string;
  speed?: string;
  drop?: string;
  refill?: string;
  cancel?: string;
  package?: string;
  source?: string;
  max?: string;
  min?: string;
  otherSpecs: { label: string; value: string }[];
}

const parseServiceSpecs = (service?: ServiceItem): ParsedServiceSpecs => {
  if (!service) {
    return {
      baseName: 'Social Media Marketing Service',
      quality: 'High Quality Guaranteed',
      start: 'Instant - 15 Minutes',
      speed: 'Fast Automated Delivery',
      refill: 'Standard Guarantee',
      otherSpecs: [],
    };
  }

  const rawName = decodeHtmlEntities(service.name || '');
  const parts = rawName.split('|').map((p) => p.trim()).filter(Boolean);
  const baseName = parts[0] || rawName;

  const specsMap: Record<string, string> = {};
  const otherSpecs: { label: string; value: string }[] = [];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const rawKey = part.slice(0, colonIdx).replace(/[^\w\s]/gi, '').trim().toLowerCase();
      const val = part.slice(colonIdx + 1).trim();
      if (rawKey && val) {
        specsMap[rawKey] = val;
      }
    } else {
      const lower = part.toLowerCase();
      if (lower.includes('no refill')) {
        specsMap['refill'] = 'No Refill';
      } else if (lower.includes('refill')) {
        specsMap['refill'] = part;
      } else if (lower.includes('instant')) {
        specsMap['start'] = 'Instant';
      } else if (lower.includes('no drop')) {
        specsMap['drop'] = 'No Drop';
      } else {
        otherSpecs.push({ label: 'Feature', value: part });
      }
    }
  }

  const refillVal: string = specsMap['refill'] || (service.refill ? '30 Days Refill Guarantee' : 'No Refill');
  let cancelVal: string | undefined = specsMap['cancel'];
  if (!cancelVal && service.cancel) {
    cancelVal = 'Allowed / Enabled';
  }

  return {
    baseName,
    location: specsMap['location'],
    quality: specsMap['quality'] || 'High Quality Guaranteed',
    duration: specsMap['duration'],
    concurrent: specsMap['concurrent'],
    start: specsMap['start'] || '0 - 15 Minutes (Instant Dispatch)',
    speed: specsMap['speed'] || 'Fast Automated Delivery',
    drop: specsMap['drop'],
    refill: refillVal,
    cancel: cancelVal,
    package: specsMap['package'],
    source: specsMap['source'] || specsMap['traffic sources'],
    max: specsMap['max'] || (service.max ? service.max.toLocaleString() : undefined),
    min: service.min ? service.min.toLocaleString() : undefined,
    otherSpecs,
  };
};

const getAcceptedLinkFormats = (service?: ServiceItem): string[] => {
  if (!service) return ['https://...'];
  const plat = (service.platform || '').toLowerCase();
  const name = (service.name || '').toLowerCase();
  const cat = (service.category || '').toLowerCase();
  const combined = `${name} ${cat} ${plat}`;

  // Instagram
  if (plat.includes('instagram') || combined.includes('instagram')) {
    if (combined.includes('follower') || combined.includes('sub')) {
      return [
        'https://www.instagram.com/username',
        'https://instagram.com/username',
        '@username (Public Account)',
      ];
    }
    if (combined.includes('story') || combined.includes('stories')) {
      return ['https://www.instagram.com/stories/username/1234567890/'];
    }
    if (combined.includes('reel')) {
      return ['https://www.instagram.com/reel/Cxxxxxx/'];
    }
    if (combined.includes('comment')) {
      return ['https://www.instagram.com/p/POST_ID/ (Post or Reel URL)'];
    }
    return [
      'https://www.instagram.com/p/POST_ID/',
      'https://www.instagram.com/reel/REEL_ID/',
      'https://www.instagram.com/tv/VIDEO_ID/',
    ];
  }

  // TikTok
  if (plat.includes('tiktok') || combined.includes('tiktok')) {
    if (combined.includes('live') || combined.includes('stream')) {
      return ['https://www.tiktok.com/@username/live'];
    }
    if (combined.includes('follower')) {
      return [
        'https://www.tiktok.com/@username',
        '@username (Public Profile)',
      ];
    }
    return [
      'https://www.tiktok.com/@username/video/7123456789012345678',
      'https://vm.tiktok.com/ZMxxxxxx/',
      'https://vt.tiktok.com/ZSxxxxxx/',
    ];
  }

  // YouTube
  if (plat.includes('youtube') || combined.includes('youtube')) {
    if (combined.includes('live') || combined.includes('stream')) {
      return [
        'https://www.youtube.com/live/LIVE_VIDEO_ID',
        'https://www.youtube.com/watch?v=VIDEO_ID',
      ];
    }
    if (combined.includes('sub') || combined.includes('channel')) {
      return [
        'https://www.youtube.com/@channelname',
        'https://www.youtube.com/channel/UCxxxxxxxxxxxx',
      ];
    }
    if (combined.includes('short')) {
      return ['https://www.youtube.com/shorts/SHORT_ID'];
    }
    return [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/SHORT_ID',
    ];
  }

  // Telegram
  if (plat.includes('telegram') || combined.includes('telegram')) {
    if (combined.includes('post') || combined.includes('view') || combined.includes('reaction')) {
      return [
        'https://t.me/channel_name/123',
        'https://t.me/c/1234567890/123',
      ];
    }
    return [
      'https://t.me/channel_name',
      'https://t.me/+joinchatlink',
      '@channel_name (Public Channel/Group)',
    ];
  }

  // Twitter / X
  if (plat.includes('twitter') || combined.includes('twitter') || combined.includes('x.com')) {
    if (combined.includes('follower')) {
      return [
        'https://x.com/username',
        'https://twitter.com/username',
        '@username',
      ];
    }
    return [
      'https://x.com/username/status/1234567890123456789',
      'https://twitter.com/username/status/1234567890123456789',
    ];
  }

  // Facebook
  if (plat.includes('facebook') || combined.includes('facebook')) {
    if (combined.includes('live') || combined.includes('stream')) {
      return [
        'https://www.facebook.com/watch/live/?v=123456789',
        'https://www.facebook.com/username/videos/123456789/',
        'https://fb.watch/xxxxxx/',
      ];
    }
    if (combined.includes('page') || combined.includes('follower') || combined.includes('profile')) {
      return [
        'https://www.facebook.com/page_username',
        'https://www.facebook.com/profile.php?id=1000xxxxxxxxx',
      ];
    }
    if (combined.includes('group')) {
      return ['https://www.facebook.com/groups/group_id/'];
    }
    return [
      'https://www.facebook.com/username/posts/123456789/',
      'https://www.facebook.com/watch/?v=123456789',
      'https://www.facebook.com/reel/123456789',
    ];
  }

  // Spotify
  if (plat.includes('spotify') || combined.includes('spotify')) {
    if (combined.includes('artist')) return ['https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb'];
    if (combined.includes('playlist')) return ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'];
    if (combined.includes('album')) return ['https://open.spotify.com/album/4LH4d3cOWNNXdsqFd4GsgC'];
    return ['https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'];
  }

  // Discord
  if (plat.includes('discord') || combined.includes('discord')) {
    return [
      'https://discord.gg/invitelink',
      'https://discord.com/invite/invitelink',
    ];
  }

  // Twitch
  if (plat.includes('twitch') || combined.includes('twitch')) {
    if (combined.includes('follower') || combined.includes('channel') || combined.includes('live')) {
      return ['https://www.twitch.tv/channelname'];
    }
    return [
      'https://www.twitch.tv/videos/123456789',
      'https://clips.twitch.tv/ClipNameHere',
    ];
  }

  // LinkedIn
  if (plat.includes('linkedin') || combined.includes('linkedin')) {
    if (combined.includes('profile') || combined.includes('connection')) {
      return ['https://www.linkedin.com/in/username'];
    }
    if (combined.includes('company')) {
      return ['https://www.linkedin.com/company/company-name'];
    }
    return ['https://www.linkedin.com/posts/activity-1234567890...'];
  }

  // Website Traffic / Other
  return [
    'https://yourdomain.com',
    'https://yourdomain.com/landing-page',
  ];
};

const getServiceFeatures = (service?: ServiceItem, specs?: ParsedServiceSpecs): string[] => {
  if (!service) return ['High quality automated delivery.'];
  const name = (service.name || '').toLowerCase();
  const cat = (service.category || '').toLowerCase();
  const combined = `${name} ${cat}`;

  if (combined.includes('live') || combined.includes('stream')) {
    return [
      `Delivers ${specs?.concurrent || '100%'} concurrent live viewers.`,
      `Stable retention throughout the ${specs?.duration || 'specified broadcast duration'}.`,
      'Fast automated start right after broadcast initiation.',
      'Supports valid public stream URLs.',
    ];
  }

  if (combined.includes('follower') || combined.includes('sub') || combined.includes('member')) {
    return [
      'Authentic profile delivery to expand organic visibility.',
      'Gradual delivery pacing to protect account integrity.',
      '100% safe — no account credentials or passwords required.',
      specs?.refill && specs.refill !== 'No Refill'
        ? `Protected by warranty refill support (${specs.refill}).`
        : 'High-retention profiles with stable delivery.',
    ];
  }

  if (combined.includes('like') || combined.includes('reaction') || combined.includes('upvote') || combined.includes('retweet')) {
    return [
      'High-impact real engagement to boost post algorithm ranking.',
      'Fast automated dispatch within minutes of placement.',
      'Safe for Explore, Suggested feeds, and hashtag ranks.',
      specs?.refill && specs.refill !== 'No Refill'
        ? `Includes refill warranty protection (${specs.refill}).`
        : 'Stable, non-drop engagement from active accounts.',
    ];
  }

  if (combined.includes('view') || combined.includes('impression') || combined.includes('watch')) {
    return [
      'High-retention views suitable for search discovery and monetization.',
      'Delivers genuine impressions and profile interaction.',
      'Automated server dispatch with stable non-drop delivery.',
      'Trackable directly in platform studio analytics.',
    ];
  }

  if (combined.includes('comment')) {
    return [
      'Realistic, relevant comments to spark authentic conversations.',
      'Gradual delivery to ensure completely organic appearance.',
      'Compliant with platform community safety standards.',
      'Instant credibility and social proof on target content.',
    ];
  }

  if (combined.includes('traffic') || combined.includes('website')) {
    return [
      'Real organic desktop & mobile visitors with realistic user-agents.',
      'Fully trackable in Google Analytics 4 (GA4).',
      'Safe for AdSense, affiliate networks, and search rankings.',
      'Consistent daily visitor pacing to target landing pages.',
    ];
  }

  return [
    'High quality automated delivery from verified server nodes.',
    'Fast automated start right after order confirmation.',
    '24/7 monitoring and order status tracking.',
    'Full compatibility with standard public platform URLs.',
  ];
};

const getServiceWarnings = (service?: ServiceItem): string[] => {
  if (!service) return ['Keep target content public during delivery.'];
  const name = (service.name || '').toLowerCase();
  const cat = (service.category || '').toLowerCase();
  const combined = `${name} ${cat}`;

  if (combined.includes('live') || combined.includes('stream')) {
    return [
      'The broadcast MUST be live or starting immediately before submitting this order.',
      'The stream and profile must remain strictly Public throughout the entire broadcast.',
      'Do not end, terminate, or delete the live stream early while delivery is active.',
      'Orders placed on ended, broken, or private stream links cannot be refunded.',
      'Do not change the stream title, privacy, or URL while the order is in progress.',
    ];
  }

  if (combined.includes('follower') || combined.includes('sub') || combined.includes('member')) {
    return [
      'Your account, page, or channel MUST be set to PUBLIC before submitting the order.',
      'Do NOT change your username, handle, or URL link while the order is in progress.',
      'Do NOT submit multiple simultaneous orders for the same account before previous orders complete.',
      'Private accounts or altered usernames void refill and refund eligibility.',
      'If the account is made private or deleted during delivery, the order is marked completed.',
    ];
  }

  if (combined.includes('like') || combined.includes('view') || combined.includes('reaction') || combined.includes('comment')) {
    return [
      'The target post, video, reel, or tweet MUST be set to PUBLIC.',
      'Verify that the URL opens directly in an incognito / private browser window without logging in.',
      'Do NOT delete, archive, or privatize the post while delivery is underway.',
      'Shortened URLs (bit.ly, tinyurl, etc.) are not supported and cannot be refunded.',
      'Wrong link formats or posts deleted during delivery are not eligible for a refund.',
    ];
  }

  if (combined.includes('traffic') || combined.includes('website')) {
    return [
      'Ensure the target website is online and accessible globally without geo-restrictions or captcha gates.',
      'Do not use links that trigger malware warnings, pop-up redirects, or illegal/adult content.',
      'Multiple URL redirects or broken domain routing will result in cancellation.',
      'Visitor indexing in Google Analytics (GA4) may have standard reporting delays.',
    ];
  }

  return [
    'Ensure your target link is valid, active, and publicly accessible.',
    'Do not change privacy settings, delete content, or alter URLs during delivery.',
    'Shortened or redirect links are not supported.',
    'Simultaneous duplicate orders for the same target should be avoided until completion.',
  ];
};

export const NewOrderView: React.FC<NewOrderViewProps> = ({
  services: propServices,
  categories: propCategories,
  initialTab = 'new-order',
  preselectedService,
  onClearPreselectedService,
  onOrderSuccess,
  openAuthModal,
  openDepositModal,
}) => {
  const { user, isAuthenticated, refreshProfile, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'subscription' | 'fav' | 'countries' | 'mass'>(
    initialTab === 'mass-order' ? 'mass' : 'new'
  );

  useEffect(() => {
    if (initialTab === 'mass-order') {
      setActiveTab('mass');
    }
  }, [initialTab]);

  // Use propServices as primary; append reference services only if not already present in propServices
  const allServices = useMemo(() => {
    if (propServices.length === 0) return EXACT_REFERENCE_SERVICES;
    const existingIds = new Set(propServices.map((s) => s.id));
    const extra = EXACT_REFERENCE_SERVICES.filter((s) => !existingIds.has(s.id));
    return [...propServices, ...extra];
  }, [propServices]);

  // Extract categories from real API services first
  const allCategories = useMemo(() => {
    if (propCategories.length > 0) return propCategories;
    const set = new Set<string>();
    EXACT_REFERENCE_SERVICES.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [propCategories]);

  // Platform selection state matching Screenshot 1
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');

  // Single order form state
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [dripFeed, setDripFeed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auto subscription form state
  const [subLink, setSubLink] = useState('');
  const [subPosts, setSubPosts] = useState<number>(10);
  const [subMin, setSubMin] = useState<number>(100);
  const [subMax, setSubMax] = useState<number>(500);

  // Mass order form state
  const [massOrderText, setMassOrderText] = useState('');
  const [isSubmittingMass, setIsSubmittingMass] = useState(false);

  // Close search popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  // Filter categories by selected platform
  const availableCategories = allCategories.filter((cat) => {
    if (selectedPlatform === 'All') return true;
    const p = selectedPlatform.toLowerCase();
    const c = cat.toLowerCase();
    if (p === 'twitter' && (c.includes('twitter') || c.includes(' x '))) return true;
    if (p === 'website traffic' && (c.includes('traffic') || c.includes('website'))) return true;
    if (p === 'mobile traffic' && (c.includes('mobile') || c.includes('traffic'))) return true;
    return c.includes(p);
  });

  const displayCategories = availableCategories.length > 0 ? availableCategories : allCategories;

  const handleSelectPlatform = (plat: string) => {
    setSelectedPlatform(plat);
    if (plat === 'All') {
      if (allCategories.length > 0) setSelectedCategory(allCategories[0]);
    } else {
      const p = plat.toLowerCase();
      const matched = allCategories.find((cat) => {
        const c = cat.toLowerCase();
        if (p === 'twitter' && (c.includes('twitter') || c.includes(' x '))) return true;
        if (p === 'website traffic' && (c.includes('traffic') || c.includes('website'))) return true;
        if (p === 'mobile traffic' && (c.includes('mobile') || c.includes('traffic'))) return true;
        return c.includes(p);
      });
      if (matched) {
        setSelectedCategory(matched);
      }
    }
  };

  // Filter services by category for the standard dropdown
  const filteredServices = allServices.filter((s) => {
    if (selectedCategory && s.category !== selectedCategory) return false;
    return true;
  });

  // Global search matching for the autocomplete popup matching user screenshot
  // Do NOT show anything if no input value is provided!
  const matchingSearchServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) {
      return []; // Return empty array when no search term is entered
    }

    const words = q.split(/\s+/).filter(Boolean);
    return allServices.filter((s) => {
      const text = `${s.name} ${s.category} ${s.platform || ''} ${s.externalId}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [allServices, serviceSearch]);

  const selectedService = allServices.find((s) => s.id === selectedServiceId) || filteredServices[0] || allServices[0];

  const specs = useMemo(() => parseServiceSpecs(selectedService), [selectedService]);
  const acceptedLinkFormats = useMemo(() => getAcceptedLinkFormats(selectedService), [selectedService]);
  const serviceFeatures = useMemo(() => getServiceFeatures(selectedService, specs), [selectedService, specs]);
  const serviceWarnings = useMemo(() => getServiceWarnings(selectedService), [selectedService]);

  useEffect(() => {
    if (allCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(allCategories[0]);
    }
  }, [allCategories]);

  useEffect(() => {
    if (filteredServices.length > 0 && !filteredServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
      setQuantity(filteredServices[0].min || 1000);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (preselectedService && allServices.length > 0) {
      const targetId = preselectedService.serviceId?.toString();
      const matched = allServices.find((s) => {
        if (targetId && (s.id?.toString() === targetId || s.externalId?.toString() === targetId)) {
          return true;
        }
        if (preselectedService.serviceName && s.name.trim() === preselectedService.serviceName.trim()) {
          return true;
        }
        return false;
      });

      if (matched) {
        if (matched.platform) {
          setSelectedPlatform(matched.platform);
        }
        setSelectedCategory(matched.category);
        setSelectedServiceId(matched.id);
        if (preselectedService.quantity) {
          setQuantity(preselectedService.quantity);
        } else if (matched.min) {
          setQuantity(matched.min);
        }
        if (preselectedService.link) {
          setLink(preselectedService.link);
        }
        setActiveTab('new');
        if (onClearPreselectedService) {
          onClearPreselectedService();
        }
      }
    }
  }, [preselectedService, allServices]);

  const charge = selectedService
    ? Number(((quantity / 1000) * selectedService.customRate).toFixed(4))
    : 0;

  // Format the service search result row matching the user's screenshot
  const formatServiceSearchRow = (s: ServiceItem) => {
    const cleanName = decodeHtmlEntities(s.name);
    const badges = `${s.refill ? ' | ♻️ Refill' : ''}${s.cancel ? ' | 🚫 Cancel' : ''}`;
    if (s.name.includes('|')) {
      return `${cleanName}${badges} - $${s.customRate.toFixed(3)} per 1000`;
    }
    const maxStr = s.max ? (s.max >= 1000000 ? `${(s.max / 1000000).toLocaleString()}M` : s.max >= 1000 ? `${(s.max / 1000).toLocaleString()}K` : s.max) : '100K';
    const minStr = s.min ? s.min.toLocaleString() : '10';
    return `${cleanName}${badges} | ✅ Quality: High Quality | ⚡ Start: Instant - 15 Min | 🚀 Speed: Fast | ⬇️ Min: ${minStr} | 🔝 Max: ${maxStr} - $${s.customRate.toFixed(3)} per 1000`;
  };

  const handleSelectSearchService = (s: ServiceItem) => {
    setSelectedServiceId(s.id);
    setSelectedCategory(s.category);
    if (s.platform) {
      setSelectedPlatform(s.platform);
    }
    setQuantity(s.min || 1000);
    setServiceSearch('');
    setIsSearchOpen(false);
  };

  const handleSingleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!selectedService) {
      setMessage({ text: 'Please select a service', type: 'error' });
      return;
    }

    if (!link.trim()) {
      setMessage({ text: 'Target link or account username is required', type: 'error' });
      return;
    }

    if (quantity < selectedService.min) {
      setMessage({ text: `Minimum order quantity is ${selectedService.min.toLocaleString()}`, type: 'error' });
      return;
    }

    if (quantity > selectedService.max) {
      setMessage({ text: `Maximum order quantity is ${selectedService.max.toLocaleString()}`, type: 'error' });
      return;
    }

    if (user && user.balance < charge) {
      setMessage({
        text: `Insufficient balance ($${user.balance.toFixed(3)}). Need $${charge.toFixed(3)}. Please add funds.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.orders.createOrder({
        serviceId: selectedService.id,
        link: link.trim(),
        quantity,
      });

      if (res.success && res.order) {
        showToast(`Order #${res.order.id.slice(0, 8)} placed successfully!`, 'success');
        refreshProfile();
        setLink('');
        onOrderSuccess();
      } else {
        setMessage({ text: res.error || 'Failed to place order', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error creating order', type: 'error' });
    } finally {
      setIsSubmitting(false);
      refreshProfile();
    }
  };

  const handleMassOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!massOrderText.trim()) {
      setMessage({ text: 'Please provide orders in format: service_id | link | quantity', type: 'error' });
      return;
    }

    setIsSubmittingMass(true);
    try {
      const res = await api.orders.createMassOrder(massOrderText.trim());
      if (res.success) {
        showToast(`Mass order placed! ${res.successfulCount || 'Multiple'} orders scheduled.`, 'success');
        refreshProfile();
        setMassOrderText('');
        onOrderSuccess();
      } else {
        setMessage({ text: res.error || 'Failed to place mass order', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Mass order error', type: 'error' });
    } finally {
      setIsSubmittingMass(false);
      refreshProfile();
    }
  };

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      {/* 1. TOP 3-ROW PLATFORM PILLS BAR matching Screenshot 1 */}
      <PlatformPillsBar
        selectedPlatform={selectedPlatform}
        onSelectPlatform={handleSelectPlatform}
      />

      {/* 2. MAIN 2-COLUMN LAYOUT: Left Form Card + Right Description Card */}
      <div className="order-page-grid">
        {/* ================= LEFT COLUMN: ORDER FORM CARD ================= */}
        <div
          className="card order-form-card"
          style={{
            padding: 0,
            overflow: 'hidden',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Royal Blue Header Box with rounded pill tabs matching Screenshot 1 */}
          <div className="order-header-tabs">
            <button
              type="button"
              className={`order-header-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
              style={{
                background: activeTab === 'new' ? '#ffffff' : '#c8d3e2',
                color: activeTab === 'new' ? '#162399' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                padding: '7px 22px',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'new' ? '0 2px 4px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              New Order
            </button>
            <button
              type="button"
              className={`order-header-tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscription')}
              style={{
                background: activeTab === 'subscription' ? '#ffffff' : '#c8d3e2',
                color: activeTab === 'subscription' ? '#162399' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                padding: '7px 20px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'subscription' ? '0 2px 4px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Auto Subscription
            </button>
            <button
              type="button"
              className={`order-header-tab-btn ${activeTab === 'fav' ? 'active' : ''}`}
              onClick={() => setActiveTab('fav')}
              style={{
                background: activeTab === 'fav' ? '#ffffff' : '#c8d3e2',
                color: activeTab === 'fav' ? '#162399' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                padding: '7px 20px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'fav' ? '0 2px 4px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Favorites
            </button>
            <button
              type="button"
              className={`order-header-tab-btn ${activeTab === 'countries' ? 'active' : ''}`}
              onClick={() => setActiveTab('countries')}
              style={{
                background: activeTab === 'countries' ? '#ffffff' : '#c8d3e2',
                color: activeTab === 'countries' ? '#162399' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                padding: '7px 20px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'countries' ? '0 2px 4px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Countries
            </button>
          </div>

          <div className="order-card-body">
            {/* TAB 1: NEW ORDER FORM matching Screenshot 1 */}
            {activeTab === 'new' && (
              <form onSubmit={handleSingleOrderSubmit}>
                {/* Search By Service with Autocomplete popup only on typed input */}
                <div ref={searchBoxRef} style={{ position: 'relative', marginBottom: 18 }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 Search By Service"
                      value={serviceSearch}
                      onFocus={() => {
                        if (serviceSearch.trim().length > 0) {
                          setIsSearchOpen(true);
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServiceSearch(val);
                        setIsSearchOpen(val.trim().length > 0);
                      }}
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        borderRadius: 8,
                        fontSize: '0.88rem',
                        padding: '10px 36px 10px 14px',
                      }}
                    />
                    {serviceSearch.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setServiceSearch('');
                          setIsSearchOpen(false);
                        }}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown only when user typed something and isSearchOpen */}
                  {isSearchOpen && serviceSearch.trim().length > 0 && (
                    <div
                      className="service-search-box"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: '#ffffff',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div className="service-search-results-list" style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {matchingSearchServices.length > 0 ? (
                          matchingSearchServices.slice(0, 40).map((s) => (
                            <div
                              key={s.id}
                              className="service-search-item"
                              onClick={() => handleSelectSearchService(s)}
                            >
                              {formatServiceSearchRow(s)}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '24px 18px', textAlign: 'center', color: '#64748b', fontSize: '0.86rem' }}>
                            No services found matching "{serviceSearch}". Try another search term.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search By Category Dropdown matching Screenshot 1 */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Search By Category
                  </label>

                  {/* Custom Compact Selector Trigger */}
                  <div
                    className="mobile-select-trigger"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="mobile-select-trigger-text">
                      {decodeHtmlEntities(selectedCategory) || 'Select Category...'}
                    </span>
                    <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                </div>

                {/* Service Dropdown matching Screenshot 1 */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Service
                  </label>

                  {/* Custom Compact Selector Trigger */}
                  <div
                    className="mobile-select-trigger"
                    onClick={() => setIsServicePickerOpen(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="mobile-select-trigger-text">
                      {selectedService
                        ? `ID - ${selectedService.externalId} ${decodeHtmlEntities(selectedService.name)} | $${selectedService.customRate.toFixed(3)} per 1000`
                        : 'Select Service...'}
                    </span>
                    <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                  {selectedService && (selectedService.refill || selectedService.cancel) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {selectedService.refill && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          ♻️ Refill Guaranteed
                        </span>
                      )}
                      {selectedService.cancel && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                          }}
                        >
                          🚫 Cancel Button Available
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Link Input matching Screenshot 1 */}
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Link
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={acceptedLinkFormats[0] ? acceptedLinkFormats[0].replace(/^•\s*/, '') : 'https://...'}
                    style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    required
                  />
                </div>

                {/* Quantity Input with Min/Max note on the right below input matching Screenshot 1 */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={quantity}
                    min={selectedService?.min || 1}
                    max={selectedService?.max || 1000000}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    required
                  />
                  <div style={{ textAlign: 'right', marginTop: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
                      Min: {selectedService?.min?.toLocaleString() || 10} - Max: {selectedService?.max?.toLocaleString() || '300 000'}
                    </span>
                  </div>
                </div>

                {/* Drip-feed Checkbox matching Screenshot 1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <input
                    type="checkbox"
                    id="dripFeedCheck"
                    checked={dripFeed}
                    onChange={(e) => setDripFeed(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#162399' }}
                  />
                  <label
                    htmlFor="dripFeedCheck"
                    style={{ fontSize: '0.88rem', color: '#334155', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Drip-feed
                  </label>
                </div>

                {/* Charge Readonly Input Box matching Screenshot 1 */}
                <div className="form-group" style={{ marginBottom: 22 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Charge
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="form-input"
                    value={charge > 0 ? `$${charge.toFixed(3)}` : '$0.000'}
                    style={{
                      background: '#f8fafc',
                      borderRadius: 8,
                      borderColor: '#e2e8f0',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      padding: '10px 14px',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                {/* Message error/success alert */}
                {message && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: '0.85rem',
                      background: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                      color: message.type === 'error' ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {message.text}
                  </div>
                )}

                {/* Full-width Royal Blue Submit Button matching Screenshot 1 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    background: '#162399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '13px 20px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(22, 35, 153, 0.25)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {isSubmitting ? 'Placing Order...' : 'Submit'}
                </button>
              </form>
            )}

            {/* TAB 2: AUTO SUBSCRIPTION */}
            {activeTab === 'subscription' && (
              <form onSubmit={handleSingleOrderSubmit}>
                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Search By Category
                  </label>

                  {/* Custom Compact Selector Trigger */}
                  <div
                    className="mobile-select-trigger"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="mobile-select-trigger-text">
                      {decodeHtmlEntities(selectedCategory) || 'Select Category...'}
                    </span>
                    <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Service
                  </label>

                  {/* Custom Compact Selector Trigger */}
                  <div
                    className="mobile-select-trigger"
                    onClick={() => setIsServicePickerOpen(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="mobile-select-trigger-text">
                      {selectedService
                        ? `ID - ${selectedService.externalId} ${decodeHtmlEntities(selectedService.name)} | $${selectedService.customRate.toFixed(3)} per 1000`
                        : 'Select Service...'}
                    </span>
                    <ChevronDown size={16} style={{ color: '#64748b', flexShrink: 0, marginLeft: 8 }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.88rem' }}>
                    Channel or Username Link
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={subLink}
                    onChange={(e) => setSubLink(e.target.value)}
                    placeholder={acceptedLinkFormats[0] ? acceptedLinkFormats[0].replace(/^•\s*/, '') : 'https://instagram.com/username'}
                    style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.82rem' }}>
                      New Posts
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={subPosts}
                      onChange={(e) => setSubPosts(Number(e.target.value))}
                      style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.82rem' }}>
                      Min Quantity
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={subMin}
                      onChange={(e) => setSubMin(Number(e.target.value))}
                      style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 500, color: '#334155', marginBottom: 6, fontSize: '0.82rem' }}>
                      Max Quantity
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={subMax}
                      onChange={(e) => setSubMax(Number(e.target.value))}
                      style={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: '0.88rem', padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    background: '#162399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '13px 20px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(22, 35, 153, 0.25)',
                  }}
                >
                  Start Auto Subscription
                </button>
              </form>
            )}

            {/* TAB 3: FAVORITES */}
            {activeTab === 'fav' && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⭐</div>
                <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No Favorite Services Yet</h4>
                <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: 360, margin: '0 auto 16px' }}>
                  Click the star icon next to any service on the Services page to bookmark it here for fast one-click ordering.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  style={{
                    background: '#162399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 20px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Browse Services
                </button>
              </div>
            )}

            {/* TAB 4: COUNTRIES */}
            {activeTab === 'countries' && (
              <div>
                <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: 16 }}>
                  Select a targeted country to filter geo-specific social media packages:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { name: 'USA', flag: '🇺🇸', query: 'usa' },
                    { name: 'United Kingdom', flag: '🇬🇧', query: 'uk' },
                    { name: 'Arab / Gulf', flag: '🇸🇦', query: 'arab' },
                    { name: 'India', flag: '🇮🇳', query: 'india' },
                    { name: 'Brazil', flag: '🇧🇷', query: 'brazil' },
                    { name: 'Germany', flag: '🇩🇪', query: 'germany' },
                    { name: 'Turkey', flag: '🇹🇷', query: 'turkey' },
                    { name: 'France', flag: '🇫🇷', query: 'france' },
                    { name: 'Indonesia', flag: '🇮🇩', query: 'indonesia' },
                    { name: 'Global', flag: '🌐', query: 'world' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setServiceSearch(c.query);
                        setIsSearchOpen(true);
                        setActiveTab('new');
                      }}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: MASS ORDER FORM */}
            {activeTab === 'mass' && (
              <form onSubmit={handleMassOrderSubmit}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    One order per line in format:
                  </label>
                  <div
                    style={{
                      background: '#f1f5f9',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      marginBottom: 10,
                      color: '#334155',
                    }}
                  >
                    service_id | link | quantity
                  </div>
                  <textarea
                    className="form-input"
                    rows={10}
                    placeholder={`102 | https://instagram.com/p/123 | 1000\n102 | https://instagram.com/p/456 | 2000`}
                    value={massOrderText}
                    onChange={(e) => setMassOrderText(e.target.value)}
                    style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '0.88rem', borderRadius: 8 }}
                  />
                </div>

                {message && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: '0.85rem',
                      background: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                      color: message.type === 'error' ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingMass}
                  style={{
                    width: '100%',
                    background: '#162399',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '13px 20px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: isSubmittingMass ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingMass ? 'Placing Mass Order...' : 'Submit Mass Order'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: DESCRIPTION CARD matching Screenshot 1 ================= */}
        <div
          className="card order-description-card"
          style={{
            padding: '24px 26px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: 18,
            }}
          >
            Description
          </h3>

          {/* Dynamic Service Specs with Emojis */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: '0.86rem',
              color: '#1e293b',
              marginBottom: 18,
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>📊 Service Type:</span> {specs.baseName}
            </div>

            {specs.duration && (
              <div>
                <span style={{ fontWeight: 600 }}>⏱️ Duration:</span> ({specs.duration})
              </div>
            )}

            {specs.concurrent && (
              <div>
                <span style={{ fontWeight: 600 }}>👥 Concurrent:</span> {specs.concurrent}
              </div>
            )}

            {specs.location && (
              <div>
                <span style={{ fontWeight: 600 }}>🌍 Location:</span> {specs.location}
              </div>
            )}

            {specs.package && (
              <div>
                <span style={{ fontWeight: 600 }}>🏷️ Package:</span> {specs.package}
              </div>
            )}

            <div>
              <span style={{ fontWeight: 600 }}>✅ Quality:</span> {specs.quality}
            </div>

            <div>
              <span style={{ fontWeight: 600 }}>⚡ Start:</span> {specs.start}
            </div>

            <div>
              <span style={{ fontWeight: 600 }}>🚀 Speed:</span> {specs.speed}
            </div>

            {specs.drop && (
              <div>
                <span style={{ fontWeight: 600 }}>⏬ Drop:</span> {specs.drop}
              </div>
            )}

            {specs.source && (
              <div>
                <span style={{ fontWeight: 600 }}>🧭 Source:</span> {specs.source}
              </div>
            )}

            <div>
              <span style={{ fontWeight: 600 }}>♻️ Refill:</span> {specs.refill}
            </div>

            {specs.cancel && (
              <div>
                <span style={{ fontWeight: 600 }}>🚫 Cancel Button:</span> {specs.cancel}
              </div>
            )}

            <div>
              <span style={{ fontWeight: 600 }}>⬇️ Min:</span>{' '}
              {specs.min || (selectedService?.min ? selectedService.min.toLocaleString() : '10')}
            </div>

            <div>
              <span style={{ fontWeight: 600 }}>🔝 Max:</span>{' '}
              ({specs.max || (selectedService?.max ? `${selectedService.max.toLocaleString()} depending on the service` : '100K')})
            </div>
          </div>

          {/* Dynamic Accepted Link Formats section */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.86rem',
                color: '#0f172a',
                marginBottom: 6,
              }}
            >
              🔗 Accepted Link Formats:
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                fontSize: '0.80rem',
                color: '#0284c7',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {acceptedLinkFormats.map((fmt, i) => (
                <div key={i}>• {fmt.replace(/^•\s*/, '')}</div>
              ))}
            </div>
          </div>

          {/* Dynamic Feature Bullet Points */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
              fontSize: '0.84rem',
              color: '#15803d',
              marginBottom: 18,
            }}
          >
            {serviceFeatures.map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✅</span>
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Dynamic Amber Warning Box */}
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#92400e',
                fontSize: '0.85rem',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚠️</span>
              <span>Important:</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: '0.78rem',
                color: '#78350f',
                lineHeight: 1.5,
              }}
            >
              {serviceWarnings.map((warn, i) => (
                <div key={i}>• {warn.replace(/^•\s*/, '')}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Category Bottom Sheet Picker */}
      <ResponsivePickerSheet
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title="Select Category"
        searchPlaceholder="Search categories..."
        selectedId={selectedCategory}
        onSelect={(cat) => setSelectedCategory(cat)}
        items={displayCategories.map((cat) => ({
          id: cat,
          title: decodeHtmlEntities(cat),
        }))}
      />

      {/* Mobile Responsive Service Bottom Sheet Picker */}
      <ResponsivePickerSheet
        isOpen={isServicePickerOpen}
        onClose={() => setIsServicePickerOpen(false)}
        title="Select Service"
        searchPlaceholder="Search services by name, ID or rate..."
        selectedId={selectedServiceId}
        onSelect={(id) => {
          setSelectedServiceId(id);
          const s = allServices.find((x) => x.id === id);
          if (s) setQuantity(s.min);
        }}
        items={filteredServices.map((s) => ({
          id: s.id,
          title: decodeHtmlEntities(s.name),
          badge: `#${s.externalId}${s.refill ? ' • ♻️ Refill' : ''}${s.cancel ? ' • 🚫 Cancel' : ''}`,
          rate: `$${s.customRate.toFixed(3)} / 1000`,
        }))}
      />
    </div>
  );
};
