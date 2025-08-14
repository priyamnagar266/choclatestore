import { useState, useRef } from "react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string; // backend may return string (e.g. from numeric/decimal)
  image: string;
  benefits: string[];
  category: string;
  inStock: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  image: string;
  benefits: string[];
  category: string;
  inStock: number;
  imageFile?: File | null;
}

interface ProductsResponse { products: Product[]; total: number; page: number; pageSize: number; }

export default function AdminProducts() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    image: "",
    benefits: [],
    category: "",
    inStock: 0,
    imageFile: null,
  });
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
  const response = await fetch(`/api/admin/products?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      return response.json();
    },
  enabled: !!token
  });

  const products = data?.products || [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const buildFormDataPayload = (payload: ProductFormData) => {
    const fd = new FormData();
    fd.append('name', payload.name);
    fd.append('description', payload.description);
    fd.append('price', String(payload.price));
    fd.append('category', payload.category);
    fd.append('inStock', String(payload.inStock));
    fd.append('benefits', payload.benefits.join(','));
    if (payload.image && !payload.imageFile) fd.append('image', payload.image);
    if (payload.imageFile) fd.append('imageFile', payload.imageFile);
    return fd;
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: buildFormDataPayload(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormData }) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: buildFormDataPayload(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/products/${id}`, {
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
    setFormData({ name: '', description: '', price: 0, image: '', benefits: [], category: '', inStock: 0, imageFile: null });
    setEditingProduct(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
  setFormData({ name: product.name, description: product.description, price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0, image: product.image, benefits: product.benefits, category: product.category, inStock: product.inStock, imageFile: null });
    setIsDialogOpen(true);
  };

  const filteredProducts = categoryFilter === 'all' ? products : products.filter(p => p.category === categoryFilter);

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} required />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={formData.category} onChange={(e)=>setFormData({...formData,category:e.target.value})} required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e)=>setFormData({...formData,description:e.target.value})} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e)=>setFormData({...formData,price:parseFloat(e.target.value)||0})} required />
                </div>
                <div>
                  <Label htmlFor="inStock">Stock</Label>
                  <Input id="inStock" type="number" value={formData.inStock} onChange={(e)=>setFormData({...formData,inStock:parseInt(e.target.value)||0})} required />
                </div>
                <div>
                  <Label htmlFor="imageFile">Image</Label>
                  <Input id="imageFile" ref={fileInputRef} type="file" accept="image/*" onChange={e=>setFormData({...formData,imageFile:e.target.files?.[0]||null})} />
                  {formData.image && !formData.imageFile && <p className='text-xs mt-1 truncate'>{formData.image}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="benefits">Benefits (comma separated)</Label>
                <Input id="benefits" value={formData.benefits.join(', ')} onChange={(e)=>setFormData({...formData,benefits:e.target.value.split(',').map(b=>b.trim()).filter(Boolean)})} />
              </div>
              {formData.imageFile && (
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <ImagePlus className='h-4 w-4' /> {formData.imageFile.name}
                </div>
              )}
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
              <Input placeholder="Search products..." value={searchTerm} onChange={(e)=>{setPage(1);setSearchTerm(e.target.value);}} className="pl-8" />
            </div>
            <div className='w-48'>
              <Select value={categoryFilter} onValueChange={(v)=>setCategoryFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Categories</SelectItem>
                  {Array.from(new Set(products.map(p=>p.category))).map(cat=> <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className='text-center'>Loading...</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className='text-center'>No products found</TableCell></TableRow>
              ) : (
                filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className='font-mono text-xs'>{product.id}</TableCell>
                    <TableCell><img src={product.image} alt={product.name} className='w-12 h-12 object-cover rounded' /></TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell><Badge variant='outline'>{product.category}</Badge></TableCell>
                    <TableCell>₹{(typeof product.price === 'number' ? product.price : parseFloat(product.price || '0') || 0).toFixed(2)}</TableCell>
                    <TableCell>{product.inStock}</TableCell>
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
