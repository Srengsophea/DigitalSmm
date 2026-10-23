import React, { useState } from 'react';
import { User } from '../context/AuthContext';
import { Camera } from 'lucide-react';

interface UserAvatarProps {
  user?: User | null;
  username?: string;
  avatar?: string;
  customAvatar?: string;
  googlePicture?: string;
  size?: number;
  fontSize?: string;
  className?: string;
  style?: React.CSSProperties;
  showEditOverlay?: boolean;
  onEditClick?: () => void;
  title?: string;
}

const GRADIENTS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Royal Blue
  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', // Sky Blue
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Violet
  'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', // Rose Pink
  'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Sunset Orange
  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Vibrant Cyan
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
];

function getGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  username,
  avatar,
  customAvatar,
  googlePicture,
  size = 44,
  fontSize,
  className = '',
  style,
  showEditOverlay = false,
  onEditClick,
  title,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Hierarchy: Manual custom avatar > general avatar > Google picture
  const activeImage =
    customAvatar ||
    user?.customAvatar ||
    avatar ||
    user?.avatar ||
    googlePicture ||
    user?.googlePicture;

  const rawName = username || user?.username || user?.email || '';
  const isGuest = !user && !rawName;
  const firstChar = rawName ? rawName.trim().charAt(0).toUpperCase() : 'G';
  const autoFontSize = fontSize || `${Math.round(size * 0.44)}px`;

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    cursor: onEditClick ? 'pointer' : undefined,
    ...style,
  };

  const hasValidImage = Boolean(activeImage && !imgError);

  return (
    <div
      className={`user-avatar-wrapper ${className}`}
      style={containerStyle}
      title={title || (rawName ? `Signed in as ${rawName}` : 'Guest')}
      onClick={onEditClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hasValidImage ? (
        <img
          src={activeImage}
          alt={rawName || 'User Avatar'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : isGuest ? (
        /* Guest Default Icon */
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      ) : (
        /* First Character Initial Avatar */
        <div
          style={{
            width: '100%',
            height: '100%',
            background: getGradient(rawName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: autoFontSize,
            letterSpacing: '-0.5px',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {firstChar}
        </div>
      )}

      {/* Hover Camera Overlay if editable */}
      {showEditOverlay && isHovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            transition: 'opacity 0.2s ease',
            zIndex: 3,
          }}
        >
          <Camera size={Math.max(14, Math.round(size * 0.32))} />
        </div>
      )}
    </div>
  );
};
