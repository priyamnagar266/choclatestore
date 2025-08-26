import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const aboutText = `I’m Payal Jain, founder of Rajasic Foods, the parent company behind the brand COKHA.\nThe word "Rajasic" comes from ancient Indian philosophy and Ayurveda. It refers to foods that promote energy, activity, passion, and drive — qualities associated with growth and action. Rajasic foods are meant to fuel both body and mind, supporting a dynamic and engaged lifestyle. Inspired by this philosophy, Rajasic Foods is committed to creating products that are not only nourishing but also invigorating.\n\nOur journey began in 2024 with a very personal inspiration — my son’s reluctance to eat traditional Indian superfoods like dal badam ka halwa, khas badam ka halwa, dry fruits, and seeds. He found them boring or unappealing in their natural forms, whether eaten whole or mixed in milk as a paste.\n\nThat challenge sparked an idea — what if we combined these time-tested, nutrient-rich ingredients with something kids (and adults!) naturally enjoy? That’s how COKHA was born — a brand that merges authentic Indian superfood pastes with pure couverture chocolate, without preservatives or refined sugar.\n\nWhat started as a homemade solution quickly became a community favorite. Free samples shared with friends and neighbors were met with enthusiasm — not just from kids, but also from health-conscious adults who track their protein and calorie intake, yet still crave something sweet and satisfying.\n\nAt COKHA, every energy bar is crafted to deliver:\n- The richness of real couverture chocolate\n- Power-packed Indian superfoods\n- Natural sweeteners like jaggery, dates, and honey\n- Zero preservatives or refined sugar\n- Wholesome fiber, rare vitamins, and essential minerals\n\nOur mission is simple: to offer clean, indulgent nutrition that aligns with both ancient wisdom and modern lifestyles. Whether you're seeking a healthy snack for your kids or a guilt-free treat for yourself, COKHA bridges tradition and taste with every bite.\n\nWelcome to a new kind of indulgence. Welcome to COKHA, by Rajasic Foods.`;

const faqs = [
  {
    q: "Will the chocolates melt during delivery?",
    a: `We take great care in packaging our chocolates to ensure they arrive in good condition.\nHowever, during high summer temperatures or longer transit times, the bars may soften or melt slightly.\nIn such cases, it’s absolutely fine — just refrigerate the chocolates for about 20 minutes before consumption to restore their texture and enjoy them as intended.`
  },
  {
    q: "Can I customize a gift box with my choice of chocolates?",
    a: `Absolutely! You can handpick your favorite chocolates, and we'll create a custom gift box just the way you like it — perfect for sharing the flavors you love with friends, family, or anyone special.`
  },
  {
    q: "Do you add palm oil, refined sugar, or preservatives to your chocolates?",
    a: `Absolutely not! Our chocolates are made with 100% pure cocoa butter — no palm oil, no refined sugar, and no preservatives. This allows us to maintain the highest quality while delivering that silky, smooth, and rich chocolate experience, just the way it should be — pure and uncompromised.`
  },
  {
    q: "Where do you source your cacao beans from?",
    a: `At Rajasic Foods, we strongly believe that clean products begin with clean practices. That’s why we carefully source our cacao beans from trusted farms in the southern regions of India — primarily Tamil Nadu and Kerala. chosen for their rich flavor, clean handling, and alignment with our commitment to purity from farm to bar.`
  }
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-neutral flex flex-col">
      <div className="w-full bg-primary text-white py-16 text-center">
        <h1 className="text-5xl font-bold mb-2">About Us</h1>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12 items-start">
        {/* Images column: Owner photo and logo */}
        <div className="flex flex-col items-center gap-8 w-full md:w-80 mb-8 md:mb-0">
          <img src="https://www.shutterstock.com/image-photo/happy-middle-aged-business-man-260nw-2516789507.jpg" alt="Payal Jain, Founder" className="w-72 h-72 object-cover rounded-full shadow-lg border-4 border-primary bg-white" />
          <img src="https://i.postimg.cc/NMGvf180/logo.jpg" alt="COKHA Logo" className="w-80 h-80 bg-white shadow-lg border-4 border-primary" />
        </div>
        {/* Text column: About text and FAQ */}
        <div className="flex-1">
          <div className="text-justify whitespace-pre-line text-lg text-gray-800 leading-relaxed mb-12">
            {aboutText}
          </div>
          <div className="w-full max-w-2xl">
            <h2 className="text-3xl font-bold text-primary mb-6">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={String(i)}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
