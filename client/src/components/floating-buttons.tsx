import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle } from "lucide-react";

interface FloatingButtonsProps {
  onBuyNowClick: () => void;
}

export default function FloatingButtons({ onBuyNowClick }: FloatingButtonsProps) {
  const handleWhatsAppClick = () => {
  const phoneNumber = "917801901855"; // Updated contact & WhatsApp number
    const message = "Hi! I'm interested in Cokha energy bars. Could you please help me with more information?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return React.createElement(
    'div',
    { className: 'fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4' },
    [
      React.createElement(
        Button,
        {
          key: 'wa',
            'aria-label': 'Chat on WhatsApp',
          onClick: handleWhatsAppClick,
          className: 'bg-green-500 text-white hover:bg-green-600 transform hover:scale-110 transition-all p-4 rounded-full shadow-lg',
          size: 'icon'
        },
        React.createElement(MessageCircle, { className: 'h-6 w-6' })
      ),
      React.createElement(
        Button,
        {
          key: 'buy',
          'aria-label': 'Buy Now',
          onClick: onBuyNowClick,
          className: 'bg-[#ff7a00] text-white font-semibold px-6 py-3 rounded-full shadow-lg transform hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff7a00] focus:outline-none'
        },
        [
          React.createElement(ShoppingCart, { key: 'icon', className: 'mr-2 h-4 w-4' }),
          'Buy Now'
        ]
      )
    ]
  );
}
