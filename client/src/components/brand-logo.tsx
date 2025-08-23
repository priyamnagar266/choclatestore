import React from 'react';
import localLogo from '@/components/Assets/websitelogo.png';

interface BrandLogoProps {
  size?: 'md' | 'lg';
  className?: string;
  shadow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '', shadow = true }) => {
  // Base heights kept within nav (64px) but we scale image visually
  const baseH = size === 'lg' ? 'h-20' : 'h-20'; // still <= nav height
  const scale = size === 'lg' ? 'scale-[1.18]' : 'scale-[1.12]';
  return React.createElement('div', {
      className: `relative ${baseH} flex items-center justify-center -my-1` // slight negative margin to center after scale
    },
    React.createElement('img', {
      src: localLogo,
      alt: 'Cokha',
      draggable: false,
      className: `${baseH} w-auto origin-center ${scale} select-none object-contain ${shadow ? 'drop-shadow-sm' : ''} ${className}`
    })
  );
};

export default BrandLogo;
