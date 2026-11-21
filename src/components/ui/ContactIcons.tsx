'use client';

import React from 'react';

interface ContactIconProps {
  className?: string;
}

/**
 * Clean industrial WhatsApp speech-bubble phone glyph (SVG).
 */
export function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: ContactIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.55 7.47L3 20.5l1.53-5.22A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.5 9.2c.25-.45.55-.46.8-.45h.45c.15 0 .35.05.45.3l.65 1.5c.08.2.03.4-.1.55l-.45.5c-.12.14-.14.32-.04.48a7.4 7.4 0 0 0 2.58 2.38c.17.1.36.07.49-.07l.48-.52c.15-.16.36-.2.55-.11l1.46.7c.24.11.33.32.28.54-.12.56-.68 1.24-1.45 1.38-.82.15-2.32-.12-4.2-1.76-1.88-1.64-2.52-3.27-2.4-4.1.07-.45.32-.95.9-1.44Z" />
    </svg>
  );
}

/**
 * Clean industrial Email envelope glyph (SVG).
 */
export function EmailIcon({ className = 'w-3.5 h-3.5' }: ContactIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
