import React from "react";

interface ProductShareProps {
	url: string;
}

const ProductShare: React.FC<ProductShareProps> = ({ url }) => {
	const handleShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ url });
			} catch {}
		} else {
			alert("Sharing not supported");
		}
	};

	return (
		<div className="flex gap-2 ml-2">
			<button
				className="rounded-full bg-[#757B87] p-2 hover:bg-[#5a5f6a] transition-colors"
				title="Share"
				onClick={handleShare}
				style={{ outline: "none", border: "none" }}
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="12" cy="12" r="12" fill="#757B87" />
					<path d="M16.59 7.58a2 2 0 0 0-2.83 0l-5.18 5.18a2 2 0 0 0 2.83 2.83l.29-.29a.75.75 0 1 1 1.06 1.06l-.29.29a3.5 3.5 0 1 1-4.95-4.95l5.18-5.18a3.5 3.5 0 1 1 4.95 4.95l-.29.29a.75.75 0 1 1-1.06-1.06l.29-.29a2 2 0 0 0 0-2.83z" fill="#fff" />
				</svg>
			</button>
		</div>
	);
}

export default ProductShare;
