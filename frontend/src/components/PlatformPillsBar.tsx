import React from 'react';

export const PLATFORM_ROW_1 = [
  'All',
  'Instagram',
  'Facebook',
  'Twitter',
  'Youtube',
  'Linkedin',
  'Tiktok',
  'Telegram',
  'Spotify',
  'Soundcloud',
  'Twitch',
  'Discord',
  'Tumblr',
  'Kwai',
  'Reddit',
  'Deezer',
  'Clubhouse',
];

export const PLATFORM_ROW_2 = [
  'Dribbble',
  'Binance Square',
  'BlueSky',
  'Boomplay',
  'Kick',
  'Pinterest',
  'Vimeo',
  'VK',
  'Dailymotion',
  'Mixcloud',
  'Shazam',
  'Trovo',
  'Rumble',
  'LoyalFans',
  'FanCentro',
  'FanVue',
  'Quora',
];

export const PLATFORM_ROW_3 = [
  'Rutube',
  'Apple Music',
  'Medium',
  'Website Traffic',
  'Mobile Traffic',
];

export const ALL_PLATFORMS = [...PLATFORM_ROW_1, ...PLATFORM_ROW_2, ...PLATFORM_ROW_3];

interface PlatformPillsBarProps {
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
}

export const PlatformPillsBar: React.FC<PlatformPillsBarProps> = ({
  selectedPlatform,
  onSelectPlatform,
}) => {
  const getPlatformIcon = (platform: string, isActive: boolean) => {
    const iconSize = 18;

    switch (platform) {
      case 'All':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#2563eb'}>
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          </svg>
        );

      case 'Instagram':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke={isActive ? '#ffffff' : '#e1306c'} strokeWidth="2" />
            <circle cx="12" cy="12" r="4" stroke={isActive ? '#ffffff' : '#e1306c'} strokeWidth="2" />
            <circle cx="17.5" cy="6.5" r="1.5" fill={isActive ? '#ffffff' : '#e1306c'} />
          </svg>
        );

      case 'Facebook':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#1877f2'}>
            <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
          </svg>
        );

      case 'Twitter':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#1da1f2'}>
            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
          </svg>
        );

      case 'Youtube':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#ff0000'}>
            <path d="M21.58 7.19a2.76 2.76 0 0 0-1.94-1.96C17.93 4.75 12 4.75 12 4.75s-5.93 0-7.64.48A2.76 2.76 0 0 0 2.42 7.19 28.6 28.6 0 0 0 2 12c0 1.6.14 3.2.42 4.81.28.98 1.05 1.76 1.94 1.96 1.71.48 7.64.48 7.64.48s5.93 0 7.64-.48a2.76 2.76 0 0 0 1.94-1.96c.28-1.61.42-3.21.42-4.81s-.14-3.2-.42-4.81zM10 15V9l5.2 3L10 15z" />
          </svg>
        );

      case 'Linkedin':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0a66c2'}>
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8m-1.4 9.74h2.79v-8.37H5.06v8.37z" />
          </svg>
        );

      case 'Tiktok':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0f172a'}>
            <path d="M12.53 2c.07 1.55.74 3.01 1.88 4.09 1.15 1.08 2.65 1.68 4.22 1.68v3.2a7.35 7.35 0 0 1-3.63-1.02v6.52a5.47 5.47 0 1 1-5.47-5.47c.36 0 .72.04 1.07.11v3.31a2.27 2.27 0 1 0 1.2 2.05V2h.73z" />
          </svg>
        );

      case 'Telegram':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#229ed9'}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
          </svg>
        );

      case 'Spotify':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#1ed760'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.4 9.6a7.92 7.92 0 0 1 9.4-.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7.8 12.2a6.3 6.3 0 0 1 7.6-.3" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8.2 14.8a4.8 4.8 0 0 1 5.8-.2" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        );

      case 'Soundcloud':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#ff5500'}>
            <path d="M18.5 10c-.3 0-.6.04-.9.1A5.5 5.5 0 0 0 7 14.5c0 .3.03.6.08.9A3.5 3.5 0 0 0 9.5 19h9a3.5 3.5 0 0 0 0-7c0-.1-.01-.2-.01-.3 0-.9-.3-1.7-.9-2.3a2.4 2.4 0 0 0-1.5-.7c-.2 0-.4.01-.5.03L18.5 10z" />
          </svg>
        );

      case 'Twitch':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#9146ff'}>
            <path d="M4.5 3L3 6.5V19h4.5v3l3-3H15l6-6V3H4.5zm14 9.5l-3 3h-3.5l-2 2v-2h-3V5h11.5v7.5zM14 7.5h2V12h-2V7.5zm-4.5 0h2V12h-2V7.5z" />
          </svg>
        );

      case 'Discord':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#5865f2'}>
            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.02.02.05.03.08.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
          </svg>
        );

      case 'Tumblr':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#35465c'}>
            <path d="M14.5 19c-1.8 0-3-.9-3-2.8V11H9V8.6c2.1-.6 2.9-2.4 3-4.6h2.5V8h3v3h-3v5c0 .6.4 1 1.2 1h1.8V19h-3z" />
          </svg>
        );

      case 'Kwai':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#ff5722'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 8l8 4-8 4V8z" fill="#ffffff" />
          </svg>
        );

      case 'Reddit':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#ff4500'}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="9" cy="12" r="1.5" fill="#ffffff" />
            <circle cx="15" cy="12" r="1.5" fill="#ffffff" />
            <path d="M9.5 15.5c1 .8 4 .8 5 0" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'Deezer':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#00c7f2'}>
            <rect x="4" y="14" width="2" height="6" rx="1" />
            <rect x="8" y="10" width="2" height="10" rx="1" />
            <rect x="12" y="6" width="2" height="14" rx="1" />
            <rect x="16" y="11" width="2" height="9" rx="1" />
            <rect x="20" y="15" width="2" height="5" rx="1" />
          </svg>
        );

      case 'Clubhouse':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#f59e0b'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7c-2 0-3 1.5-3 3.5 0 2.5 3 5.5 3 5.5s3-3 3-5.5C15 8.5 14 7 12 7z" fill="#ffffff" />
          </svg>
        );

      case 'Dribbble':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#ffffff' : '#ea4c89'} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94M21.75 12.84c-6.62-1.41-12.14 1-15.38 6.64M8.53 2.74c3.48 4.67 4.93 10.38 4.93 18.52" />
          </svg>
        );

      case 'Binance Square':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#f0b90b'}>
            <path d="M12 2l3.5 3.5L8.5 12 5 8.5 12 2zm0 20l-3.5-3.5L15.5 12l3.5 3.5L12 22zm-7-10l3.5-3.5 3.5 3.5-3.5 3.5L5 12zm14 0l-3.5-3.5 3.5-3.5 3.5 3.5-3.5 3.5z" />
          </svg>
        );

      case 'BlueSky':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0285ff'}>
            <path d="M12 10.8c-1.8-3.6-5-5.8-8-5.8C2 5 1 7 1 9c0 4 4.5 9 11 13 6.5-4 11-9 11-13 0-2-1-4-3-4-3 0-6.2 2.2-8 5.8z" />
          </svg>
        );

      case 'Boomplay':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#e11d48'}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="#ffffff" />
          </svg>
        );

      case 'Kick':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#53fc18'}>
            <rect x="3" y="3" width="18" height="18" rx="4" fill={isActive ? '#ffffff' : '#0f172a'} />
            <path d="M8 6h3v4.5l3.5-4.5H18l-4.5 5.5L18 18h-3.5L11 13.5V18H8V6z" fill={isActive ? '#0f172a' : '#53fc18'} />
          </svg>
        );

      case 'Pinterest':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#bd081c'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6a5 5 0 0 0-4.9 6c0 1.2.6 2.2 1.6 2.6.2.1.3 0 .3-.2l.2-.7c0-.1 0-.2-.1-.3-.3-.4-.5-1-.5-1.7 0-2.1 1.6-4 4-4 2.2 0 3.4 1.3 3.4 3.1 0 2.3-1 4.3-2.6 4.3-.8 0-1.5-.7-1.3-1.6l.6-2.4c.2-.6-.2-1.2-.8-1.2-.6 0-1.1.6-1.1 1.5 0 .6.2 1 .2 1l-1 4.2c-.3 1.2 0 2.6 0 2.7.1 0 .2 0 .2-.1.2-.3 1.6-2 1.8-2.7l.4-1.5c.3.5 1.1 1 2 1 2.6 0 4.4-2.4 4.4-5.6C18.6 9 15.7 6 12 6z" fill="#ffffff" />
          </svg>
        );

      case 'Vimeo':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#1ab7ea'}>
            <path d="M22 6.5c-.1 2.3-1.7 5.4-4.8 9.3C14 19.8 11.4 21.8 9.3 21.8c-1.3 0-2.4-1.2-3.3-3.6L4.2 11c-.5-1.8-1-2.7-1.6-2.7-.1 0-.6.3-1.4.8L0 7.8c1.3-1.1 2.6-2.3 3.9-3.4 1.8-1.5 3.1-2.3 4-2.3 2.1 0 3.3 1.4 3.7 4.3.4 2.9.7 4.7.9 5.4.6 2.8 1.4 4.2 2.2 4.2.7 0 1.6-.9 2.7-2.7 1.1-1.8 1.7-3.2 1.8-4.2.1-1.7-.5-2.5-1.8-2.5-.6 0-1.3.1-2 .4 1.3-4.2 3.8-6.2 7.5-6.2 2.7 0 3.9 1.8 3.1 5.7z" />
          </svg>
        );

      case 'VK':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0077ff'}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12.7 15.6h1.2s.4 0 .5-.2c.2-.2.2-.6.2-.6s0-1.7.8-2c.8-.2 1.8 1.6 2.8 2.3.8.5 1.4.4 1.4.4l2.8-.04s1.5-.1.8-1.3c-.1-.1-.4-.8-2-2.3-1.7-1.6-1.5-1.3.6-4.1 1.3-1.7 1.8-2.7 1.6-3.2-.2-.5-1.3-.4-1.3-.4l-3.2.02s-.2 0-.4.1c-.2.1-.3.3-.3.3s-.5 1.3-1.2 2.4c-1.4 2.4-2 2.5-2.2 2.4-.6-.2-.4-1-.4-3.1 0-2.4.4-3.4-.7-3.7-.4-.1-.7-.2-1.7-.2-1.3 0-2.4 0-3 .3-.4.2-.7.6-.5.6.2 0 .7.1.9.4.4.5.4 1.7.4 1.7s.2 2.8-.5 3.2c-.5.2-1.1-.3-2.5-2.4-.7-1.1-1.2-2.3-1.2-2.3s-.1-.2-.3-.3c-.2-.1-.5-.2-.5-.2L5.2 7.7s-.4 0-.6.2c-.2.2 0 .6 0 .6s2.3 5.4 4.9 8.1c2.4 2.5 5.1 2.4 5.1 2.4l1.1-.04z" fill="#ffffff" />
          </svg>
        );

      case 'Dailymotion':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0066dc'}>
            <circle cx="12" cy="12" r="10" />
            <text x="12" y="16" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">d</text>
          </svg>
        );

      case 'Mixcloud':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#5000ff'}>
            <path d="M19 12c-.2 0-.5.03-.7.08A4.5 4.5 0 0 0 9.5 9c-.3 0-.6.03-.9.1A4.5 4.5 0 0 0 4 13.5 4.5 4.5 0 0 0 8.5 18h10.5a3.5 3.5 0 0 0 0-7z" />
          </svg>
        );

      case 'Shazam':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0088ff'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M14.5 9.5a3 3 0 0 0-4.2 0l-2.1 2.1a3 3 0 1 0 4.2 4.2l.7-.7" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      case 'Trovo':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#19d776'}>
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <circle cx="9" cy="12" r="1.5" fill="#ffffff" />
            <circle cx="15" cy="12" r="1.5" fill="#ffffff" />
          </svg>
        );

      case 'Rumble':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#85c742'}>
            <rect x="3" y="5" width="18" height="14" rx="4" />
            <path d="M10 8l5 4-5 4V8z" fill="#ffffff" />
          </svg>
        );

      case 'LoyalFans':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#162399'}>
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <text x="12" y="15" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">LF</text>
          </svg>
        );

      case 'FanCentro':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#0055ff'}>
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <path d="M10 8l5 4-5 4V8z" fill="#ffffff" />
          </svg>
        );

      case 'FanVue':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#7c3aed'}>
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <text x="12" y="15" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">FV</text>
          </svg>
        );

      case 'Quora':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#b92b27'}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <text x="12" y="16" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="serif">Q</text>
          </svg>
        );

      case 'Rutube':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#002b7f'}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <text x="12" y="15" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">R</text>
          </svg>
        );

      case 'Apple Music':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#fc3c44'}>
            <circle cx="12" cy="12" r="10" />
            <path d="M15 8v5.5a2 2 0 1 1-1.5-1.9V9.5l-4 1V14a2 2 0 1 1-1.5-1.9V8.5l7-1.5z" fill="#ffffff" />
          </svg>
        );

      case 'Medium':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#000000'}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <text x="12" y="16" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="serif">M</text>
          </svg>
        );

      case 'Website Traffic':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#ffffff' : '#2563eb'} strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18" />
          </svg>
        );

      case 'Mobile Traffic':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isActive ? '#ffffff' : '#162399'}>
            <rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke={isActive ? '#ffffff' : '#162399'} strokeWidth="2" />
            <circle cx="12" cy="18" r="1" />
          </svg>
        );

      default:
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#ffffff' : '#64748b'} strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        );
    }
  };

  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Allow horizontal mousewheel scrolling for fast, intuitive desktop browsing
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const renderButton = (platform: string, isWide = false) => {
    const isActive = selectedPlatform.toLowerCase() === platform.toLowerCase();
    const btnHeight = isMobile ? 38 : 42;
    const btnPadding = isMobile ? '6px 14px' : isWide ? '10px 24px' : '9px 16px';
    const btnFontSize = isMobile ? '0.82rem' : isWide ? '0.90rem' : '0.86rem';

    return (
      <button
        key={platform}
        type="button"
        className={`platform-pill-btn ${isActive ? 'active' : ''} ${isWide ? 'wide' : ''}`}
        onClick={() => onSelectPlatform(platform)}
        title={platform}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? 6 : 8,
          padding: btnPadding,
          height: btnHeight,
          minHeight: btnHeight,
          borderRadius: 8,
          background: isActive ? '#162399' : '#ffffff',
          color: isActive ? '#ffffff' : '#1e293b',
          border: `1.5px solid ${isActive ? '#162399' : '#e2e8f0'}`,
          fontWeight: isActive ? 700 : 600,
          fontSize: btnFontSize,
          letterSpacing: '-0.1px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: isActive
            ? '0 3px 10px rgba(22, 35, 153, 0.28)'
            : '0 1px 3px rgba(0, 20, 80, 0.04)',
          transition: 'all 0.15s ease',
          flex: isWide && !isMobile ? '1 1 0' : '0 0 auto',
          minWidth: isWide && !isMobile ? '180px' : 'max-content',
        }}
      >
        {getPlatformIcon(platform, isActive)}
        <span>{platform}</span>
      </button>
    );
  };

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      className="platform-bar-scroll"
      style={{
        overflowX: 'auto',
        marginBottom: isMobile ? 14 : 20,
        paddingBottom: 4,
        WebkitOverflowScrolling: 'touch',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {isMobile ? (
        /* Mobile Single Sleek Horizontal Swipe Row */
        <div className="platform-mobile-row">
          {ALL_PLATFORMS.map((p) => renderButton(p, false))}
        </div>
      ) : (
        /* Desktop 3-Row Layout */
        <div className="platform-desktop-rows">
          {/* Row 1: 17 items */}
          <div className="platform-row">
            {PLATFORM_ROW_1.map((p) => renderButton(p, false))}
          </div>

          {/* Row 2: 17 items */}
          <div className="platform-row">
            {PLATFORM_ROW_2.map((p) => renderButton(p, false))}
          </div>

          {/* Row 3: 5 wide-spanning items */}
          <div className="platform-row platform-row-wide">
            {PLATFORM_ROW_3.map((p) => renderButton(p, true))}
          </div>
        </div>
      )}
    </div>
  );
};
