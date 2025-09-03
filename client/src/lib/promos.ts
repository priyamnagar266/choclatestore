// Centralized promo / coupon logic
// Extend or replace as needed. Each promo returns a discount (in rupees) and flags.
import { CartItem } from './products';

export interface PromoResult {
  code: string;
  valid: boolean;
  message: string;
  discount: number; // currency amount to subtract from subtotal (not including shipping unless freeShipping true)
  freeShipping?: boolean; // when true deliveryCharges should become 0
  breakdown?: Record<string, any>;
}

export const KNOWN_PROMOS: Record<string, string> = {
  WELCOME10: 'Get 10% off on your first order',
  B2G1: 'Buy 2 Get 1 Free (cheapest free)',
  FLAT25: 'Flat ₹25 OFF on orders above ₹250'
};

export function evaluatePromo(codeRaw: string, cart: CartItem[]): PromoResult {
  const code = (codeRaw || '').trim().toUpperCase();
  if (!code) return { code, valid: false, message: 'Enter a promo code', discount: 0 };
  if (!cart || cart.length === 0) return { code, valid: false, message: 'Add items first', discount: 0 };
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!(code in KNOWN_PROMOS)) return { code, valid: false, message: 'Invalid code', discount: 0 };

  switch (code) {
    case 'WELCOME10': {
      const discount = Math.round(subtotal * 0.10);
      return { code, valid: true, message: '10% discount applied', discount };
    }
    case 'B2G1': {
      // Expand cart to array of {price, name, cartIdx, unitIdx}
      const expanded: { price: number; name: string; cartIdx: number; unitIdx: number }[] = [];
      cart.forEach((ci, cartIdx) => {
        for (let k = 0; k < ci.quantity; k++) {
          expanded.push({ price: ci.price, name: ci.name, cartIdx, unitIdx: k });
        }
      });
      expanded.sort((a, b) => a.price - b.price); // cheapest first
      const eligibleSets = Math.floor(expanded.length / 3);
      const freeItems = expanded.slice(0, eligibleSets);
      const discount = freeItems.reduce((s, v) => s + v.price, 0);
      const nextFree = 3 - (expanded.length % 3);
      let message = eligibleSets > 0
        ? `Buy 2 Get 1 applied (₹${discount} off${eligibleSets > 1 ? ' for ' + eligibleSets + ' free items' : ''})`
        : 'Add 3 items to get 1 free!';
      if (eligibleSets === 0 && expanded.length % 3 !== 0) {
        message += ` (Add ${nextFree} more for a free item)`;
      }
      return {
        code,
        valid: true,
        message,
        discount,
        breakdown: {
          eligibleSets,
          freeItems: freeItems.map(f => ({ name: f.name, price: f.price, cartIdx: f.cartIdx, unitIdx: f.unitIdx })),
          totalItems: expanded.length,
          nextFree: eligibleSets === 0 ? nextFree : 0
        }
      };
    }
    case 'FLAT25': {
      if (subtotal < 250) return { code, valid: false, message: 'Requires ₹250 subtotal', discount: 0 };
      return { code, valid: true, message: 'Flat ₹25 off applied', discount: 25 };
    }
    default:
      return { code, valid: false, message: 'Unsupported code', discount: 0 };
  }
}
