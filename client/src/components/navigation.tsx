import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart } from "lucide-react";
import { useAuth } from "./auth-context";

interface NavigationProps {
  cartItemCount: number;
  onCartClick: () => void;
}

export default function Navigation({ cartItemCount, onCartClick }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

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
    { label: "About", id: "aboutus" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-bold">
              <span className="text-amber-800">Cokha</span> <span className="text-green-600 text-lg">by Rajsic Foods</span>
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
            {user ? (
              <div className="relative ml-4">
                <span className="text-green-700 font-semibold cursor-pointer" tabIndex={0} onClick={() => setIsOpen(true)}>
                  Hi, {user.name}
                </span>
                {/* Dropdown menu */}
                {isOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow-lg z-50">
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                      onClick={() => { logout(); setIsOpen(false); }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <a href="/login" className="ml-4 text-primary hover:underline">Login</a>
                <a href="/signup" className="ml-2 text-primary hover:underline">Sign Up</a>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center justify-between w-full">
            <div className="flex items-center ml-auto">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <div className="flex items-center">
                    <Button variant="ghost" size="sm" onClick={onCartClick} className="mr-2">
                      <ShoppingCart className="h-6 w-6" />
                      {cartItemCount > 0 && (
                        <span className="ml-1 text-xs font-bold">{cartItemCount}</span>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </div>
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
                    {user ? (
                      <>
                        <span className="mt-4 text-green-700 font-semibold">Hi, {user.name}</span>
                        <Button variant="outline" className="mt-2" onClick={() => { logout(); setIsOpen(false); }}>Logout</Button>
                      </>
                    ) : (
                      <>
                        <a href="/login" className="mt-4 text-primary hover:underline">Login</a>
                        <a href="/signup" className="mt-2 text-primary hover:underline">Sign Up</a>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
