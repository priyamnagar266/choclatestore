import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from '@/components/admin-nav';
import { useAuth } from "@/components/auth-context";
import { useAdminAuth } from '@/components/admin-auth';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, ImagePlus } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string; // backend may return string (e.g. from numeric/decimal)
  salePrice?: number;
  image: string;
  benefits: string[];
  category: string;
  inStock: number;
  bestseller?: boolean;
  variants?: { label: string; price: number; salePrice?: number; inStock?: number; }[];
  energyKcal?: number; proteinG?: number; carbohydratesG?: number; totalSugarG?: number; addedSugarG?: number; totalFatG?: number; saturatedFatG?: number; transFatG?: number;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  image: string; // URL fallback
  imageFile: File | null; // optional file upload
  images?: string[]; // optional additional images (max 3 total including main)
  benefits: string[];
  category: string;
  inStock: number;
  bestseller?: boolean;
  variants?: { label: string; price: number; salePrice?: number; inStock?: number; }[];
  energyKcal?: number; proteinG?: number; carbohydratesG?: number; totalSugarG?: number; addedSugarG?: number; totalFatG?: number; saturatedFatG?: number; transFatG?: number;
}

interface ProductsResponse { products: Product[]; total: number; page: number; pageSize: number; }

// Allowed categories (locked list requested by user)
// Any legacy category on existing products will still appear (tagged as legacy) so it can be migrated.
const ALLOWED_CATEGORIES = [
  'Seed based Energy Bar',
  'Nuts based Energy Bar',
  'Dark Chocolates',
  'Milk Chocolates',
  'Indian Super Food Fusion',
  'Combo'
];

export default function AdminProducts() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Collect product IDs that have been edited but not yet applied (batched deploy)
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    slug: "",
    description: "",
    price: 0,
  salePrice: undefined,
    image: "",
    imageFile: null,
    benefits: [],
    category: "",
    inStock: 0,
  bestseller: false,
  variants: [],
    energyKcal: undefined,
    proteinG: undefined,
    carbohydratesG: undefined,
    totalSugarG: undefined,
    addedSugarG: undefined,
    totalFatG: undefined,
    saturatedFatG: undefined,
    transFatG: undefined,
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  // Keep a raw string for benefits so typing doesn't constantly reformat & reset cursor
  const [benefitsRaw, setBenefitsRaw] = useState("");
  // Fixed weight variant fields (30g & 60g)
  const [v30Price, setV30Price] = useState<string>('');
  const [v30Sale, setV30Sale] = useState<string>('');
  const [v60Price, setV60Price] = useState<string>('');
  const [v60Sale, setV60Sale] = useState<string>('');
  // Recalculate base product price/salePrice automatically from variants (lowest prices)
  useEffect(()=>{
    const prices: number[] = [];
    const saleCandidates: number[] = [];
    const p30 = parseFloat(v30Price);
    const p60 = parseFloat(v60Price);
    if(!Number.isNaN(p30) && p30>0) prices.push(p30);
    if(!Number.isNaN(p60) && p60>0) prices.push(p60);
    const s30 = parseFloat(v30Sale);
    if(!Number.isNaN(s30) && s30>0 && !Number.isNaN(p30) && s30 < p30) saleCandidates.push(s30);
    const s60 = parseFloat(v60Sale);
    if(!Number.isNaN(s60) && s60>0 && !Number.isNaN(p60) && s60 < p60) saleCandidates.push(s60);
    setFormData(f=> ({
      ...f,
      price: prices.length ? Math.min(...prices) : 0,
      salePrice: saleCandidates.length ? Math.min(...saleCandidates) : undefined,
    }));
  }, [v30Price,v30Sale,v60Price,v60Sale]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [categoryFilter, setCategoryFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ["admin-products", page, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchTerm) params.append('search', searchTerm);
  const response = await apiFetch(`/api/admin/products?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  return response.json();
    },
  enabled: !!token
  });

  // Normalize products (especially bestseller which may arrive as a string "false" / "true")
  const products = (data?.products || []).map(p => ({
    ...p,
    bestseller: typeof (p as any).bestseller === 'string'
      ? ((p as any).bestseller.toLowerCase() === 'true')
      : !!p.bestseller
  }));
  // Debounce search input -> searchTerm
  useEffect(()=>{
    const t = setTimeout(()=>{ setPage(1); setSearchTerm(searchInput.trim()); }, 300);
    return ()=>clearTimeout(t);
  }, [searchInput]);
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const buildFormDataPayload = (payload: ProductFormData) => {
    const fd = new FormData();
    fd.append('name', payload.name);
    if (payload.slug) fd.append('slug', payload.slug);
    fd.append('description', payload.description);
    fd.append('price', String(payload.price));
  if (payload.salePrice != null && !Number.isNaN(payload.salePrice)) fd.append('salePrice', String(payload.salePrice)); else fd.append('salePrice','');
    fd.append('category', payload.category);
  fd.append('inStock', String(payload.inStock));
  if (typeof payload.bestseller === 'boolean') fd.append('bestseller', String(payload.bestseller));
    fd.append('benefits', payload.benefits.join(','));
    if (payload.images && payload.images.length) {
      // store as JSON string (server currently ignores but future-ready)
      fd.append('images', JSON.stringify(payload.images.slice(0,3)));
    }
    // Build variants array from fixed weight fields (overrides free-form variants if provided)
    const fixedVariants: any[] = [];
    const p30 = parseFloat(v30Price);
    if (!Number.isNaN(p30) && p30 > 0) {
      const s30 = parseFloat(v30Sale);
      fixedVariants.push({ label: '30g', price: p30, ...( !Number.isNaN(s30) && s30>0 ? { salePrice: s30 }: {} ) });
    }
    const p60 = parseFloat(v60Price);
    if (!Number.isNaN(p60) && p60 > 0) {
      const s60 = parseFloat(v60Sale);
      fixedVariants.push({ label: '60g', price: p60, ...( !Number.isNaN(s60) && s60>0 ? { salePrice: s60 }: {} ) });
    }
    if (fixedVariants.length) {
      fd.append('variants', JSON.stringify(fixedVariants));
    } else if (payload.variants && payload.variants.length) {
      fd.append('variants', JSON.stringify(payload.variants));
    } else {
      fd.append('variants', '');
    }
    if (payload.imageFile) {
      fd.append('image', payload.imageFile);
    } else if (payload.image) {
      fd.append('image', payload.image);
    }
    // Append nutrition only if provided
    const nutriKeys: (keyof ProductFormData)[] = ['energyKcal','proteinG','carbohydratesG','totalSugarG','addedSugarG','totalFatG','saturatedFatG','transFatG'];
    for (const k of nutriKeys) {
      const v = payload[k];
      if (v !== undefined && v !== null && !Number.isNaN(v)) fd.append(String(k), String(v));
    }
    return fd;
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiFetch('/api/admin/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: buildFormDataPayload(data)
      });
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // Mark as pending (needs rebuild for static JSON) if id present
      if (created?.id) setPendingChanges(prev => new Set([...Array.from(prev), created.id]));
      toast({ title: 'Product created', description: 'Remember to Apply Changes to trigger rebuild.' });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormData }) => {
      const response = await apiFetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: buildFormDataPayload(data)
      });
      return response.json();
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-products'] });
      const previousData = queryClient.getQueryData(['admin-products', page, searchTerm]);
      queryClient.setQueryData(['admin-products', page, searchTerm], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          products: old.products.map((p: any) =>
            p.id === id ? { ...p, ...data } : p
          ),
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['admin-products', page, searchTerm], context.previousData);
      }
    },
    onSettled: async () => {
      // Wait for the query to be refetched and data to be up-to-date before closing modal and showing toast
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      // Optionally, you can await the next query to finish loading
      await queryClient.refetchQueries({ queryKey: ['admin-products', page, searchTerm] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: 'Product updated successfully', description: 'The product changes are now live on the site.' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
  });

  const resetForm = () => {
  setFormData({ name: '', slug: '', description: '', price: 0, salePrice: undefined, image: '', imageFile: null, images: [], benefits: [], category: '', inStock: 0, bestseller:false, variants: [] });
    setBenefitsRaw('');
    setV30Price(''); setV30Sale(''); setV60Price(''); setV60Sale('');
    setSlugManuallyEdited(false);
    setEditingProduct(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
  updateProductMutation.mutate({ id: editingProduct.id, data: formData }, { onSuccess: ()=> setPendingChanges(prev => { const arr = Array.from(prev); if(!arr.includes(editingProduct.id)) arr.push(editingProduct.id); return new Set(arr); }) });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  setFormData({ name: product.name, slug: (product as any).slug || '', description: product.description, price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0, salePrice: (product as any).salePrice != null ? Number((product as any).salePrice) : undefined, image: product.image, imageFile: null, images: (product as any).images || [], benefits: product.benefits, category: product.category, inStock: product.inStock, bestseller: ((): boolean => { const v:any = (product as any).bestseller; return typeof v === 'string' ? v.toLowerCase()==='true' : !!v; })(), variants: product.variants || [], energyKcal: product.energyKcal, proteinG: product.proteinG, carbohydratesG: product.carbohydratesG, totalSugarG: product.totalSugarG, addedSugarG: product.addedSugarG, totalFatG: product.totalFatG, saturatedFatG: product.saturatedFatG, transFatG: product.transFatG });
  setBenefitsRaw(product.benefits?.join(', ') || '');
    // Prefill fixed weight fields if variants exist
    const v30 = (product.variants || []).find(v=> v.label.toLowerCase() === '30g');
    const v60 = (product.variants || []).find(v=> v.label.toLowerCase() === '60g');
    setV30Price(v30 ? String(v30.price) : '');
    setV30Sale(v30 && v30.salePrice != null ? String(v30.salePrice) : '');
    setV60Price(v60 ? String(v60.price) : '');
    setV60Sale(v60 && v60.salePrice != null ? String(v60.salePrice) : '');
    setIsDialogOpen(true);
  };
  // Auto slug generation
  useEffect(()=>{
    if (!slugManuallyEdited) {
      setFormData(f=> ({ ...f, slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) }));
    }
  }, [formData.name, slugManuallyEdited]);

  const filteredProducts = categoryFilter === 'all' ? products : products.filter(p => p.category === categoryFilter);
  const bestsellerCount = products.filter(p=>p.bestseller).length;

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Management</h1>
  <div className="flex gap-2 items-center">
          {pendingChanges.size > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-300">{pendingChanges.size} pending</span>
          )}
          <Button variant="secondary" disabled={pendingChanges.size===0 || createProductMutation.isPending || updateProductMutation.isPending}
            onClick={async ()=>{
              // Trigger static products regeneration & Netlify build via backend manual endpoint
              try {
                await apiFetch('/api/admin/trigger-rebuild', { method:'POST', headers:{ Authorization: `Bearer ${token}` }});
                toast({ title: 'Deploy triggered', description: 'Rebuild started with your pending changes.' });
                setPendingChanges(new Set());
              } catch {
                toast({ title:'Failed to trigger rebuild', variant:'destructive' });
              }
            }}>Apply Changes</Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} required />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" value={formData.slug} onChange={(e)=>{ setSlugManuallyEdited(true); setFormData({...formData,slug:e.target.value}); }} placeholder="auto-generated" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOWED_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      {/* Legacy category fallback */}
                      {formData.category && !ALLOWED_CATEGORIES.includes(formData.category) && (
                        <SelectItem value={formData.category}>{formData.category} (legacy)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="inStock">Stock</Label>
                  <Input id="inStock" type="number" value={formData.inStock} onChange={(e)=>setFormData({...formData,inStock:parseInt(e.target.value)||0})} required />
                </div>
                <div className="col-span-2 flex flex-col justify-end text-[11px] text-muted-foreground">
                  <div>Base Price & Sale Price auto-set from lowest variant values.</div>
                  {formData.price>0 && (
                    <div className="mt-1 flex gap-2 items-center">
                      <span className="font-medium">Base: {formatPrice(formData.price)}</span>
                      {formData.salePrice!=null && formData.salePrice < formData.price && (
                        <span className="text-green-600 font-medium">Sale: {formatPrice(formData.salePrice)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-3 grid grid-cols-2 gap-4 border rounded-md p-3">
                  <div className="col-span-2 font-semibold text-xs text-muted-foreground tracking-wide">Weight Variants (30g & 60g)</div>
                  <div className="space-y-1">
                    <Label className="text-xs">30g Price</Label>
                    <Input type="number" step="0.01" value={v30Price} onChange={e=> setV30Price(e.target.value)} placeholder="e.g. 50" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">30g Sale Price</Label>
                    <Input type="number" step="0.01" value={v30Sale} onChange={e=> setV30Sale(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">60g Price</Label>
                    <Input type="number" step="0.01" value={v60Price} onChange={e=> setV60Price(e.target.value)} placeholder="e.g. 90" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">60g Sale Price</Label>
                    <Input type="number" step="0.01" value={v60Sale} onChange={e=> setV60Sale(e.target.value)} placeholder="Optional" />
                  </div>
                  <p className="col-span-2 text-[10px] text-muted-foreground">Leave price blank to omit that weight. Sale price must be less than its price.</p>
                </div>
                {/* Image & Bestseller Row */}
                <div className="col-span-3 grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Images</Label>
                    <div className="flex flex-col gap-2">
                      <Input id="imageUrl" placeholder="Main image URL" value={formData.image} onChange={e=>setFormData({...formData,image:e.target.value})} />
                      <input type="file" accept="image/*" onChange={e=>{ const file=e.target.files?.[0]||null; setFormData({...formData,imageFile:file}); if(file){ setFormData(f=>({...f,image:''})); } }} />
                      <div className="mt-2 flex gap-2 items-center flex-wrap">
                        {(formData.imageFile || formData.image) && (
                          <img src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : formData.image} alt="Main" className="w-16 h-16 object-cover rounded border" />
                        )}
                        {formData.images && formData.images.slice(0,2).map((u,i)=>(
                          <img key={i} src={u} alt={`Extra ${i+2}`} className="w-16 h-16 object-cover rounded border" />
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold tracking-wide text-muted-foreground">Additional Images</div>
                        {[0,1].map(idx => {
                          const val = formData.images?.[idx] || '';
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <Input placeholder={`Image ${idx+2} URL`} value={val} onChange={e=>{
                                const arr = [...(formData.images||[])];
                                arr[idx] = e.target.value;
                                setFormData({...formData, images: arr.map(s=>s).filter(s=>s && s.trim()).slice(0,3)});
                              }} />
                              {val && <button type="button" onClick={()=>{
                                const arr = [...(formData.images||[])];
                                arr.splice(idx,1);
                                setFormData({...formData, images: arr});
                              }} className="text-xs text-red-600 hover:underline">Remove</button>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label htmlFor="bestseller" className="mb-1">Bestseller</Label>
                    <button type="button" onClick={()=> setFormData(f=>({...f,bestseller:!f.bestseller}))} className={`h-10 px-3 rounded border text-sm font-medium ${formData.bestseller ? 'bg-green-600 text-white border-green-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>{formData.bestseller ? 'Yes' : 'No'}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="energyKcal">Energy (kcal)</Label>
                  <Input id="energyKcal" type="number" value={formData.energyKcal ?? ''} onChange={(e)=>setFormData({...formData,energyKcal:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="proteinG">Protein (g)</Label>
                  <Input id="proteinG" type="number" value={formData.proteinG ?? ''} onChange={(e)=>setFormData({...formData,proteinG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="carbohydratesG">Carbs (g)</Label>
                  <Input id="carbohydratesG" type="number" value={formData.carbohydratesG ?? ''} onChange={(e)=>setFormData({...formData,carbohydratesG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="totalSugarG">Sugar (g)</Label>
                  <Input id="totalSugarG" type="number" value={formData.totalSugarG ?? ''} onChange={(e)=>setFormData({...formData,totalSugarG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="addedSugarG">Added Sugar (g)</Label>
                  <Input id="addedSugarG" type="number" value={formData.addedSugarG ?? ''} onChange={(e)=>setFormData({...formData,addedSugarG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="totalFatG">Total Fat (g)</Label>
                  <Input id="totalFatG" type="number" value={formData.totalFatG ?? ''} onChange={(e)=>setFormData({...formData,totalFatG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="saturatedFatG">Sat. Fat (g)</Label>
                  <Input id="saturatedFatG" type="number" value={formData.saturatedFatG ?? ''} onChange={(e)=>setFormData({...formData,saturatedFatG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
                <div>
                  <Label htmlFor="transFatG">Trans Fat (g)</Label>
                  <Input id="transFatG" type="number" value={formData.transFatG ?? ''} onChange={(e)=>setFormData({...formData,transFatG:e.target.value?parseFloat(e.target.value):undefined})} />
                </div>
              </div>
              <div>
                <Label htmlFor="benefits">Benefits (comma separated)</Label>
                <Input
                  id="benefits"
                  value={benefitsRaw}
                  onChange={(e)=> setBenefitsRaw(e.target.value)}
                  onBlur={()=> setFormData({...formData, benefits: benefitsRaw.split(',').map(b=>b.trim()).filter(Boolean)})}
                  placeholder="e.g. Mood Booster, Stress Relief"
                />
                {/* Hidden sync on submit in case user never blurs */}
                <input type="hidden" value={benefitsRaw} readOnly />
              </div>
              {/* No file upload preview */}
              <div className='flex justify-end gap-2'>
                <Button type='button' variant='outline' onClick={()=>setIsDialogOpen(false)}>Cancel</Button>
                <Button type='submit' disabled={createProductMutation.isPending || updateProductMutation.isPending}>{editingProduct ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." value={searchInput} onChange={(e)=>setSearchInput(e.target.value)} className="pl-8" />
            </div>
            <div className='w-48'>
              <Select value={categoryFilter} onValueChange={(v)=>setCategoryFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  {ALLOWED_CATEGORIES.map(cat=> <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  {products.some(p=> !ALLOWED_CATEGORIES.includes(p.category)) && (
                    Array.from(new Set(products.filter(p=> !ALLOWED_CATEGORIES.includes(p.category)).map(p=>p.category))).map(legacy => (
                      <SelectItem key={legacy} value={legacy}>{legacy} (legacy)</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <span>Total: {data?.total || 0}</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                  <TableHead>Slug</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Bestseller</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className='text-center'>Loading...</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className='text-center'>No products found</TableCell></TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className='font-mono text-xs'>{product.id}</TableCell>
                    <TableCell className='font-mono text-[10px] max-w-[140px] truncate'>{(product as any).slug || <span className='text-muted-foreground'>—</span>}</TableCell>
                    <TableCell><img src={product.image} alt={product.name} className='w-12 h-12 object-cover rounded' /></TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell><Badge variant='outline'>{product.category}</Badge></TableCell>
                    <TableCell>{formatPrice(product.price)}</TableCell>
                    <TableCell>{(product as any).salePrice ? (
                      <div className='flex flex-col text-xs'>
                        <span className='font-semibold text-green-700'>{formatPrice((product as any).salePrice as any)}</span>
                        {((product as any).salePrice < product.price) && <span className='text-[10px] text-gray-400 line-through'>{formatPrice(product.price)}</span>}
                        {typeof (product as any).salePrice === 'number' && (product as any).salePrice < product.price && (
                          <span className='text-[10px] font-medium text-red-600'>
                            -{(() => { const sp = Number((product as any).salePrice); const p = Number(product.price); if(!p || p<=0) return 0; return Math.round((1 - (sp / p)) * 100); })()}%
                          </span>
                        )}
                      </div>
                    ) : <span className='text-muted-foreground text-xs'>—</span>}</TableCell>
                    <TableCell className='text-xs'>
                      {product.variants && product.variants.length ? (
                        <div className='flex flex-col gap-0.5 max-w-[140px]'>
                          {product.variants.slice(0,3).map(v => (
                            <span key={v.label} className='truncate'>
                              {v.label}: {formatPrice(v.salePrice!=null && v.salePrice < v.price ? v.salePrice : v.price)}
                            </span>
                          ))}
                          {product.variants.length > 3 && <span className='text-[10px] text-muted-foreground'>+{product.variants.length-3} more</span>}
                        </div>
                      ) : <span className='text-muted-foreground'>—</span>}
                    </TableCell>
                    <TableCell>{product.inStock}</TableCell>
                    <TableCell>
                      <Button
                        variant={product.bestseller ? 'default':'outline'}
                        size='sm'
                        disabled={bestsellerCount >= 4 && !product.bestseller}
                        onClick={async ()=>{
                          try {
                            const desired = !product.bestseller;
                            const res = await apiFetch(`/api/admin/products/${product.id}/bestseller`, {
                              method:'PATCH',
                              headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
                              body: JSON.stringify({ bestseller: desired })
                            });
                            if (!res.ok) {
                              let msg = 'Failed to update bestseller';
                              try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
                              toast({ title:'Error', description: msg, variant:'destructive' });
                              return;
                            }
                            queryClient.invalidateQueries({ queryKey:['admin-products'] });
                            // Mark as pending so admin must Apply Changes to deploy
                            setPendingChanges(prev => new Set([...Array.from(prev), product.id]));
                            toast({ title:'Updated', description:`${product.name} ${desired ? 'marked as' : 'removed from'} bestsellers (pending deploy).` });
                          } catch { toast({ title:'Failed', variant:'destructive'}); }
                        }}
                      >{product.bestseller ? 'Yes' : 'No'}</Button>
                    </TableCell>
                    <TableCell>
                      <div className='flex gap-2'>
                        <Button variant='ghost' size='sm' onClick={()=>handleEdit(product)}><Edit className='h-4 w-4' /></Button>
                        <DeleteConfirm onConfirm={()=>deleteProductMutation.mutate(product.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className='flex justify-between items-center mt-4'>
            <div className='text-sm'>Page {page} / {totalPages}</div>
            <div className='space-x-2'>
              <Button size='sm' variant='outline' disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</Button>
              <Button size='sm' variant='outline' disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}

function DeleteConfirm({ onConfirm }: { onConfirm: ()=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='sm'>
          <Trash2 className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>This action cannot be undone. Continue?</p>
        <div className='flex justify-end gap-2 mt-4'>
          <Button variant='outline' size='sm' onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant='destructive' size='sm' onClick={()=>{ onConfirm(); setOpen(false); }}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
