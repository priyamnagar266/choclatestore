import React from "react";

const Footer: React.FC = () => (
	<footer className="w-full bg-gray-900 text-center py-4 text-xs text-white border-t mt-8">
		&copy; {new Date().getFullYear()} Rajasic Foods Pvt Ltd. All rights reserved.
	</footer>
);

export default Footer;
