import React from 'react';
import { Globe, Video, Send, Music2, Camera, Share2, Tv, MessageSquare, Briefcase } from 'lucide-react';

interface PlatformFilterProps {
  selectedPlatform: string;
  onSelect: (platform: string) => void;
  platforms: string[];
}

export const PlatformFilter: React.FC<PlatformFilterProps> = ({
  selectedPlatform,
  onSelect,
  platforms,
}) => {
  const getIcon = (platform: string) => {
    switch (platform) {
      case 'YouTube':
        return <Video size={16} color="#ef4444" />;
      case 'Telegram':
        return <Send size={15} color="#38bdf8" />;
      case 'TikTok':
        return <Music2 size={16} color="#06b6d4" />;
      case 'Instagram':
        return <Camera size={16} color="#ec4899" />;
      case 'Twitter':
        return <Share2 size={15} color="#38bdf8" />;
      case 'Facebook':
        return <Share2 size={16} color="#3b82f6" />;
      case 'Spotify':
        return <Music2 size={16} color="#10b981" />;
      case 'Twitch':
        return <Tv size={16} color="#a855f7" />;
      case 'Discord':
        return <MessageSquare size={16} color="#818cf8" />;
      case 'LinkedIn':
        return <Briefcase size={16} color="#0284c7" />;
      default:
        return <Globe size={16} color="var(--text-muted)" />;
    }
  };

  const defaultList = ['All', 'YouTube', 'Telegram', 'TikTok', 'Instagram', 'Twitter', 'Spotify', 'Facebook', 'Twitch', 'LinkedIn'];
  const displayPlatforms = platforms.length > 0 ? ['All', ...platforms.filter(p => p !== 'All')] : defaultList;

  return (
    <div id="platform-filters" className="platform-tabs-wrapper">
      {displayPlatforms.map((platform) => {
        const isActive = selectedPlatform.toLowerCase() === platform.toLowerCase();
        return (
          <button
            key={platform}
            className={`platform-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(platform)}
          >
            {getIcon(platform)}
            <span>{platform}</span>
          </button>
        );
      })}
    </div>
  );
};
