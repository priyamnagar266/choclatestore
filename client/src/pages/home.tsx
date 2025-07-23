import { useAuth } from "@/components/auth-context";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Play, Star, Phone, Mail, MapPin, Clock, MessageCircle, X, Minus, Plus, Trash2 } from "lucide-react";

import type { Product } from "@shared/schema";
import { CartItem, calculateCartTotal, calculateItemCount, formatPrice } from "@/lib/products";
import { insertOrderSchema, insertContactSchema, insertNewsletterSchema } from "@shared/schema";

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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Cart state (persisted in localStorage until payment)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [showCart, setShowCart] = useState(false);
  
  // Order form state
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

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

  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      let updatedCart;
      if (existingItem) {
        updatedCart = prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...prev, {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image: product.image,
        }];
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const updatedCart = prev.filter(item => item.id !== productId);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const updateCartItemQuantity = (productId: number, quantity: number) => {
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
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const syncCartToOrder = () => {
    // Sync cart items to order quantities
    const newOrderQuantities: Record<number, number> = {};
    cart.forEach(item => {
      newOrderQuantities[item.id] = item.quantity;
    });
    setOrderQuantities(newOrderQuantities);
    
    // Scroll to order section
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    
    // Update order quantities
    setOrderQuantities(prev => ({
      ...prev,
      [productId]: newQuantity,
    }));
    
    // Sync back to cart
    const product = products.find(p => p.id === productId);
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
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
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
        const product = products.find(p => p.id === parseInt(productId));
        return product ? {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
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

  if (productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral">
      <Navigation 
        cartItemCount={calculateItemCount(cart)} 
        onCartClick={() => setShowCart(true)} 
      />
      
      {/* Hero Section */}
      <section id="home" className="relative bg-gradient-to-br from-primary to-green-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080" 
            alt="Ancient Indian superfoods background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                Brain + Mood<br />
                <span className="text-accent">Energy Bars</span>
              </h1>
              <p className="text-xl mb-8 opacity-90">
                Crafted with Ancient Indian Superfoods & Rich Cocoa
              </p>
              <p className="text-lg mb-10 opacity-80">
                Fuel your mind and elevate your mood with nature's most powerful ingredients. Each bar is carefully crafted to deliver sustained energy and mental clarity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={scrollToProducts}
                  className="bg-accent text-white hover:bg-orange-500 px-8 py-4 text-lg font-semibold transform hover:scale-105"
                >
                  Shop Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => scrollToSection('products')}
                  className="border-2 border-white bg-white/10 text-white hover:bg-white hover:text-primary px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all duration-200"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://i.postimg.cc/cLZtLg16/Gemini-Generated-Image-wv9jaswv9jaswv9j.png" 
                alt="Cokha energy bars with ancient superfoods" 
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -top-4 -right-4 bg-accent text-white px-6 py-3 rounded-full font-bold">
                100% Natural
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">Our Energy Bar Collection</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Each bar is meticulously crafted with premium ancient superfoods and rich cocoa to deliver specific benefits for your mind and body.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20 bg-primary text-white">
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
                  src="/src/components/Assets/20250721_111849_0001.mp4" 
                  controls
                  // poster="https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080"
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
      <section className="py-20 bg-neutral">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Real experiences from people who've transformed their energy and focus</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                text: "These energy bars have completely changed my afternoon slump. The Focus Boost bar gives me 4+ hours of sustained mental clarity without any crash!",
                name: "Priya Sharma",
                role: "Software Engineer",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
              },
              {
                text: "As a fitness enthusiast, I love the Protein Power bar. It's perfectly balanced nutrition with authentic Indian flavors. Finally, a healthy snack that tastes amazing!",
                name: "Rahul Kumar",
                role: "Fitness Coach",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
              },
              {
                text: "The Mood Uplift bar has become my daily stress-buster. I can feel the difference in my mood and energy levels. These are not just snacks, they're wellness in a bar!",
                name: "Anita Desai",
                role: "Marketing Executive",
                image: "https://pixabay.com/get/g6ac1b2dc634d78fd086a1d560a2b786b2441b579508ab0397f72b084aea108ac9264806201cefff853fed04660570991431fec36507b47f58a24252a00670a48_1280.jpg"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-white p-8">
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
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
      <section id="aboutus" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-left md:text-justify">
            <h2 className="text-4xl font-bold text-primary mb-4">About Us</h2>
            <p className="text-xl text-gray-600 mb-6">Cokha Energy Foods is dedicated to crafting premium energy bars using ancient Indian superfoods and rich cocoa. Our mission is to fuel your mind, elevate your mood, and energize your life naturally. We believe in honest nutrition, authentic flavors, and wellness for everyone.</p>
            <div className="mt-4 text-lg text-gray-700">
              <p>Founded by Rajsic Foods Pvt Ltd, our team is passionate about blending tradition with modern science to create snacks that truly make a difference. Every bar is meticulously crafted for specific benefits—focus, energy, mood, and more.</p>
              <p className="mt-4">Join us on your wellness journey and experience the power of ancient superfoods in every bite!</p>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <img src="/src/components/Assets/logo.jpg" />
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-green-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-4">Stay Updated on Wellness</h2>
            <p className="text-xl opacity-90">Get exclusive offers, nutrition tips, and be the first to know about new superfood energy bars</p>
          </div>
          <Form {...newsletterForm}>
            <form onSubmit={newsletterForm.handleSubmit((data) => subscribeNewsletterMutation.mutate(data))} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <FormField
                control={newsletterForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter your email address" 
                        className="text-gray-800"
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={subscribeNewsletterMutation.isPending}
                className="bg-accent text-white hover:bg-orange-500 font-semibold"
              >
                {subscribeNewsletterMutation.isPending ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </Form>
          <p className="text-sm opacity-75 mt-4">No spam, unsubscribe anytime. Your wellness journey starts with staying informed.</p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-neutral">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600">Have questions about our products or need personalized nutrition advice?</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary text-white p-3 rounded-lg">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Address</h4>
                      <p className="text-gray-600">
                        Rajsic Foods Pvt Ltd<br />
                        123 Wellness Street, Organic Plaza<br />
                        Mumbai, Maharashtra 400001
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary text-white p-3 rounded-lg">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Phone</h4>
                      <p className="text-gray-600">+91 98765 43210</p>
                      <p className="text-gray-600">+91 87654 32109</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary text-white p-3 rounded-lg">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Email</h4>
                      <p className="text-gray-600">info@rajsicfoods.com</p>
                      <p className="text-gray-600">orders@rajsicfoods.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary text-white p-3 rounded-lg">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Business Hours</h4>
                      <p className="text-gray-600">
                        Monday - Saturday: 9:00 AM - 8:00 PM<br />
                        Sunday: 10:00 AM - 6:00 PM
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center mb-3">
                      <MessageCircle className="text-green-500 h-6 w-6 mr-3" />
                      <div>
                        <h4 className="font-semibold text-green-800">WhatsApp Support</h4>
                        <p className="text-green-600 text-sm">Get instant answers to your questions</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open('https://wa.me/919876543210', '_blank')}
                      className="w-full bg-green-500 text-white hover:bg-green-600"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat with Us on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">Send us a Message</CardTitle>
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
                        {createContactMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-2">
              <div className="text-3xl font-bold text-accent mb-4">Cokha by Rajsic Foods</div>
              <p className="text-gray-300 mb-6 max-w-md">
               Crafting premium energy bars with ancient Indian superfoods and rich cocoa to fuel your mind, elevate your mood, and energize your life naturally.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('home')} className="text-gray-300 hover:text-accent transition-colors">Home</button></li>
                <li><button onClick={() => scrollToSection('products')} className="text-gray-300 hover:text-accent transition-colors">Products</button></li>
                <li><button onClick={scrollToOrder} className="text-gray-300 hover:text-accent transition-colors">Order Online</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="text-gray-300 hover:text-accent transition-colors">Contact</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><span className="text-gray-300">FAQ</span></li>
                <li><span className="text-gray-300">Shipping Info</span></li>
                <li><span className="text-gray-300">Return Policy</span></li>
                <li><span className="text-gray-300">Nutrition Guide</span></li>
                <li><span className="text-gray-300">Privacy Policy</span></li>
              </ul>
            </div>
          </div>

          <Separator className="border-gray-700 my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">&copy; 2024 Rajsic Foods Pvt Ltd. All rights reserved.</p>
            <p className="text-gray-400">Made with ❤️ for your wellness journey</p>
          </div>
        </div>
      </footer>

      <FloatingButtons onBuyNowClick={scrollToOrder} />
      
      {/* Shopping Cart Modal */}
      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-primary">Shopping Cart ({calculateItemCount(cart)} items)</SheetTitle>
            <SheetDescription>
              Review your selected items before proceeding to checkout
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-6xl text-gray-300 mb-4">🛒</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 mb-4">Add some delicious energy bars to get started!</p>
                <Button onClick={() => setShowCart(false)} className="bg-primary hover:bg-green-800">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-600">{formatPrice(item.price)} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 space-y-4">
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total: {formatPrice(calculateCartTotal(cart))}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        if (!user) {
                          toast({
                            title: "Login Required",
                            description: "Please log in to continue with your order.",
                            variant: "destructive",
                          });
                          setShowCart(false);
                          setLocation("/login");
                          return;
                        }
                        // Prepare order object and save to localStorage before redirecting
                        // Do not set pendingOrder here; let the backend order creation handle it so _id is always present
                        setShowCart(false);
                        setLocation("/delivery");
                      }}
                      className="w-full bg-primary hover:bg-green-800"
                    >
                      Proceed to Order Form
                    </Button>
                    <Button
                      onClick={clearCart}
                      variant="outline"
                      className="w-full"
                    >
                      Clear Cart
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
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
