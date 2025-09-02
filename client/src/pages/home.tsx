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
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-live'],
    queryFn: async () => {
      // 1. Try live API first (ensures immediate reflection of bestseller/sale changes)
      try {
        const res = await apiFetch('/api/products', { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const live = await res.json();
          if (Array.isArray(live) && live.length) return live;
        }
      } catch {}
      // 2. Fallback: hashed static manifest
      try {
        const manifestRes = await fetch('/products-manifest.json', { cache: 'no-cache' });
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          if (manifest?.current) {
            const hashed = await fetch('/' + manifest.current, { cache: 'no-cache' });
            if (hashed.ok) return await hashed.json();
          }
        }
      } catch {}
      // 3. Legacy static file
      try {
        const r = await fetch('/products.json', { cache: 'no-cache' });
        if (r.ok) return await r.json();
      } catch {}
      return [] as Product[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

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

  return (
  <div className="min-h-screen bg-white">
    {showPopup && popupProduct && (
      <BestsellerPopup
        image={popupProduct.image || "/logo.jpg"}
        name={popupProduct.name}
        ctaText="Try it now"
        onClose={() => setShowPopup(false)}
      />
    )}
      <Helmet>
        <title>Buy Premium Functional Chocolates Online | Cokha</title>
        <meta name="description" content="Shop handcrafted functional chocolates enriched with natural ingredients for mood, energy, focus and wellness." />
        <meta name="keywords" content="functional chocolates,premium chocolates,handcrafted chocolate,energy bar,mood boosting chocolate,healthy dark chocolate,buy chocolates online" />
        <link rel="canonical" href="https://your-domain.com/" />
      </Helmet>
  {/* Navigation is now handled by Layout */}
      
      {/* Hero Section (Video Background) */}
      <section id="home" className="relative h-[70vh] min-h-[560px] w-full overflow-hidden anim-fade-in" data-anim>
        {/* Video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src={productVideo}
        >
          Your browser does not support the video tag.
        </video>
        {/* Translucent green overlay (lighter so video is visible) */}
        <div className="absolute inset-0 bg-primary/55 backdrop-brightness-95" />
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6 drop-shadow-md hero-animate text-white">
              <span className="block">Bold On Nutrition,</span>
              <span className="block">Big On Taste!</span>
            </h1>
            <p className="text-lg lg:text-xl mb-8 text-white max-w-xl font-medium tracking-wide leading-snug">
              <span>Energy Bars,</span><br />
              <span>Couverture Chocolates</span><br />
              <span>&amp; Crisps</span>
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={scrollToProducts} variant="cta" className="px-8 py-4 text-lg font-semibold rounded-xl">
                Shop Now
              </Button>
              {/* Removed View Benefits button per request */}
            </div>
          </div>
        </div>
        {/* Subtle gradient fade bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/60 to-transparent" />
      </section>

      {/* Marquee USP Bar */}
      <div className="marquee-wrapper bg-primary text-white py-3 border-y border-primary/30">
        <div className="relative">
          <div className="marquee-track gap-16 px-8 font-semibold tracking-wide text-sm md:text-base">
            {Array.from({length:2}).map((_,i)=>(
              <div key={i} className="flex gap-16">
                <span>100% ORGANIC</span>
                <span>SUGAR FREE</span>
                <span>NO PRESERVATIVES</span>
                <span>HAND CRAFTED</span>
                <span>ARTISAN ENERGY BARS</span>
              </div>
            ))}
          </div>
          <div className="marquee-fade bg-gradient-to-r from-primary via-transparent to-primary opacity-20" />
        </div>
      </div>

      {/* Products Section */}
  <section id="products" className="py-20 bg-neutral anim-fade-up" data-anim>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-primary">Our Bestsellers</h2>
            <p className="text-gray-600 mt-2">Customer favorites crafted for performance and taste</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {bestsellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
                productsAll={products}
              />
            ))}
            {bestsellers.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">No products available.</div>
            )}
          </div>

          {products.length > 4 && (
            <div className="mt-12 text-center">
              <Button
                onClick={() => setLocation('/products')}
                variant="cta"
                className="px-8 py-4 text-lg font-semibold rounded-xl"
              >
                View All Products
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Video Section */}
  <section className="py-20 bg-primary text-white anim-fade-up" data-anim>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">See How We Craft Excellence</h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Watch our artisans carefully blend ancient Indian superfoods with rich cocoa to create energy bars that nourish your mind and body.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                <video 
                  src={heroVideo}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="auto"
                  poster="https://i.postimg.cc/cLZtLg16/Gemini-Generated-Image-wv9jaswv9jaswv9j.png"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded">

                </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
  <section className="py-20 bg-white anim-fade-up" data-anim>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Real experiences from people who've transformed their energy and focus</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {(testimonials || fallbackTestimonials).map((testimonial, index) => (
              <Card key={index} className="bg-neutral p-8">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-white border border-neutral-300 flex items-center justify-center font-semibold mr-4 text-lg text-amber-500 shadow-sm select-none">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-primary">{testimonial.name}</div>
                      <div className="text-gray-500 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
  <section id="aboutus" className="py-20 bg-neutral anim-fade-up" data-anim>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-left md:text-justify">
            <h2 className="text-4xl font-bold text-primary mb-4">About Us</h2>
            <p className="text-xl text-gray-600 mb-6">Cokha Energy Foods is dedicated to crafting premium energy bars using ancient Indian superfoods and rich cocoa. Our mission is to fuel your mind, elevate your mood, and energize your life naturally. We believe in honest nutrition, authentic flavors, and wellness for everyone.</p>
            <div className="mt-8">
              <Button
                variant="cta"
                className="px-8 py-4 text-lg font-semibold rounded-xl shadow-md hover:bg-[#e58800] transition-colors"
                onClick={() => setLocation('/about')}
              >
                Learn About Us More
              </Button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <img src="https://i.postimg.cc/nLv7Jfq6/image.png" />
          </div>
        </div>
      </section>


      {/* Contact Section */}
  <section id="contact" className="py-20 bg-white anim-fade-up" data-anim>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">Get in Touch</h2>

          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Contact Information Card */}
            <Card className="bg-white h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-primary">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-white p-3 rounded-md"><MapPin className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-semibold text-primary">Address</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Rajasic Foods Pvt Ltd<br />
                      Nimbahera, Rajasthan<br />
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-white p-3 rounded-md"><Phone className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-semibold text-primary">Phone</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">+91 78019 01855</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-primary text-white p-3 rounded-md"><Mail className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-semibold text-primary">Email</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">info@rajasicfoods.com<br />orders@rajasicfoods.com</p>
                  </div>
                </div>
               
                <div className="p-4 whatsapp-gradient rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <MessageCircle className="h-6 w-6 mr-3 text-whatsapp-foreground" />
                    <div>
                      <h4 className="font-semibold">WhatsApp Support</h4>
                      <p className="text-whatsapp-foreground/85 text-xs">Get instant answers to your questions</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('https://wa.me/917801901855', '_blank')}
                    className="w-full whatsapp-gradient-inset-btn text-whatsapp-foreground h-9 text-sm border border-whatsapp-foreground/30 hover:border-whatsapp-foreground/50 transition-colors font-medium"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> Chat with Us on WhatsApp
                  </Button>
                </div>
                <div className="p-4 brand-gradient rounded-lg shadow-sm">
                  <div className="flex items-center mb-3">
                    <Instagram className="h-6 w-6 mr-3 text-cta" />
                    <div>
                      <h4 className="font-semibold">Instagram</h4>
                      <p className="text-primary-foreground/90 text-xs">Follow & DM us for updates</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('https://www.instagram.com/foodsrajasic/?hl=en', '_blank')}
                    className="w-full brand-gradient-inset-btn text-primary-foreground h-9 text-sm border border-primary/25 hover:border-primary/40 transition-colors"
                  >
                    <Instagram className="mr-2 h-4 w-4" /> Visit @foodsrajasic
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Form Card */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Mobile collapsible header */}
              <button
                type="button"
                onClick={() => setMobileFormOpen(o => !o)}
                className="md:hidden w-full bg-primary text-primary-foreground tracking-[0.35em] text-xs py-4 rounded-t-md flex items-center justify-center gap-2 shadow-sm"
                aria-expanded={mobileFormOpen}
                aria-controls="contact-form-mobile"
              >
                SEND US A MESSAGE
                <span className={`transition-transform duration-300 ${mobileFormOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {/* Form card (always visible on md+, conditional on mobile) */}
              <div
                id="contact-form-mobile"
                className={`${mobileFormOpen ? 'block' : 'hidden'} md:block`}
              >
                <Card className="bg-white rounded-t-none md:rounded-md border-t-0 md:border-t h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary md:text-left text-center">Send us a Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...contactForm}>
                      <form onSubmit={contactForm.handleSubmit((data) => createContactMutation.mutate(data))} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={contactForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contactForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={contactForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a subject" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="product-inquiry">Product Inquiry</SelectItem>
                                  <SelectItem value="order-support">Order Support</SelectItem>
                                  <SelectItem value="nutritional-advice">Nutritional Advice</SelectItem>
                                  <SelectItem value="wholesale">Wholesale/Bulk Orders</SelectItem>
                                  <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell us how we can help you..."
                                  className="min-h-[120px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          disabled={createContactMutation.isPending}
                          className="w-full bg-primary text-white hover:bg-green-800"
                        >
                          {createContactMutation.isPending ? 'Sending...' : 'Send Message'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

  {/* Footer and FloatingButtons are now handled by the shared Layout component for consistent dark style and no duplication */}
      
      {/* Shopping Cart Modal */}
      <Sheet open={showCart} onOpenChange={open => { if (!open) closeCart(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <CartSheet />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
