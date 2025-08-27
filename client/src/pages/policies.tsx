import React from "react";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-neutral flex flex-col">
      <div className="w-full bg-primary text-white py-16 text-center">
        <h1 className="text-5xl font-bold mb-2">Our Policies</h1>
      </div>
      <div className="w-full flex justify-center py-12">
        <div className="w-full max-w-2xl px-2 text-gray-800 text-base space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 bg-primary\\/10 px-4 py-2 rounded flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-primary rounded-full"></span>
              Shipping Policy
            </h2>
            <p>
              At <b>COKHA</b>, every bar is freshly crafted in small batches using real couverture chocolate, nutrient-rich nuts and seeds, and natural sweeteners like jaggery, dates, and honey. Since we prioritize freshness and quality over mass production, our standard delivery time is <b>5–7 working days</b>.<br /><br />
              If you haven’t received your order within this timeframe from the date of dispatch, feel free to drop us a message on any of our platforms or email us at <a href="mailto:orders@cokha.com" className="underline text-primary">orders@cokha.com</a> — we’re always here to help!<br /><br />
              In case of any unexpected delays, our customer support team will proactively get in touch and keep you updated on your delivery status.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4 bg-primary\\/10 px-4 py-2 rounded flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-primary rounded-full"></span>
              Refund & Return Policy
            </h2>
            <p>
              We want you to love what you receive! If for any reason you're not fully satisfied, we offer a <b>15-day return policy</b>, meaning you can request a return within 15 days of receiving your item.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-2">Eligibility for Returns</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Be in the same condition that you received it</li>
              <li>Be unopened, unused, and unworn, if applicable</li>
              <li>Have all original packaging and tags intact</li>
              <li>Be accompanied by the receipt or proof of purchase</li>
            </ul>
            <p className="mt-2 text-sm text-gray-600">Note: Items sent back without first requesting a return will not be accepted.</p>
            <h3 className="text-lg font-semibold mt-6 mb-2">How to Start a Return</h3>
            <p>
              To initiate a return, please contact us at <a href="mailto:orders@cokha.com" className="underline text-primary">orders@cokha.com</a>.<br />
              If your return is approved, we’ll send you:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>A return shipping label</li>
              <li>Instructions on how and where to send your package</li>
            </ul>
            <p>Feel free to reach out to us with any questions at <a href="mailto:orders@cokha.com" className="underline text-primary">orders@cokha.com</a>.</p>
            <h3 className="text-lg font-semibold mt-6 mb-2">Damages & Issues</h3>
            <p>
              Please inspect your order upon delivery. If the item is:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Defective</li>
              <li>Damaged</li>
              <li>Or if you received the wrong product</li>
            </ul>
            <p>
              ...please contact us immediately so we can evaluate the issue and make it right.<br />
              <span className="text-sm text-gray-600">Helpful tip: We recommend making a short video while unboxing your parcel — this can help us resolve any issues faster and more efficiently.</span>
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-2">Exceptions / Non-returnable Items</h3>
            <p>Some items are not eligible for return, including:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Perishable goods with a shelf life of 2 months or less</li>
              <li>Custom or personalized products</li>
              <li>Items purchased on sale or during promotional offers</li>
            </ul>
            <p>If you're unsure whether your item qualifies, please don’t hesitate to reach out before placing a return request.</p>
            <h3 className="text-lg font-semibold mt-6 mb-2">Exchanges</h3>
            <p>The fastest way to ensure you get what you want is to return the item you have, and once the return is accepted, make a separate purchase for the new item.</p>
            <h3 className="text-lg font-semibold mt-6 mb-2">Refunds</h3>
            <p>
              We will notify you once we’ve received and inspected your return, and let you know if the refund was approved or not. If approved, you’ll be automatically refunded on your original payment method within 10 business days. Please remember it can take some time for your bank or credit card company to process and post the refund too.<br /><br />
              If more than 15 business days have passed since we’ve approved your return, please contact us at <a href="mailto:orders@cokha.com" className="underline text-primary">orders@cokha.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
