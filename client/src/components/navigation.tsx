import BrandLogo from './brand-logo';
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ShoppingCart, User as UserIcon } from "lucide-react";
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

  // Desktop nav items list
  const desktopNavItems = React.createElement(
    'div',
    { className: 'flex-1 flex justify-center space-x-12' },
    navItems.map(item => React.createElement(
      'button',
      {
        key: item.id,
        onClick: () => scrollToSection(item.id),
        className: 'text-gray-700 hover:text-primary transition-colors font-medium tracking-wide'
      },
      item.label
    ))
  );

  const cartBadge = (count: number, extraClass = '') => count > 0 ? React.createElement(
    'span',
    {
      className: `absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] leading-none rounded-full min-w-[1.1rem] h-5 px-1 flex items-center justify-center font-semibold shadow ${extraClass}`
    },
    count
  ) : null;

  const desktopUserSection = user ? React.createElement(
    'div',
    { className: 'relative', ref: dropdownRef },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'text-green-700 font-semibold cursor-pointer select-none flex items-center gap-1 hover:text-green-800 focus:outline-none',
        onClick: (e: any) => { e.stopPropagation(); setUserMenuOpen(o => !o); },
        onKeyDown: (e: any) => { if (e.key === 'Escape') setUserMenuOpen(false); }
      },
      `Hi, ${user.name}`,
      React.createElement('svg', { className: `h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`, viewBox: '0 0 20 20', fill: 'currentColor' },
        React.createElement('path', { d: 'M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z' })
      )
    ),
    userMenuOpen ? React.createElement(
      'div',
      { className: 'absolute right-0 mt-2 w-40 bg-neutral border rounded shadow-lg z-50 py-1 text-sm' },
      React.createElement('button', {
        className: 'w-full px-4 py-2 text-left hover:bg-gray-100',
        onClick: () => { setLocation('/orders'); setUserMenuOpen(false); }
      }, 'Order History'),
      React.createElement('button', {
        className: 'w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600',
        onClick: () => { logout(); setUserMenuOpen(false); }
      }, 'Logout')
    ) : null
  ) : React.createElement(
    'div',
    { className: 'flex items-center space-x-4' },
    React.createElement('a', { href: '/login', className: 'text-primary hover:underline' }, 'Login'),
    React.createElement('a', { href: '/signup', className: 'text-primary hover:underline' }, 'Sign Up')
  );

  const desktopSection = React.createElement(
    'div',
    { className: 'hidden md:flex items-center flex-1' },
    desktopNavItems,
    React.createElement(
      'div',
      { className: 'flex items-center space-x-6' },
      React.createElement(
        Button,
        { onClick: onCartClick, variant: 'ghost', className: 'relative h-10 w-10 p-0 hover:bg-neutral/60', 'aria-label': 'Open cart' as any },
        React.createElement(ShoppingCart, { className: 'h-6 w-6 text-gray-800' }),
        cartBadge(cartItemCount)
      ),
      desktopUserSection
    )
  );

  const mobileSheetContent = React.createElement(
    SheetContent,
    { side: 'left', className: 'w-[300px] sm:w-[350px]' },
    React.createElement(
      'div',
      { className: 'flex flex-col mt-6' },
      user ? React.createElement(
        'div',
        { className: 'flex items-center gap-3 mb-6 px-1' },
        React.createElement('div', { className: 'h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary' },
          React.createElement(UserIcon, { className: 'h-5 w-5' })
        ),
        React.createElement('div', { className: 'leading-tight' },
          React.createElement('div', { className: 'font-semibold text-primary' }, user.name),
          React.createElement('div', { className: 'text-xs text-gray-500' }, 'Welcome back')
        )
      ) : null,
      React.createElement(
        'div',
        { className: 'flex flex-col space-y-2' },
        ...navItems.map(item => React.createElement('button', {
          key: item.id,
          onClick: () => { scrollToSection(item.id); setMobileNavOpen(false); },
          className: 'text-left text-lg text-gray-700 hover:text-primary transition-colors py-1'
        }, item.label)),
        user ? React.createElement('button', {
          onClick: () => { setLocation('/orders'); setMobileNavOpen(false); },
          className: 'text-left text-lg text-gray-700 hover:text-primary transition-colors py-1'
        }, 'Order History') : null
      ),
      React.createElement(
        Button,
        {
          onClick: () => { onCartClick(); setMobileNavOpen(false); },
          className: 'bg-primary text-white hover:bg-green-800 mt-6'
        },
        React.createElement(ShoppingCart, { className: 'mr-2 h-4 w-4' }),
        `Cart (${cartItemCount})`
      ),
      user ? React.createElement(Button, {
        variant: 'outline' as any,
        className: 'mt-6',
        onClick: () => { logout(); setMobileNavOpen(false); }
      }, 'Logout') : React.createElement(
        'div',
        { className: 'flex flex-col mt-6 space-y-2' },
        React.createElement('a', { href: '/login', className: 'text-primary hover:underline', onClick: () => setMobileNavOpen(false) }, 'Login'),
        React.createElement('a', { href: '/signup', className: 'text-primary hover:underline', onClick: () => setMobileNavOpen(false) }, 'Sign Up')
      )
    )
  );

  const mobileSection = React.createElement(
    'div',
    { className: 'md:hidden flex items-center justify-between w-full' },
    React.createElement(
      'div',
      { className: 'flex items-center' },
      React.createElement(
        Sheet,
        { open: mobileNavOpen, onOpenChange: setMobileNavOpen },
        React.createElement(
          SheetTrigger,
          { asChild: true },
          React.createElement(Button, { variant: 'ghost' as any, size: 'sm' as any, 'aria-label': 'Open navigation menu' as any },
            React.createElement(Menu, { className: 'h-6 w-6' })
          )
        ),
        mobileSheetContent
      )
    ),
    React.createElement(
      'div',
      { className: 'flex-1 flex justify-center' },
      React.createElement(
        'div',
        { className: 'text-center leading-tight' },
        React.createElement(BrandLogo, { size: 'md' })
      )
    ),
    React.createElement(
      'div',
      { className: 'flex items-center' },
      React.createElement(Button, { variant: 'ghost' as any, size: 'sm' as any, onClick: (e: any) => { e.stopPropagation(); onCartClick(); }, className: 'relative' },
        React.createElement(ShoppingCart, { className: 'h-6 w-6' }),
        cartBadge(cartItemCount, 'rounded-full px-1.5 py-0.5')
      )
    )
  );

  return React.createElement(
    'nav',
    { className: 'bg-neutral shadow-md sticky top-0 z-50' },
    React.createElement(
      'div',
      { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
      React.createElement(
        'div',
        { className: 'flex items-center h-16 justify-between overflow-visible' },
        React.createElement(
          'div',
          { className: 'hidden md:flex items-center' },
          React.createElement(
            'div',
            { className: 'text-center leading-tight' },
            React.createElement(BrandLogo, { size: 'lg' })
          )
        ),
        desktopSection,
        mobileSection
      )
    )
  );
}
