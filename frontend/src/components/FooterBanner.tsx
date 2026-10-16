import React from 'react';
import { Mail } from 'lucide-react';

interface FooterBannerProps {
  onOpenTicket: () => void;
}

export const FooterBanner: React.FC<FooterBannerProps> = ({ onOpenTicket }) => {
  return (
    <footer className="footer-banner">
      <div>
        © Copyright 2026. All Rights Reserved by DigitalSmm.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mail size={15} color="#93c5fd" />
          <span>contact@digitalsmm.com</span>
        </div>
        <span>OR</span>
        <button className="footer-btn-ticket" onClick={onOpenTicket}>
          Open a ticket
        </button>
      </div>
    </footer>
  );
};
