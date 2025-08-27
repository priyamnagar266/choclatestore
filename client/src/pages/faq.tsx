
import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Will the chocolates melt during delivery?",
    a: `We take great care in packaging our chocolates to ensure they arrive in good condition. However, during high summer temperatures or longer transit times, the bars may soften or melt slightly. In such cases, it’s absolutely fine — just refrigerate the chocolates for about 20 minutes before consumption to restore their texture and enjoy them as intended.`
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
    a: `At Rajasic Foods, we strongly believe that clean products begin with clean practices. That’s why we carefully source our cacao beans from trusted farms in the southern regions of India — primarily Tamil Nadu and Kerala, chosen for their rich flavor, clean handling, and alignment with our commitment to purity from farm to bar.`
  },
  {
    q: "Are your chocolates suitable for vegans?",
    a: `Yes! Most of our chocolates are completely plant-based and vegan-friendly. We use natural sweeteners and pure cocoa butter to create delicious chocolates without any dairy or animal-based ingredients.`
  },
  {
    q: "How should I store the chocolates?",
    a: `Our chocolates are best stored in a cool, dry place away from direct sunlight. Ideally, keep them at a temperature between 18–22°C. If the climate is hot, you can refrigerate them, but make sure to bring them to room temperature before enjoying for the best flavor.`
  },
  {
    q: "Do you offer bulk or corporate gifting options?",
    a: `Yes, we do! Whether it’s for weddings, festive occasions, or corporate events, we offer personalized bulk orders and beautifully curated gift hampers that leave a lasting impression.`
  },
  {
    q: "What is the shelf life of your chocolates?",
    a: `Since our chocolates are made with pure, natural ingredients and no preservatives, they are best enjoyed within 6 months of purchase. The packaging includes the \"best before\" date so you always know the freshness.`
  },
  {
    q: "Are your chocolates gluten-free?",
    a: `Yes, all our chocolates are naturally gluten-free, making them safe for those with gluten sensitivities.`
  },
  {
    q: "Do you ship across India?",
    a: `Yes, we currently deliver Pan-India. No matter where you are, you can indulge in our premium, handcrafted chocolates delivered straight to your doorstep.`
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-neutral flex flex-col">
      <div className="w-full bg-primary text-white py-16 text-center">
        <h1 className="text-5xl font-bold mb-2">Frequently Asked Questions</h1>
      </div>
      <div className="w-full flex justify-center py-12">
        <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-2xl 2xl:max-w-2xl px-2">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger className="text-lg font-semibold text-gray-900 text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-base text-gray-700 whitespace-pre-line">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
