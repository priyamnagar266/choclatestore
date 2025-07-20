import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart } from "lucide-react";

interface NavigationProps {
  cartItemCount: number;
  onCartClick: () => void;
}

export default function Navigation({ cartItemCount, onCartClick }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsOpen(false);
    }
  };

  const navItems = [
    { label: "Home", id: "home" },
    { label: "Products", id: "products" },
    { label: "About", id: "about" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-primary">
              Cokha <span className="text-secondary">by Rajsic Foods</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                {item.label}
              </button>
            ))}
            <Button
              onClick={onCartClick}
              className="bg-primary text-white hover:bg-green-800"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cartItemCount})
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="text-left text-lg text-gray-700 hover:text-primary transition-colors py-2"
                    >
                      {item.label}
                    </button>
                  ))}
                  <Button
                    onClick={() => {
                      onCartClick();
                      setIsOpen(false);
                    }}
                    className="bg-primary text-white hover:bg-green-800 mt-4"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Cart ({cartItemCount})
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
