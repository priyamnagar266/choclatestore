export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantLabel?: string; // optional variant reference
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

export const calculateItemCount = (items: CartItem[]): number => {
  return items.reduce((count, item) => count + item.quantity, 0);
};

// ...existing code...
export const formatPrice = (price: number | string | undefined | null): string => {
  const num = typeof price === "number" ? price : Number(price);
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
};

export const getBenefitBadgeColor = (benefit: string): string => {
  const benefitColors: Record<string, string> = {
    'Enhanced Focus': 'bg-green-100 text-green-800',
    'Brain Health': 'bg-blue-100 text-blue-800',
    'Mood Booster': 'bg-purple-100 text-purple-800',
    'Stress Relief': 'bg-pink-100 text-pink-800',
    'Sustained Energy': 'bg-yellow-100 text-yellow-800',
    'Pre-Workout': 'bg-orange-100 text-orange-800',
    'Memory Boost': 'bg-indigo-100 text-indigo-800',
    'Cognitive Health': 'bg-yellow-100 text-yellow-800',
    'Antioxidants': 'bg-red-100 text-red-800',
    'Immunity': 'bg-purple-100 text-purple-800',
    'High Protein': 'bg-green-100 text-green-800',
    'Post-Workout': 'bg-blue-100 text-blue-800',
    'Digestive Health': 'bg-green-100 text-green-800',
    'Gut Friendly': 'bg-orange-100 text-orange-800',
    'Relaxation': 'bg-purple-100 text-purple-800',
    'Sleep Support': 'bg-indigo-100 text-indigo-800',
  };
  
  return benefitColors[benefit] || 'bg-gray-100 text-gray-800';
};
