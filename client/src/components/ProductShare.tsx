import React from "react";
import { Share2 } from "lucide-react";

interface ProductShareProps {
	url: string;
	name?: string; // optional product name for share metadata
	image?: string; // optional image URL
	size?: number; // icon size
	inline?: boolean; // remove outer spacing if true
	className?: string;
}

const ProductShare: React.FC<ProductShareProps> = ({ url, name, image, size = 18, inline = true, className }) => {
	const handleShare = async () => {
		if (navigator.share) {
			try { await navigator.share({ url, title: name, text: name }); } catch {}
		} else {
			try { await navigator.clipboard.writeText(url); alert('Link copied'); } catch { alert('Share not supported'); }
		}
	};

	return (
			<button
			type="button"
			onClick={handleShare}
			aria-label="Share product link"
				className={`group inline-flex items-center justify-center rounded-full bg-[#757B87] hover:bg-[#5a5f6a] text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#5a5f6a] focus:ring-offset-2 focus:ring-offset-white h-8 w-8 shadow-sm ${inline ? 'ml-2' : ''} ${className||''}`}
		>
			<Share2 className="text-white group-hover:scale-110 transition-transform" size={size} strokeWidth={2} />
		</button>
	);
};

export default ProductShare;
