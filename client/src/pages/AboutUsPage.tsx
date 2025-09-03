import React, { useEffect } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const aboutText = `I’m Payal Jain, founder of Rajasic Foods, the parent company behind the brand COKHA.\nThe word "Rajasic" comes from ancient Indian philosophy and Ayurveda. It refers to foods that promote energy, activity, passion, and drive — qualities associated with growth and action. Rajasic foods are meant to fuel both body and mind, supporting a dynamic and engaged lifestyle. Inspired by this philosophy, Rajasic Foods is committed to creating products that are not only nourishing but also invigorating.\n\nOur journey began in 2024 with a very personal inspiration — my son’s reluctance to eat traditional Indian superfoods like dal badam ka halwa, khas badam ka halwa, dry fruits, and seeds. He found them boring or unappealing in their natural forms, whether eaten whole or mixed in milk as a paste.\n\nThat challenge sparked an idea — what if we combined these time-tested, nutrient-rich ingredients with something kids (and adults!) naturally enjoy? That’s how COKHA was born — a brand that merges authentic Indian superfood pastes with pure couverture chocolate, without preservatives or refined sugar.\n\nWhat started as a homemade solution quickly became a community favorite. Free samples shared with friends and neighbors were met with enthusiasm — not just from kids, but also from health-conscious adults who track their protein and calorie intake, yet still crave something sweet and satisfying.\n\nAt COKHA, every energy bar is crafted to deliver:\n- The richness of real couverture chocolate\n- Power-packed Indian superfoods\n- Natural sweeteners like jaggery, dates, and honey\n- Zero preservatives or refined sugar\n- Wholesome fiber, rare vitamins, and essential minerals\n\nOur mission is simple: to offer clean, indulgent nutrition that aligns with both ancient wisdom and modern lifestyles. Whether you're seeking a healthy snack for your kids or a guilt-free treat for yourself, COKHA bridges tradition and taste with every bite.\n\nWelcome to a new kind of indulgence. Welcome to COKHA, by Rajasic Foods.`;


export default function AboutUsPage() {
  // Scroll to top if navigated with #top
  useEffect(() => {
    if (window.location.hash === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);
  return (
    <div id="top" className="min-h-screen bg-neutral flex flex-col">
      <div className="w-full bg-primary text-white py-16 text-center">
        <h1 className="text-5xl font-bold mb-2">About Us</h1>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12 items-start">
        {/* Logo only (founder image removed) */}
        <div className="flex flex-col items-center gap-8 w-full md:w-80 mb-8 md:mb-0">
          <img src="https://i.postimg.cc/NMGvf180/logo.jpg" alt="COKHA Logo" className="w-80 h-80 bg-white shadow-lg border-4 border-primary" />
        </div>
        {/* Text column: About text only */}
        <div className="flex-1">
          <div className="text-justify whitespace-pre-line text-lg text-gray-800 leading-relaxed mb-12">
            {aboutText}
          </div>
        </div>
      </div>
    </div>
  );
}
