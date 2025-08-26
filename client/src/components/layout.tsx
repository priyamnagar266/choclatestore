import React from "react";
import Navigation from "@/components/navigation";
import FloatingButtons from "@/components/floating-buttons";
import Footer from "@/components/footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <FloatingButtons />
    </div>
  );
};

export default React.memo(Layout);
