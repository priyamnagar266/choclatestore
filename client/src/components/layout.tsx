import React from "react";
import Navigation from "@/components/navigation";
import FloatingButtons from "@/components/floating-buttons";
import Footer from "@/components/footer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CartSheet from "@/components/cart-sheet";
import { useCart } from "@/context/CartContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { showCart, closeCart } = useCart();
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <FloatingButtons onBuyNowClick={()=>{
        // Default behavior: scroll to products section if present, else navigate
        const el = document.getElementById('products');
        if (el) el.scrollIntoView({ behavior:'smooth'}); else window.location.href = '/products';
      }} />
      <Sheet open={showCart} onOpenChange={(open)=>{ if(!open) closeCart(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <CartSheet />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default React.memo(Layout);
