import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart } from "lucide-react";
import { useAuth } from "./auth-context";
import { useLocation } from "wouter";

interface NavigationProps {
  cartItemCount: number;
  onCartClick: () => void;
}

export default function Navigation({ cartItemCount, onCartClick }: NavigationProps) {
  // Desktop user dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Mobile navigation sheet
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setMobileNavOpen(false);
    }
  };

  const navItems = [
    { label: "Home", id: "home" },
    { label: "Products", id: "products" },
    { label: "About", id: "aboutus" },
    { label: "Contact", id: "contact" },
  ];

  return (
  <nav className="bg-neutral shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 justify-between">
          <div className="flex items-center">
            <div className="text-2xl font-bold">
              <span className="text-amber-800">Cokha</span> <span className="text-green-600 text-lg">by Rajasic Foods</span>
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
              <div className="relative ml-4" ref={dropdownRef}>
                <button
                  type="button"
                  className="text-green-700 font-semibold cursor-pointer select-none flex items-center gap-1 hover:text-green-800 focus:outline-none"
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen(o => !o); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setUserMenuOpen(false); } }}
                >
                  Hi, {user.name}
                  <svg className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-neutral border rounded shadow-lg z-50 py-1 text-sm">
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                      onClick={() => { setLocation('/orders'); setUserMenuOpen(false); }}
                    >
                      Order History
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
                      onClick={() => { logout(); setUserMenuOpen(false); }}
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
            <div className="flex items-center ml-auto gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onCartClick(); }} className="mr-1">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="ml-1 text-xs font-bold">{cartItemCount}</span>
                )}
              </Button>
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Open navigation menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { scrollToSection(item.id); setMobileNavOpen(false); }}
                        className="text-left text-lg text-gray-700 hover:text-primary transition-colors py-2"
                      >
                        {item.label}
                      </button>
                    ))}
                    <Button
                      onClick={() => {
                        onCartClick();
                        setMobileNavOpen(false);
                      }}
                      className="bg-primary text-white hover:bg-green-800 mt-4"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Cart ({cartItemCount})
                    </Button>
                    {user ? (
                      <>
                        <span className="mt-4 text-green-700 font-semibold select-none">Hi, {user.name}</span>
                        <Button
                          variant="ghost"
                          className="mt-2 justify-start"
                          onClick={() => { setLocation('/orders'); setMobileNavOpen(false); }}
                        >
                          Order History
                        </Button>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => { logout(); setMobileNavOpen(false); }}
                        >
                          Logout
                        </Button>
                      </>
                    ) : (
                      <>
                        <a href="/login" className="mt-4 text-primary hover:underline" onClick={() => setMobileNavOpen(false)}>Login</a>
                        <a href="/signup" className="mt-2 text-primary hover:underline" onClick={() => setMobileNavOpen(false)}>Sign Up</a>
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
