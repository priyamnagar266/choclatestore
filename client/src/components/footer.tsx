import React from "react";

import { Link } from "wouter";

const Footer: React.FC = () => (
	<footer className="w-full bg-gray-900 text-center py-4 text-xs text-white border-t mt-8">
		<div className="flex justify-center gap-10 mb-1">
							<Link href="/faq" className="hover:underline">FAQ</Link>
							<Link href="/policies" className="hover:underline">Policies</Link>
		</div>
		<div>
			&copy; {new Date().getFullYear()} Rajasic Foods   . All rights reserved.
		</div>
	</footer>
);

export default Footer;
