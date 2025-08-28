// Fresh rewrite to avoid hidden parse issues in previous version.
// JSX-free implementation (using React.createElement) so it works even if JSX transform misconfigured.
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/products";
import ProductShare from "@/components/ProductShare";
import { useCart } from "@/context/CartContext";

interface Product { id: any; _id?: any; slug?: string; name: string; description: string; price: number; image: string; category?: string; inStock?: number; energyKcal?: number; proteinG?: number; carbohydratesG?: number; totalSugarG?: number; addedSugarG?: number; totalFatG?: number; saturatedFatG?: number; transFatG?: number; }
interface Props { slug: string; }

const h = React.createElement;

// Flexible static-first product list fetch (avoids waking backend unless needed)
async function fetchAllStaticFirst(): Promise<Product[]> {
	// Reuse already loaded global list if present
	if (typeof window !== 'undefined' && (window as any).__ALL_PRODUCTS && Array.isArray((window as any).__ALL_PRODUCTS)) {
		return (window as any).__ALL_PRODUCTS;
	}
	// Try manifest hashed file (freshest static build)
	try {
		const manifestRes = await fetch('/products-manifest.json', { cache: 'no-cache' });
		if (manifestRes.ok) {
			const manifest = await manifestRes.json();
			if (manifest?.current) {
				const hashed = await fetch('/' + manifest.current, { cache: 'no-cache' });
				if (hashed.ok) {
					const data = await hashed.json();
						(window as any).__ALL_PRODUCTS = data; // cache globally
					return data;
				}
			}
		}
	} catch {}
	// Fallback legacy static file
	try {
		const r = await fetch('/products.json', { cache: 'no-cache' });
		if (r.ok) { const data = await r.json(); (window as any).__ALL_PRODUCTS = data; return data; }
	} catch {}
	// Final fallback: call API (may wake sleeping backend)
	try {
		const api = await fetch('/api/products');
		if (api.ok) { const data = await api.json(); (window as any).__ALL_PRODUCTS = data; return data; }
	} catch {}
	return [];
}

async function fetchProductBySlugStaticFirst(slug: string): Promise<Product | null> {
	const list = await fetchAllStaticFirst();
	const found = list.find(p => p.slug === slug);
	if (found) return found;
	// slug-specific API fallback only if not present in static
	try {
		const r = await fetch(`/api/products/slug/${slug}`);
		if (r.ok) return r.json();
	} catch {}
	return null;
}

function nutritionRow(label: string, value: any){ if(value==null || isNaN(Number(value))) return null; return h('tr',{className:'even:bg-neutral/40'}, h('td',{className:'py-1.5 px-3 font-medium text-primary whitespace-nowrap'}, label), h('td',{className:'py-1.5 px-3 text-right tabular-nums'}, Number(value))); }

const ProductDetailPage: React.FC<Props> = ({ slug }) => {
	const { addToCart } = useCart();
	const { data: product, isLoading, error } = useQuery<Product | null>({ queryKey:["product", slug], queryFn:()=>fetchProductBySlugStaticFirst(slug) });
	const { data: all } = useQuery<Product[]>({ queryKey:["products-all"], queryFn:fetchAllStaticFirst, staleTime:120000 });

	// Ensure browser Back navigates to products list if user landed directly on a product via pasted link/new tab.
	React.useEffect(()=>{
		try {
			const direct = document.referrer === '' || !document.referrer.startsWith(window.location.origin);
			const fromProducts = !!document.referrer && /\/products(\/?|$)/.test(new URL(document.referrer).pathname);
			if (direct || !fromProducts) {
				// Mark current history entry so a single back triggers redirect
				if (!history.state || !history.state.__productEntry) {
					history.replaceState({ ...(history.state||{}), __productEntry:true }, '');
				}
				const onPop = () => {
					if (history.state && history.state.__productEntry) {
						window.removeEventListener('popstate', onPop);
						window.location.replace('/products');
					}
				};
				window.addEventListener('popstate', onPop);
				return () => window.removeEventListener('popstate', onPop);
			}
		} catch {}
	}, [slug]);
	// IMPORTANT: Hooks (like useMemo) must not be skipped between renders.
	// Compute suggestions even while loading/error (it will just return []).
	const suggestions = useMemo(()=>{ 
		if(!all || !product) return [] as Product[]; 
		const cid = product.id||product._id; 
		const same = all.filter(p=> (p.id||p._id)!==cid && p.category===product.category); 
		const others = all.filter(p=> (p.id||p._id)!==cid && p.category!==product.category); 
		return [...same,...others].slice(0,2); 
	},[all, product]);

	if(isLoading) return h('div',{className:'p-12 text-center'},'Loading...');
	if(error || !product) return h('div',{className:'p-12 text-center text-red-500'},'Product not found.');
	const hasNutrition = [product.energyKcal, product.proteinG, product.carbohydratesG, product.totalSugarG, product.addedSugarG, product.totalFatG, product.saturatedFatG, product.transFatG].some(v=> v!=null && !isNaN(Number(v)));
	const close = ()=> window.history.back();

	return h('div',{className:'min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e6eef3] py-10'},
		// Constrain width
		h('div',{className:'max-w-6xl mx-auto px-4 md:px-8'},
			// Grid layout: image / details
			h('div',{className:'grid md:grid-cols-2 gap-10 items-start'},
				// Image
				h('div',{className:'w-full space-y-8'},
					h('div',{className:'bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200'},
						h('img',{src:product.image, alt:product.name, className:'w-full h-[420px] md:h-[520px] object-cover object-top rounded-xl'}),
						product.inStock===0 ? h('div',{className:'mt-4 text-sm font-semibold text-red-600 text-center'},'Out of Stock') : null
					),
					// Qualities bar directly under product image (desktop only)
					h('div',{className:'hidden md:block rounded-2xl bg-[#f6f1e6] border border-[#e5dccd] px-4 md:px-6 py-6 shadow-sm'},
						h('ul',{className:'grid grid-cols-3 sm:grid-cols-6 gap-4 md:gap-6 text-center justify-items-center'},[
							// Vegan Friendly
							h('li',{key:'vegan',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, className:'w-8 h-8 text-primary'},
								 	 h('path',{d:'M5 3c3 5 6 7 11 8.5M5 3l1.5 7M5 3l7 1.5'}),
								 	 h('path',{d:'M12 21c4.5-4 7-8 7-12V5l-4 1'}))
								 ),
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, 'VEGAN FRIENDLY')
							),
							// Natural Ingredients
							h('li',{key:'natural',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, className:'w-8 h-8 text-primary'},
								 	 h('path',{d:'M12 3a9 9 0 019 9c0 4.97-4.03 9-9 9S3 16.97 3 12c0-.91.12-1.79.34-2.62'}),
								 	 h('path',{d:'M8 13c1.5 1.5 3 1.5 5.5-1S18 8 18 8'}))
								 ),
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight text-center max-w-[70px] mx-auto'}, 'NATURAL INGREDIENTS')
							),
							// Finest Quality
							h('li',{key:'quality',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, className:'w-8 h-8 text-primary'},
								 	 h('path',{d:'M12 2l2.39 4.84L20 8l-3.8 3.7.9 5.3L12 15.9 6.9 17l.9-5.3L4 8l5.61-1.16z'}))
								 ),
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, 'FINEST QUALITY')
							),
							// Made in India
							h('li',{key:'india',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.2, className:'w-8 h-8 text-primary'},
								 	 h('path',{d:'M8 4l2 1 2-1 2 1 2-1 1 2-1 2 1 2-1 2 1 2-1 2-2-1-2 1-2-1-2 1-1-2 1-2-1-2 1-2-1-2z'}))
								 ),
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, 'MADE IN INDIA')
							),
							// Melt Free Delivery
							h('li',{key:'meltfree',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, className:'w-8 h-8 text-primary'},
								 	 h('rect',{x:3,y:7,width:18,height:10,rx:2}),
								 	 h('path',{d:'M7 7V5a5 5 0 0110 0v2'})) ) ,
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, 'MELT FREE DELIVERY')
								),
							// No Soy Lecithin
							h('li',{key:'nosoy',className:'flex flex-col items-center gap-2'},
								 h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40 relative'},
								 	h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, className:'w-8 h-8 text-primary'},
								 	 h('circle',{cx:12, cy:12, r:8}),
								 	 h('path',{d:'M8 12c1.5 2 3 2 4 0s2.5-2 4 0'})),
								 	h('span',{className:'absolute inset-0 flex items-center justify-center pointer-events-none'},
								 	 h('svg',{xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, className:'w-14 h-14 text-primary/40'},
								 	 	 h('line',{x1:4,y1:4,x2:20,y2:20})))
								 ),
								 h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, 'NO SOY LECITHIN')
							)
						])
					)
					),
				// Details
				h('div',{className:'space-y-6'},
					// Title + share
					h('div',{className:'flex items-start gap-3'},
						h('h1',{className:'text-3xl md:text-4xl font-bold tracking-tight text-primary flex-1'}, product.name),
						h(ProductShare,{ url: typeof window!=='undefined'? window.location.href : '' })
					),
					h('p',{className:'text-muted-foreground leading-relaxed text-base'}, product.description),
					h('div',{className:'text-3xl font-extrabold text-secondary'}, formatPrice(product.price)),
					// Nutrition
					hasNutrition ? h('div',{className:'pt-2'},
						h('h4',{className:'text-sm font-semibold mb-2 text-primary uppercase tracking-wide'},'Nutritional Information (per serving)'),
						h('div',{className:'border rounded-xl overflow-hidden bg-white shadow-sm'},
							h('table',{className:'w-full text-sm'},
								h('tbody',{},
									nutritionRow('Energy (Kcal)', product.energyKcal),
									nutritionRow('Protein (g)', product.proteinG),
									nutritionRow('Carbohydrates (g)', product.carbohydratesG),
									nutritionRow('Total Sugar (g)', product.totalSugarG),
									nutritionRow('Added Sugar (g)', product.addedSugarG),
									nutritionRow('Total Fat (g)', product.totalFatG),
									nutritionRow('Saturated Fat (g)', product.saturatedFatG),
									nutritionRow('Trans Fat (g)', product.transFatG)
								)
							)
						)
					) : null,
					// Mobile qualities bar (appears below nutrition on phones)
					h('div',{className:'md:hidden pt-4'},
						h('div',{className:'rounded-2xl bg-[#f6f1e6] border border-[#e5dccd] px-4 py-6 shadow-sm'},
							// reuse smaller layout (3 cols per row)
							h('ul',{className:'grid grid-cols-3 gap-4 text-center justify-items-center'},[
								// Vegan Friendly
								h('li',{key:'vegan-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,className:'w-7 h-7 text-primary'},
											h('path',{d:'M5 3c3 5 6 7 11 8.5M5 3l1.5 7M5 3l7 1.5'}),
											h('path',{d:'M12 21c4.5-4 7-8 7-12V5l-4 1'}))
									),
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto'},'VEGAN FRIENDLY')
								),
								// Natural Ingredients
								h('li',{key:'natural-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,className:'w-7 h-7 text-primary'},
											h('path',{d:'M12 3a9 9 0 019 9c0 4.97-4.03 9-9 9S3 16.97 3 12c0-.91.12-1.79.34-2.62'}),
											h('path',{d:'M8 13c1.5 1.5 3 1.5 5.5-1S18 8 18 8'}))
									),
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto text-center'},'NATURAL INGREDIENTS')
								),
								// Finest Quality
								h('li',{key:'quality-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,className:'w-7 h-7 text-primary'},
											h('path',{d:'M12 2l2.39 4.84L20 8l-3.8 3.7.9 5.3L12 15.9 6.9 17l.9-5.3L4 8l5.61-1.16z'}))
									),
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto'},'FINEST QUALITY')
								),
								// Made in India
								h('li',{key:'india-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.2,className:'w-7 h-7 text-primary'},
											h('path',{d:'M8 4l2 1 2-1 2 1 2-1 1 2-1 2 1 2-1 2 1 2-1 2-2-1-2 1-2-1-2 1-1-2 1-2-1-2 1-2-1-2z'}))
									),
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto'},'MADE IN INDIA')
								),
								// Melt Free Delivery
								h('li',{key:'meltfree-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,className:'w-7 h-7 text-primary'},
											h('rect',{x:3,y:7,width:18,height:10,rx:2}),
											h('path',{d:'M7 7V5a5 5 0 0110 0v2'}))) ,
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto'},'MELT FREE DELIVERY')
								),
								// No Soy Lecithin
								h('li',{key:'nosoy-m',className:'flex flex-col items-center gap-1'},
									h('span',{className:'w-12 h-12 rounded-full flex items-center justify-center border-2 border-primary/40 relative'},
										h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,className:'w-7 h-7 text-primary'},
											h('circle',{cx:12,cy:12,r:8}),
											h('path',{d:'M8 12c1.5 2 3 2 4 0s2.5-2 4 0'})),
										h('span',{className:'absolute inset-0 flex items-center justify-center pointer-events-none'},
											h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,className:'w-12 h-12 text-primary/40'},
												h('line',{x1:4,y1:4,x2:20,y2:20})))
									),
									h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[66px] mx-auto'},'NO SOY LECITHIN')
								)
							])
						)
					),
					// Suggestions
					suggestions.length>0 ? h('div',{className:'pt-4'},
						h('h4',{className:'text-sm font-semibold mb-3 text-primary uppercase tracking-wide'},'You might also like'),
						h('div',{className:'grid grid-cols-2 gap-4'},
							suggestions.map(s => h('a',{key:(s.id||s._id), href:`/products/${s.slug||s.id||s._id}`, className:'group text-left border rounded-lg p-2 bg-white/80 hover:bg-white hover:shadow transition'},
								h('img',{src:s.image, alt:s.name, className:'w-full h-28 object-cover rounded mb-2'}),
								h('div',{className:'text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors'}, s.name),
								h('div',{className:'text-[11px] text-muted-foreground'}, formatPrice(s.price))
							))
						)
					) : null,
					// Add to cart button (sticky)
					h('div',{className:'pt-2 sticky bottom-0 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-gray-200 pb-4'},
						h('button',{onClick:()=>addToCart(product), disabled:product.inStock===0, className:'w-full bg-primary hover:bg-green-800 text-white font-semibold py-4 rounded-xl text-lg transition disabled:opacity-60 disabled:cursor-not-allowed'}, product.inStock===0? 'Out of Stock':'Add to Cart')
					)
				)
			)
		)
	);
};

export default ProductDetailPage;