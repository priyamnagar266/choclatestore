// Removed react-router-dom Link, use Wouter navigation instead
import React from 'react';
import { useAuth } from "@/components/auth-context";
import { Helmet } from 'react-helmet-async';
// Import media assets so they are processed by Vite during build (fixes deployment path issues)
import productVideo from "@/components/Assets/20250721_111849_0001.mp4";
import heroVideo from "@/components/Assets/herosectionvideo.mp4";

import { useState, useEffect, useRef } from "react";
import BestsellerPopup from "@/components/BestsellerPopup";
// Demo data for popup (replace with real customer data if available)
const DEMO_LOCATIONS = [
  "Nilanjana from Morepukur, Rishra",
  "Amit from Mumbai",
  "Priya from Delhi",
  "Rahul from Bangalore",
  "Sneha from Kolkata",
  "Vikas from Pune",
  "Anita from Hyderabad"
];
import { useCart } from "@/context/CartContext";
import { useReveal } from "@/hooks/useReveal";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import Navigation from "@/components/navigation";
import ProductCard from "@/components/product-card";
import FloatingButtons from "@/components/floating-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CartSheet from "@/components/cart-sheet";
import { Play, Star, Phone, Mail, MapPin, Clock, MessageCircle, Instagram, X, Minus, Plus, Trash2 } from "lucide-react";

import type { Product } from "@shared/schema";
import { CartItem, calculateCartTotal, calculateItemCount, formatPrice } from "@/lib/products";
import { insertOrderSchema, insertContactSchema, insertNewsletterSchema } from "@shared/schema";
// Removed Node 'inspector' import (not needed in browser)

const orderFormSchema = insertOrderSchema.extend({
  items: z.string().min(1, "Please select at least one product"),
  customerName: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must not exceed 50 characters"),
  customerEmail: z.string().email("Please enter a valid email address"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must not exceed 15 digits"),
  address: z.string().min(10, "Address must be at least 10 characters").max(200, "Address must not exceed 200 characters"),
  city: z.string().min(2, "City must be at least 2 characters").max(50, "City must not exceed 50 characters"),
  pincode: z.string().min(6, "PIN code must be at least 6 digits").max(6, "PIN code must be 6 digits"),
});

const contactFormSchema = insertContactSchema;
const newsletterFormSchema = insertNewsletterSchema;

export default function Home() {

  // Trigger reveal animations
  useReveal();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  // Helper to resolve cart key for current user
  const resolveCartKey = (u = user) => u ? `cart_${u.id}` : 'cart_guest';
  const queryClient = useQueryClient();
  // Use global cart context
  const { cart, setCart, showCart, closeCart, clearCart, addToCart: contextAddToCart } = useCart();
  // Mobile contact form collapse state
  const [mobileFormOpen, setMobileFormOpen] = useState(false);


  // Removed duplicate cart persistence (handled centrally in CartContext)

  // React to cart removal from other tabs / payment page redirect
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('cart_') || e.key === 'cart_guest') {
        if (e.newValue === null) {
          // Cart cleared
            setCart([]);
        } else if (e.key === resolveCartKey()) {
          try { setCart(e.newValue ? JSON.parse(e.newValue) : []); } catch { setCart([]); }
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [user]);
  
  // Order form state
  // Use string keys because cart item ids (and product composite keys with variants) are strings
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

  // Direct products fetch (no localStorage caching; always server data)
  const { data: products = [], isLoading: productsLoading, isFetching: productsFetching } = useQuery<Product[]>({
    queryKey: ['products-live'],
    queryFn: async () => {
      // Fast path: static hashed manifest
      try {
        const manifestRes = await fetch('/products-manifest.json', { cache: 'no-cache' });
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
            if (manifest?.current) {
              const hashed = await fetch('/' + manifest.current, { cache: 'no-cache' });
              if (hashed.ok) {
                const staticData = await hashed.json();
                if (Array.isArray(staticData) && staticData.length) return staticData;
              }
            }
        }
      } catch {}
      // Legacy static
      try {
        const r = await fetch('/products.json', { cache: 'no-cache' });
        if (r.ok) { const legacy = await r.json(); if(Array.isArray(legacy) && legacy.length) return legacy; }
      } catch {}
      // Slow path: live API (may cold-start backend). Use timeout safeguard.
      try {
        const controller = new AbortController();
        const t = setTimeout(()=> controller.abort(), 2500);
        const res = await apiFetch('/api/products', { headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal });
        clearTimeout(t);
        if(res.ok){ const live = await res.json(); if(Array.isArray(live)) return live; }
      } catch {}
      return [] as Product[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Background refresh from live API to update after static render (does not block initial paint)
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        const res = await apiFetch('/api/products', { headers:{ 'Cache-Control':'no-cache' } });
        if(res.ok){
          const live = await res.json();
          if(!cancelled && Array.isArray(live) && live.length){
            queryClient.setQueryData(['products-live'], live);
          }
        }
      } catch{}
    })();
    return ()=>{ cancelled = true; };
  }, [queryClient]);

  // Expose products array globally for modal suggestion reuse (lightweight, read-only)
  useEffect(()=>{ (window as any).__ALL_PRODUCTS = products; try { window.dispatchEvent(new CustomEvent('products-ready')); } catch {} }, [products]);

  // Determine bestsellers (admin curated). Fallback to first 4 if none flagged.
  const flagged = products.filter((p: any)=> p.bestseller);
  const bestsellers = (flagged.length ? flagged : products).slice(0,4);

  // Bestseller popup state (must be after bestsellers definition)
  const [popupIdx, setPopupIdx] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!bestsellers.length) return;
    setShowPopup(true);
    let hideTimeout: NodeJS.Timeout;
    const interval = setInterval(() => {
      setShowPopup(true);
      hideTimeout = setTimeout(() => setShowPopup(false), 2000); // Show for 2s
      setTimeout(() => {
        setPopupIdx((i) => (i + 1) % bestsellers.length);
      }, 12000); // Move to next after 12s
    }, 12000);
    // Initial hide after 2s
    hideTimeout = setTimeout(() => setShowPopup(false), 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(hideTimeout);
    };
  }, [bestsellers.length]);

  // Render popup
  const popupProduct = bestsellers[popupIdx];
  const popupLocation = DEMO_LOCATIONS[popupIdx % DEMO_LOCATIONS.length];

  // Forms
  const orderForm = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      address: "",
      city: "",
      pincode: "",
      items: "",
      subtotal: "0",
      deliveryCharges: "50",
      total: "50",
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const newsletterForm = useForm({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Testimonials (dynamic - admin editable)
  const fallbackTestimonials = [
    { text:"These energy bars have completely changed my afternoon slump. The Focus Boost bar gives me 4+ hours of sustained mental clarity without any crash!", name:"Priya Sharma", role:"Software Engineer", rating:5 },
    { text:"As a fitness enthusiast, I love the Protein Power bar. It's perfectly balanced nutrition with authentic Indian flavors. Finally, a healthy snack that tastes amazing!", name:"Rahul Kumar", role:"Fitness Coach", rating:5 },
    { text:"The Mood Uplift bar has become my daily stress-buster. I can feel the difference in my mood and energy levels. These are not just snacks, they're wellness in a bar!", name:"Anita Desai", role:"Marketing Executive", rating:5 },
  ];
  const [testimonials, setTestimonials] = useState<any[] | null>(null);
  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch('/api/testimonials');
        if(r.ok){
          const data = await r.json();
          if(Array.isArray(data) && data.length) setTestimonials(data);
        }
      } catch {}
    })();
  },[]);

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => apiRequest("POST", "/api/orders", orderData),
    onSuccess: async (response) => {
      try {
        const order = await response.json();
        if (!order || (!order._id && !order.orderId)) {
          throw new Error("Invalid order response from server. Please try again.");
        }
        // Always use backend order object (with _id) for PATCH after payment
        // Merge cart and totals into the order object
        const cartTotal = calculateCartTotal(cart);
        const orderWithCart = {
          ...order,
          items: JSON.stringify(cart),
          subtotal: cartTotal.toFixed(2),
          deliveryCharges: "50.00",
          total: (cartTotal + 50).toFixed(2)
        };
        // Save ONLY backend order _id as patchOrderId for later PATCH
        orderWithCart.patchOrderId = order._id;
        localStorage.setItem('pendingOrder', JSON.stringify(orderWithCart));
        console.log('DEBUG pendingOrder:', orderWithCart); // Debug log
        setLocation('/delivery');
      } catch (error: any) {
        toast({
          title: "Order Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('DEBUG createOrderMutation error:', error); // Debug log
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (contactData: any) => apiRequest("POST", "/api/contacts", contactData),
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
      contactForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subscribeNewsletterMutation = useMutation({
    mutationFn: (newsletterData: any) => apiRequest("POST", "/api/newsletter", newsletterData),
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "You've been successfully subscribed to our newsletter.",
      });
      newsletterForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cart function (delegate to global context logic which supports variants)
  const addToCart = (p: any) => {
    contextAddToCart(p);
    toast({ title: 'Added to cart!', description: `${p.name}${p.variantLabel ? ' ('+p.variantLabel+')':''} has been added to your cart.` });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const updatedCart = prev.filter(item => item.id !== productId);
      try { localStorage.setItem(resolveCartKey(), JSON.stringify(updatedCart)); } catch {}
      return updatedCart;
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => {
      const updatedCart = prev.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      );
      try { localStorage.setItem(resolveCartKey(), JSON.stringify(updatedCart)); } catch {}
      return updatedCart;
    });
  };

  const syncCartToOrder = () => {
    // Sync cart items to order quantities
  const newOrderQuantities: Record<string, number> = {};
    cart.forEach(item => {
  newOrderQuantities[String(item.id)] = item.quantity;
    });
    setOrderQuantities(newOrderQuantities);
    
    // Scroll to order section
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  };


  const updateQuantity = (productId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    
    // Update order quantities
    setOrderQuantities(prev => ({
      ...prev,
      [productId]: newQuantity,
    }));
    
    // Sync back to cart
  const product = products.find(p => String(p.id) === String(productId));
    if (product && newQuantity > 0) {
      setCart(prev => {
        const existingItem = prev.find(item => item.id === productId);
        if (existingItem) {
          return prev.map(item =>
            item.id === productId
              ? { ...item, quantity: newQuantity }
              : item
          );
        } else {
          return [...prev, {
            id: product.id as any,
            name: product.name,
            price: product.price,
            quantity: newQuantity,
            image: product.image,
          }];
        }
      });
    } else if (newQuantity === 0) {
      // Remove from cart if quantity is 0
  setCart(prev => prev.filter(item => item.id !== productId));
    }
  };

  const getOrderItems = () => {
    return Object.entries(orderQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => {
  const product = products.find(p => String(p.id) === String(productId));
        return product ? {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
        } : null;
      })
      .filter(Boolean);
  };

  const calculateOrderTotal = () => {
    const items = getOrderItems();
    const subtotal = items.reduce((sum, item) => sum + (item!.price * item!.quantity), 0);
    const deliveryCharges = 50;
    return { subtotal, deliveryCharges, total: subtotal + deliveryCharges };
  };

  // Update form totals when quantities change
  useEffect(() => {
    const { subtotal, deliveryCharges, total } = calculateOrderTotal();
    orderForm.setValue("subtotal", subtotal.toString());
    orderForm.setValue("total", total.toString());
    orderForm.setValue("items", JSON.stringify(getOrderItems()));
  }, [orderQuantities, products]);

  const handleOrderSubmit = (data: any) => {
    const orderItems = getOrderItems();
    if (orderItems.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to order.",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate(data);
  };

  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToOrder = () => {
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Typewriter effect for hero subtitle
  const fullSubtitle = 'Bold on nutrition, Big on taste!';
  const [subtitleText, setSubtitleText] = useState('');
  useEffect(() => {
    let i = 0;
    const speed = 35; // ms per character
    const interval = setInterval(() => {
      i++;
      setSubtitleText(fullSubtitle.slice(0, i));
      if (i >= fullSubtitle.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, []);

  // Products now render all at once; show a small inline loading state only if still fetching

  return React.createElement('div', { className: 'min-h-screen bg-white' }, [
    showPopup && popupProduct && React.createElement(BestsellerPopup, {
      key: 'popup',
      image: popupProduct.image || '/logo.jpg',
      name: popupProduct.name,
      ctaText: 'Try it now',
      onClose: () => setShowPopup(false)
    }),
    React.createElement(Helmet, { key: 'helmet' }, [
      React.createElement('title', { key: 't' }, 'Buy Premium Functional Chocolates Online | Cokha'),
      React.createElement('meta', { key: 'd', name: 'description', content: 'Shop handcrafted functional chocolates enriched with natural ingredients for mood, energy, focus and wellness.' }),
      React.createElement('meta', { key: 'k', name: 'keywords', content: 'functional chocolates,premium chocolates,handcrafted chocolate,energy bar,mood boosting chocolate,healthy dark chocolate,buy chocolates online' }),
      React.createElement('link', { key: 'c', rel: 'canonical', href: 'https://your-domain.com/' })
    ]),
    React.createElement('section', { key: 'hero', id: 'home', className: 'relative h-[70vh] min-h-[560px] w-full overflow-hidden anim-fade-in', 'data-anim': true }, [
      React.createElement('video', { key: 'v', className: 'absolute inset-0 w-full h-full object-cover', autoPlay: true, loop: true, muted: true, playsInline: true, preload: 'auto', src: productVideo }, 'Your browser does not support the video tag.'),
      React.createElement('div', { key: 'ov', className: 'absolute inset-0 bg-primary/55 backdrop-brightness-95' }),
      React.createElement('div', { key: 'hc', className: 'relative z-10 max-w-5xl mx-auto px-6 lg:px-8 h-full flex flex-col justify-center' }, [
        React.createElement('div', { key: 'inner', className: 'max-w-2xl' }, [
          React.createElement('h1', { key: 'h1', className: 'text-4xl lg:text-6xl font-bold leading-tight mb-6 drop-shadow-md hero-animate text-white' }, [
            React.createElement('span', { key: 's1', className: 'block' }, 'Bold On Nutrition,'),
            React.createElement('span', { key: 's2', className: 'block' }, 'Big On Taste!')
          ]),
          React.createElement('p', { key: 'p', className: 'text-lg lg:text-xl mb-8 text-white max-w-xl font-medium tracking-wide leading-snug' }, [
            React.createElement('span', { key: 'sp1' }, 'Energy Bars,'), React.createElement('br', { key: 'br1' }),
            React.createElement('span', { key: 'sp2' }, 'Couverture Chocolates'), React.createElement('br', { key: 'br2' }),
            React.createElement('span', { key: 'sp3', dangerouslySetInnerHTML: { __html: '&amp; Crisps' } })
          ]),
          React.createElement('div', { key: 'cta', className: 'flex flex-wrap gap-4' }, [
            React.createElement(Button, { key: 'shop', onClick: scrollToProducts, variant: 'cta', className: 'px-8 py-4 text-lg font-semibold rounded-xl' }, 'Shop Now')
          ])
        ])
      ]),
      React.createElement('div', { key: 'fade', className: 'pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/60 to-transparent' })
    ]),
    React.createElement('div', { key: 'marquee', className: 'marquee-wrapper bg-primary text-white py-3 border-y border-primary/30' }, [
      React.createElement('div', { key: 'rel', className: 'relative' }, [
        React.createElement('div', { key: 'track', className: 'marquee-track gap-16 px-8 font-semibold tracking-wide text-sm md:text-base' },
          Array.from({ length: 2 }).map((_, i) => React.createElement('div', { key: i, className: 'flex gap-16' }, [
            React.createElement('span', { key: 'm1' }, '100% ORGANIC'),
            React.createElement('span', { key: 'm2' }, 'SUGAR FREE'),
            React.createElement('span', { key: 'm3' }, 'NO PRESERVATIVES'),
            React.createElement('span', { key: 'm4' }, 'HAND CRAFTED'),
            React.createElement('span', { key: 'm5' }, 'ARTISAN ENERGY BARS')
          ]))
        ),
        React.createElement('div', { key: 'fade2', className: 'marquee-fade bg-gradient-to-r from-primary via-transparent to-primary opacity-20' })
      ])
    ]),
    React.createElement('section', { key: 'products-section', id: 'products', className: 'py-20 bg-neutral anim-fade-up', 'data-anim': true }, [
      React.createElement('div', { key: 'wrap', className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' }, [
        React.createElement('div', { key: 'head', className: 'text-center mb-12' }, [
          React.createElement('h2', { key: 'h2', className: 'text-4xl font-bold text-primary' }, 'Our Bestsellers'),
          React.createElement('p', { key: 'ph', className: 'text-gray-600 mt-2' }, 'Customer favorites crafted for performance and taste')
        ]),
        React.createElement('div', { key: 'grid', className: 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8' }, [
          ...(bestsellers.length > 0 ? bestsellers.map(p => React.createElement(ProductCard, { key: p.id, product: p, onAddToCart: addToCart, productsAll: products })) : []),
          ...(bestsellers.length === 0 && (productsLoading || productsFetching)
            ? Array.from({ length: 4 }).map((_, i) => React.createElement('div', { key: 'sk' + i, className: 'h-48 sm:h-56 bg-gray-100 rounded-lg animate-pulse col-span-1' }))
            : []),
          ...(bestsellers.length === 0 && !productsLoading && !productsFetching ? [React.createElement('div', { key: 'empty', className: 'col-span-full text-center text-sm text-muted-foreground py-8' }, 'No products available.')] : [])
        ]),
        products.length > 4 && React.createElement('div', { key: 'more', className: 'mt-12 text-center' }, [
          React.createElement(Button, { key: 'btn', onClick: () => setLocation('/products'), variant: 'cta', className: 'px-8 py-4 text-lg font-semibold rounded-xl' }, 'View All Products')
        ])
      ])
    ]),
    React.createElement(Sheet, { key: 'sheet', open: showCart, onOpenChange: (open: boolean) => { if (!open) closeCart(); } }, [
      React.createElement(SheetContent, { key: 'sheetc', side: 'right', className: 'w-full sm:max-w-lg' }, [
        React.createElement(CartSheet, { key: 'cart' })
      ])
    ])
  ]);
}

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
