import React from "react";


interface BestsellerPopupProps {
  image: string;
  name: string;
  location: string;
  timeAgo?: string; // optional relative time string
  onClose: () => void;
}

export default function BestsellerPopup({ image, name, location, timeAgo, onClose }: BestsellerPopupProps) {
  return (
    <div
      className="fixed left-2 right-2 bottom-4 z-50 bg-[#14262e] text-white rounded-xl shadow-lg flex items-center gap-3 p-3 min-w-0 max-w-xs mx-auto animate-fade-in-up sm:left-4 sm:right-auto sm:bottom-8 sm:max-w-xs sm:p-4"
      style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)', width: '100%' }}
    >
      <img
        src={image}
        alt={name}
        className="w-12 h-12 rounded-full object-cover border-2 border-white bg-white sm:w-14 sm:h-14"
      />
      <div className="flex-1 min-w-0">
        <div className="font-heading text-sm sm:text-base font-bold text-[#ff3c3c] leading-tight break-words">
          {name}
        </div>
        <div className="text-xs sm:text-sm font-body text-white/90 mt-0.5 tracking-wide">
          Try this now
        </div>
      </div>
      <button
        onClick={onClose}
        className="ml-1 sm:ml-2 text-gray-400 hover:text-white focus:outline-none text-lg sm:text-base"
        aria-label="Close popup"
      >
        ✕
      </button>
    </div>
  );
}
