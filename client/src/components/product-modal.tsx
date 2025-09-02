import React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Leaf, Sprout, Star, Flag, CircleSlash } from 'lucide-react';
import ProductShare from '@/components/ProductShare';
import { formatPrice } from '@/lib/products';
import type { Product } from '@shared/schema';

interface ProductModalProps {
	product: Product;
	trigger?: React.ReactNode;
	onAddToCart: (p: Product) => void;
	productsAll?: Product[];
	maxSuggestions?: number;
}

const QUALITIES = [
	{ key: 'vegan', label: 'VEGAN FRIENDLY', Icon: Leaf },
	{ key: 'natural', label: 'NATURAL INGREDIENTS', Icon: Sprout },
	{ key: 'quality', label: 'FINEST QUALITY', Icon: Star },
	{ key: 'india', label: 'MADE IN INDIA', Icon: Flag },
	{ key: 'nopreservatives', label: 'NO PRESERVATIVES', Icon: CircleSlash },
];

export function ProductModal({ product, trigger, onAddToCart, productsAll, maxSuggestions = 2 }: ProductModalProps){
	const [open, setOpen] = React.useState(false);
	const [currentProduct, setCurrentProduct] = React.useState<Product>(product);
	const [selectedVariantLabel, setSelectedVariantLabel] = React.useState<string | null>(null);
	const [imgIdx, setImgIdx] = React.useState(0);
	const [suggestions, setSuggestions] = React.useState<Product[]>([]);
	const images: string[] = Array.isArray(currentProduct.images) && currentProduct.images.length>0 ? currentProduct.images : [currentProduct.image];
	const showArrows = images.length>1;
	const recompute = React.useCallback(()=>{
		try {
			const globalList: any = (window as any).__ALL_PRODUCTS;
			const list: Product[] | undefined = (productsAll && productsAll.length>0 ? productsAll : globalList);
			if(!Array.isArray(list)) { setSuggestions([]); return; }
			const cid = (currentProduct as any).id || (currentProduct as any)._id;
			const same = list.filter(p => ((p as any).id || (p as any)._id) !== cid && p.category === currentProduct.category);
			const others = list.filter(p => ((p as any).id || (p as any)._id) !== cid && p.category !== currentProduct.category);
			const combined = [...same, ...others];
			const finalList = combined.length ? combined : list.filter(p => ((p as any).id || (p as any)._id) !== cid);
			setSuggestions(finalList.slice(0, maxSuggestions));
		} catch { setSuggestions([]); }
	}, [currentProduct, productsAll, maxSuggestions]);
	React.useEffect(()=>{ if(open) recompute(); },[open, recompute]);
	React.useEffect(()=>{ setImgIdx(0); },[currentProduct]);
	React.useEffect(()=>{ if(!open) setCurrentProduct(product); },[product, open]);
	// Reset variant on product change
	React.useEffect(()=>{ setSelectedVariantLabel(null); },[currentProduct]);
	React.useEffect(()=>{ if(!open) return; window.history.pushState({ pm:true }, ''); const onPop=()=>setOpen(false); window.addEventListener('popstate', onPop); return ()=>{ window.removeEventListener('popstate', onPop); if(window.history.state?.pm){ try{ window.history.back(); }catch{} } }; },[open]);
	const hasNutrition = [currentProduct.energyKcal,currentProduct.proteinG,currentProduct.carbohydratesG,currentProduct.totalSugarG,currentProduct.addedSugarG,currentProduct.totalFatG,currentProduct.saturatedFatG,currentProduct.transFatG].some(v=> v!=null && !isNaN(Number(v as any)));
	const h = React.createElement;
	const nutritionRows: React.ReactNode[] = [];
	function pushRow(label:string, val:any){ if(val!=null && !isNaN(Number(val))) nutritionRows.push(h(TableRow,{ key:label, label, value:Number(val) })); }
	pushRow('Energy (Kcal)', currentProduct.energyKcal);
	pushRow('Protein (g)', currentProduct.proteinG);
	pushRow('Carbohydrates (g)', currentProduct.carbohydratesG);
	pushRow('Total Sugar (g)', currentProduct.totalSugarG);
	pushRow('Added Sugar (g)', currentProduct.addedSugarG);
	pushRow('Total Fat (g)', currentProduct.totalFatG);
	pushRow('Saturated Fat (g)', currentProduct.saturatedFatG);
	pushRow('Trans Fat (g)', currentProduct.transFatG);

			const featureBadges = h('div',{className:'rounded-2xl bg-[#f6f1e6] border border-[#e5dccd] px-4 md:px-8 py-4 md:py-6 shadow-sm'},
				h('ul',{className:'flex justify-between gap-2 sm:grid sm:grid-cols-5 sm:gap-8 text-center'},
					QUALITIES.map(q => h('li',{key:q.key,className:'flex flex-col items-center gap-1'},
						h('span',{className:'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 border-primary/40'}, h(q.Icon,{className:'w-6 h-6 sm:w-8 sm:h-8 text-primary'})),
						h('span',{className:'text-[8px] sm:text-[9px] font-semibold tracking-wide leading-tight max-w-[68px] sm:max-w-[70px] mx-auto'}, q.label)
					))
				)
			);

	return h(Dialog,{ open, onOpenChange:setOpen },
		h(DialogTrigger,{ asChild:true }, trigger ?? h(Button,{ variant:'ghost' },'View')),
		h(DialogContent,{ className:'max-w-5xl w-full p-0 overflow-hidden max-h-[92vh] flex flex-col' },
			h('div',{className:'flex flex-col md:flex-row flex-1 overflow-hidden'},
				h('div',{className:'relative w-full md:w-1/2 bg-gray-50 shrink-0 flex items-center justify-center'},
					h('div',{className:'w-full h-60 md:h-full md:max-h-[92vh] overflow-hidden relative'},
						h('img',{ src: images[imgIdx], alt: currentProduct.name, className:'w-full h-full object-cover object-top md:object-center' }),
						showArrows && [
							h('button',{ key:'prev', type:'button', 'aria-label':'Previous image', onClick:(e:any)=>{ e.stopPropagation(); setImgIdx(i=>(i-1+images.length)%images.length); }, className:'absolute left-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20' }, h(ChevronLeft,{className:'w-8 h-8 text-white drop-shadow-lg'})),
							h('button',{ key:'next', type:'button', 'aria-label':'Next image', onClick:(e:any)=>{ e.stopPropagation(); setImgIdx(i=>(i+1)%images.length); }, className:'absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/20 border-0 rounded-full p-2 z-20' }, h(ChevronRight,{className:'w-8 h-8 text-white drop-shadow-lg'})),
							h('div',{ key:'dots', className:'absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20' }, images.map((_,i)=> h('span',{ key:i, className:`inline-block w-3 h-3 border-2 border-primary rounded-full ${i===imgIdx?'bg-primary':'bg-gray-300'}` })))
						]
					)
				),
				h('div',{className:'flex flex-col md:w-1/2 overflow-y-auto'},
					h('div',{className:'p-6 md:p-8 pb-32 md:pb-8 space-y-6'},
						h('div',{className:'flex items-center gap-2'},
							h(DialogTitle,{ className:'text-2xl font-semibold text-primary leading-tight' }, currentProduct.name),
							h(ProductShare,{ name:currentProduct.name, url: typeof window!=='undefined' ? window.location.origin + '/products/' + (currentProduct.slug || (currentProduct as any).id || (currentProduct as any)._id) : '', image: currentProduct.image })
						),
						h(DialogDescription,{ className:'mt-2 text-sm md:text-base text-muted-foreground leading-relaxed' }, currentProduct.description),
						// Pricing block (variant aware): show effective sale if any
						h('div',{className:'flex flex-col gap-3'},[
							h('div',{className:'flex items-center gap-4'},(()=>{
								const variants: any[] = Array.isArray((currentProduct as any).variants) ? (currentProduct as any).variants : [];
								let basePrice = currentProduct.price;
								let baseSale: number | undefined = (currentProduct as any).salePrice;
								if (variants.length && selectedVariantLabel) {
									const v = variants.find(v=> v.label === selectedVariantLabel);
									if (v) { basePrice = v.price; baseSale = v.salePrice; }
								}
								if (baseSale != null && baseSale < basePrice) {
									return [
										h('span',{ key:'sale', className:'text-2xl font-bold text-secondary' }, formatPrice(baseSale)),
										h('span',{ key:'orig', className:'text-lg font-semibold line-through text-gray-400/90' }, formatPrice(basePrice))
									];
								}
								return h('span',{className:'text-2xl font-bold text-secondary'}, formatPrice(basePrice));
							})()),
							// Variant selector buttons
							(()=>{
								const variants: any[] = Array.isArray((currentProduct as any).variants) ? (currentProduct as any).variants : [];
								if (!variants.length) return null;
								return h('div',{className:'flex flex-wrap gap-2'}, variants.map(v => {
									const active = selectedVariantLabel === v.label;
									return h('button',{
										key:v.label,
										type:'button',
										onClick:()=> setSelectedVariantLabel(v.label),
										className:`px-3 py-1 rounded border text-sm ${active ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-primary/5 border-gray-300'}`
									}, [
										v.label,
										' ',
										(v.salePrice != null && v.salePrice < v.price) ? h('span',{className:'text-xs font-semibold'}, formatPrice(v.salePrice)) : h('span',{className:'text-xs text-muted-foreground'}, formatPrice(v.price))
									]);
								}));
							})()
						]) ,
						featureBadges,
						hasNutrition && h('div',{},
							h('h4',{className:'text-sm font-semibold mb-2 text-primary'},'Nutritional Information (per serving)'),
							h('div',{className:'overflow-x-auto border rounded-md'},
								h('table',{className:'w-full text-xs md:text-sm'}, h('tbody',{}, nutritionRows ))
							)
						),
						suggestions.length>0 && h('div',{},
							h('h4',{className:'text-sm font-semibold mb-3 text-primary'},'You might also like'),
							h('div',{className:'grid grid-cols-2 gap-3'},
								suggestions.map(s => h('button',{ key:(s as any).id || (s as any)._id, onClick:()=>{ setCurrentProduct(s); setImgIdx(0); recompute(); try{ (document.querySelector('#pm-scroll') as HTMLElement)?.scrollTo({ top:0, behavior:'smooth'}); }catch{} }, className:'group text-left border rounded-md p-2 hover:border-primary/50 focus:outline-none bg-white/70 hover:bg-white transition-colors' },
									h('img',{ src:s.image, alt:s.name, className:'w-full h-24 object-cover rounded mb-2'}),
									h('div',{className:'text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors'}, s.name),
									h('div',{className:'text-[11px] text-muted-foreground'}, formatPrice(s.price))
								))
							)
						)
					),
					h('div',{className:'sticky bottom-0 bg-white/95 backdrop-blur border-t px-4 md:px-8 py-4 mt-auto'},
						h(Button,{ onClick:()=> onAddToCart(currentProduct), disabled: currentProduct.inStock===0, className:'w-full bg-primary hover:bg-green-800 text-white' }, currentProduct.inStock===0 ? 'Out of Stock' : 'Add to Cart')
					)
				)
			)
		)
	);
}

interface TableRowProps { label: string; value: number; }
function TableRow({ label, value }: TableRowProps){
	return React.createElement('tr',{className:'even:bg-neutral/40'},
		React.createElement('td',{className:'py-1.5 px-3 font-medium text-primary whitespace-nowrap'}, label),
		React.createElement('td',{className:'py-1.5 px-3 text-right tabular-nums'}, value)
	);
}

