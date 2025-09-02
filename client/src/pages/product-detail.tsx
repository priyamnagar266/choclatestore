// Fresh rewrite to avoid hidden parse issues in previous version.
// JSX-free implementation (using React.createElement) so it works even if JSX transform misconfigured.
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/products";
import ProductShare from "@/components/ProductShare";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Leaf, Sprout, Star, Flag, Snowflake, CircleSlash, Tag, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product { id: any; _id?: any; slug?: string; name: string; description: string; price: number; salePrice?: number; image: string; images?: string[]; category?: string; inStock?: number; energyKcal?: number; proteinG?: number; carbohydratesG?: number; totalSugarG?: number; addedSugarG?: number; totalFatG?: number; saturatedFatG?: number; transFatG?: number; promoMessage?: string; variants?: { label: string; price: number; salePrice?: number; inStock?: number }[]; }
// Add images?: string[] for carousel support
interface ProductWithImages extends Product { images?: string[]; }
interface Props { slug: string; }
// Shared qualities definition so we can render desktop & mobile variants from one source
const QUALITIES = [
	{ key: 'vegan', label: 'VEGAN FRIENDLY', Icon: Leaf },
	{ key: 'natural', label: 'NATURAL INGREDIENTS', Icon: Sprout },
	{ key: 'quality', label: 'FINEST QUALITY', Icon: Star },
	{ key: 'india', label: 'MADE IN INDIA', Icon: Flag },
	{ key: 'nopreservatives', label: 'NO PRESERVATIVES', Icon: CircleSlash },
];

// Optional promo overrides (keyed by slugified name)
const PROMO_OVERRIDES: Record<string,string> = {
	'khas-badam-dark-chocolate': 'BUY 2 GET 1 FREE | Auto-applied at checkout',
	'rose-pistachio-chocolate': 'Intro Offer: 10% OFF this week',
	'orange-zest-dark-chocolate': 'Limited Time: Free Shipping',
	'khas-badam-dark-chocolate-combo': 'Combo Offer: Any 3 Fusion Bars @ ₹350'
};

function slugifyName(name?: string){
	return (name||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

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
	if (found) {
		// If static product missing variants, try live API to enrich
		if (!('variants' in found) || !Array.isArray((found as any).variants) || (found as any).variants.length === 0) {
			try {
				const r = await fetch(`/api/products/slug/${slug}`, { cache: 'no-cache' });
				if (r.ok) {
					const fresh = await r.json();
					if (fresh && Array.isArray(fresh.variants) && fresh.variants.length) return fresh;
				}
			} catch {}
		}
		return found;
	}
	// slug-specific API fallback only if not present in static
	try {
		const r = await fetch(`/api/products/slug/${slug}`);
		if (r.ok) return r.json();
	} catch {}
	return null;
}

function nutritionRow(label: string, value: any){ if(value==null || isNaN(Number(value))) return null; return h('tr',{className:'even:bg-neutral/40'}, h('td',{className:'py-1.5 px-3 font-medium text-primary whitespace-nowrap'}, label), h('td',{className:'py-1.5 px-3 text-right tabular-nums'}, Number(value))); }

const ProductDetailPage: React.FC<Props> = ({ slug }) => {
		const { addToCart, openCart } = useCart();
		const [selectedVariantLabel, setSelectedVariantLabel] = React.useState<string | null>(null);
		const { toast } = useToast();
		const { data: productRaw, isLoading, error } = useQuery<Product | null>({ queryKey:["product", slug], queryFn:()=>fetchProductBySlugStaticFirst(slug) });
		const { data: all } = useQuery<Product[]>({ queryKey:["products-all"], queryFn:fetchAllStaticFirst, staleTime:120000 });
		const product = productRaw as ProductWithImages | null;
		// Variant selection (must be before early returns so hook order is stable)
		const variants: any[] = Array.isArray((product as any)?.variants) ? (product as any)?.variants : [];
		React.useEffect(()=>{ if(selectedVariantLabel && !variants.find(v=> v.label === selectedVariantLabel)) setSelectedVariantLabel(null); }, [variants, selectedVariantLabel]);

		// Carousel state
		const [imgIdx, setImgIdx] = React.useState(0);
		const images: string[] = product && Array.isArray(product.images) && product.images.length > 0 ? product.images : (product ? [product.image] : []);
		const showArrows = images.length > 1;
		React.useEffect(() => { setImgIdx(0); }, [product]);

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
	const computedPromo = product.promoMessage || PROMO_OVERRIDES[product.slug || slugifyName(product.name)] || '';

		const leftColumn = h('div',{className:'w-full space-y-8'},
			h('div',{className:'bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200'},
				h('div',{className:'relative w-full'},
					h('img',{
						src: images[imgIdx],
						alt: product.name,
						className: 'w-full h-[420px] md:h-[520px] object-cover object-top rounded-xl',
					}),
											showArrows && [
												h('button', {
													key: 'prev',
													type: 'button',
													'aria-label': 'Previous image',
													onClick: (e: any) => { e.stopPropagation(); setImgIdx(idx => (idx - 1 + images.length) % images.length); },
													className: 'absolute left-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20 transition',
													style: { display: 'block' }
												  }, h(ChevronLeft, { className: 'w-8 h-8 text-white drop-shadow-lg' })),
												h('button', {
													key: 'next',
													type: 'button',
													'aria-label': 'Next image',
													onClick: (e: any) => { e.stopPropagation(); setImgIdx(idx => (idx + 1) % images.length); },
													className: 'absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20 transition',
													style: { display: 'block' }
												  }, h(ChevronRight, { className: 'w-8 h-8 text-white drop-shadow-lg' })),
						h('div', {
							key: 'dots',
							className: 'absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20'
						}, images.map((_, i) => h('span', {
							key: i,
							className: `inline-block w-3 h-3 border-2 border-primary rounded-full ${i === imgIdx ? 'bg-primary' : 'bg-gray-300'}`
						})))
					],
				),
				product.inStock===0 ? h('div',{className:'mt-4 text-sm font-semibold text-red-600 text-center'},'Out of Stock') : null
			),
		h('div',{className:'hidden md:block rounded-2xl bg-[#f6f1e6] border border-[#e5dccd] px-6 md:px-8 py-8 shadow-sm'},
			h('ul',{className:'grid grid-cols-3 sm:grid-cols-5 gap-6 md:gap-10 text-center justify-items-center'},
				QUALITIES.map(q => h('li',{key:q.key,className:'flex flex-col items-center gap-3'},
					h('span',{className:'w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/40'}, h(q.Icon,{className:'w-8 h-8 text-primary'})),
					h('span',{className:'text-[9px] font-semibold tracking-wide leading-tight max-w-[70px] mx-auto'}, q.label)
				))
			)
		)
	);

	// Resolve effective price based on selected variant or base
	function resolvePrice(base: Product){
		if(selectedVariantLabel){ const v = variants.find(v=> v.label===selectedVariantLabel); if(v){ const effSale = (v.salePrice!=null && v.salePrice < v.price) ? v.salePrice : undefined; return { price: v.price, sale: effSale }; } }
		// If no selection & variants exist, keep base product prices (already lowest from admin auto logic)
		const sale = (base.salePrice!=null && base.salePrice < base.price) ? base.salePrice : undefined; return { price: base.price, sale };
	}
	const { price: effectivePrice, sale: effectiveSale } = resolvePrice(product);

	const rightColumn = h('div',{className:'space-y-6'},
		h('div',{className:'flex items-center gap-2'},
			h('h1',{className:'text-3xl md:text-4xl font-bold tracking-tight text-primary'}, product.name),
			h(ProductShare,{ url: typeof window!=='undefined'? window.location.href : '', inline:true })
		),
		h('p',{className:'text-muted-foreground leading-relaxed text-base'}, product.description),
		// Variant buttons + price inline (requested)
		h('div',{className:'flex items-center flex-wrap gap-4'},[
			// Price first
			effectiveSale ? h('div',{className:'flex items-baseline gap-3'},[
				h('span',{className:'text-2xl md:text-3xl font-extrabold text-secondary'}, formatPrice(effectiveSale)),
				h('span',{className:'text-lg md:text-xl line-through text-gray-400'}, formatPrice(effectivePrice))
			]) : h('div',{className:'text-3xl font-extrabold text-secondary'}, formatPrice(effectivePrice)),
			// Variant buttons aligned to right side of row
			variants.length ? h('div',{className:'flex flex-wrap gap-2 ml-auto'}, variants.map(v=>{
				const active = selectedVariantLabel === v.label;
				const disabled = v.inStock === 0;
				return h('button',{
					key:v.label,
					type:'button',
					onClick:()=> !disabled && setSelectedVariantLabel(v.label),
					className:`px-3 py-1 rounded border text-sm transition ${active ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-primary/5 border-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`
				}, v.label);
			})) : null
		]),
		// Promo / discount message (desktop)
		computedPromo ? h('div',{className:'flex items-start gap-2 text-sm text-primary font-semibold bg-white/70 border border-primary/20 rounded-xl px-4 py-3'},
			h(Tag,{className:'w-5 h-5 mt-0.5 text-primary'}),
			h('span',{className:'tracking-wide'}, computedPromo)
		) : null,
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
		h('div',{className:'pt-2 sticky bottom-0 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-gray-200 pb-4'},
			h('button',{
				onClick:()=>{ const temp = selectedVariantLabel ? { ...product, tempSelectedVariant: variants.find(v=>v.label===selectedVariantLabel) } : product; addToCart(temp); toast({ title: 'Added to cart!', description: product.name + ' has been added to your cart.' }); },
				disabled:product.inStock===0,
				className:'w-full bg-primary hover:bg-green-800 text-white font-semibold py-4 rounded-xl text-lg transition disabled:opacity-60 disabled:cursor-not-allowed'
			}, product.inStock===0? 'Out of Stock':'Add to Cart')
		)
	);

	// Mobile-specific simplified layout (separate to allow different ordering)
		const mobileLayout = h('div',{className:'md:hidden space-y-6'},
			h('div',{className:'-mx-4'}, // full-bleed image
				h('div',{className:'bg-white rounded-none relative'},
					h('img',{
						src: images[imgIdx],
						alt: product.name,
						className: 'w-full h-[420px] object-cover object-top'
					}),
											showArrows && [
												h('button', {
													key: 'prev',
													type: 'button',
													'aria-label': 'Previous image',
													onClick: (e: any) => { e.stopPropagation(); setImgIdx(idx => (idx - 1 + images.length) % images.length); },
													className: 'absolute left-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20 transition',
													style: { display: 'block' }
												}, h(ChevronLeft, { className: 'w-8 h-8 text-white drop-shadow-lg' })),
												h('button', {
													key: 'next',
													type: 'button',
													'aria-label': 'Next image',
													onClick: (e: any) => { e.stopPropagation(); setImgIdx(idx => (idx + 1) % images.length); },
													className: 'absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20 transition',
													style: { display: 'block' }
												}, h(ChevronRight, { className: 'w-8 h-8 text-white drop-shadow-lg' })),
						h('div', {
							key: 'dots',
							className: 'absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20'
						}, images.map((_, i) => h('span', {
							key: i,
							className: `inline-block w-3 h-3 border-2 border-primary rounded-full ${i === imgIdx ? 'bg-primary' : 'bg-gray-300'}`
						})))
					],
				)
			),
		h('div',{className:'px-1 flex items-center justify-between gap-3'},
			h('h1',{className:'text-2xl font-bold tracking-tight text-primary flex-1'}, product.name),
			h(ProductShare,{ url: typeof window!=='undefined'? window.location.href : '', inline:false })
		),
		// Mobile variant buttons + price inline
		h('div',{className:'px-1 flex items-center flex-wrap gap-4'},[
			// Price first
			effectiveSale ? h('div',{className:'flex items-baseline gap-2'},[
				h('span',{className:'text-2xl font-extrabold text-secondary'}, formatPrice(effectiveSale)),
				h('span',{className:'text-lg line-through text-gray-400'}, formatPrice(effectivePrice))
			]) : h('div',{className:'text-2xl font-extrabold text-secondary'}, formatPrice(effectivePrice)),
			// Variants to the right
			variants.length ? h('div',{className:'flex flex-wrap gap-2 ml-auto'}, variants.map(v=>{
				const active = selectedVariantLabel === v.label;
				const disabled = v.inStock === 0;
				return h('button',{
					key:v.label,
					onClick:()=> !disabled && setSelectedVariantLabel(v.label),
					className:`px-3 py-1 rounded border text-xs ${active ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-primary/5 border-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`
				}, v.label);
			})) : null
		]),
		computedPromo ? h('div',{className:'px-1'},
			h('div',{className:'flex items-start gap-2 text-sm text-primary font-semibold bg-white/70 border border-primary/20 rounded-lg px-3 py-2'},
				h(Tag,{className:'w-4 h-4 mt-0.5 text-primary'}),
				h('span',{className:'tracking-wide'}, computedPromo)
			)
		) : null,
		h('div',{className:'px-1 text-muted-foreground leading-relaxed text-base'}, product.description),
		h('div',{className:'rounded-2xl bg-[#f6f1e6] border border-[#e5dccd] px-3 py-4 shadow-sm'},
			h('ul',{className:'flex flex-row gap-2 justify-between'},
				QUALITIES.map(q => h('li',{key:q.key+'-m2',className:'flex flex-col items-center gap-1 flex-1'},
					h('span',{className:'w-11 h-11 rounded-full flex items-center justify-center border-2 border-primary/40'}, h(q.Icon,{className:'w-5 h-5 text-primary'})),
					h('span',{className:'text-[8px] font-semibold tracking-wide leading-tight text-center'}, q.label)
				))
			)
		),
		hasNutrition ? h('div',{className:'pt-2'},
			h('h4',{className:'text-sm font-semibold mb-2 text-primary uppercase tracking-wide'},'Nutritional Information'),
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
		suggestions.length>0 ? h('div',{},
			h('h4',{className:'text-sm font-semibold mb-3 text-primary uppercase tracking-wide'},'You might also like'),
			h('div',{className:'grid grid-cols-2 gap-4'},
				suggestions.map(s => h('a',{key:(s.id||s._id), href:`/products/${s.slug||s.id||s._id}`, className:'group text-left border rounded-lg p-2 bg-white/80 hover:bg-white hover:shadow transition'},
					h('img',{src:s.image, alt:s.name, className:'w-full h-24 object-cover rounded mb-2'}),
					h('div',{className:'text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors'}, s.name),
					h('div',{className:'text-[11px] text-muted-foreground'}, formatPrice(s.price))
				))
			)
		) : null,
		h('div',{className:'h-24'}), // spacer for fixed bar
		// fixed add to cart (no variant buttons here)
		h('div',{className:'fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-gray-200 px-4 pt-3 pb-5'},
			h('button',{
				onClick:()=>{ const temp = selectedVariantLabel ? { ...product, tempSelectedVariant: variants.find(v=>v.label===selectedVariantLabel) } : product; addToCart(temp); toast({ title: 'Added to cart!', description: product.name + ' has been added to your cart.' }); },
				disabled:product.inStock===0,
				className:'w-full bg-primary hover:bg-green-800 text-white font-semibold py-4 rounded-xl text-lg transition disabled:opacity-60 disabled:cursor-not-allowed'
			}, product.inStock===0? 'Out of Stock':'Add to Cart')
		)
	);

	return h('div',{className:'min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e6eef3] py-8 md:py-10'},
		h('div',{className:'max-w-6xl mx-auto px-4 md:px-8 space-y-10'},
			mobileLayout,
			h('div',{className:'hidden md:grid md:grid-cols-2 gap-10 items-start'}, leftColumn, rightColumn)
		)
	);
};

export default ProductDetailPage;