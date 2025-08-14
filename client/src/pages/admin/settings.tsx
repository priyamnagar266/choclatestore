import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin-nav';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SettingsResponse {
  profile: { id: string; name: string; email: string };
  store: { currency: string; taxRate: number; shippingCharges: number };
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { adminUser } = useAdminAuth();
  const token = adminUser?.token || (user?.role === 'admin' ? user.token : undefined);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<SettingsResponse>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
  const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  enabled: !!token
  });

  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });
  const [storeForm, setStoreForm] = useState({ currency: 'INR', taxRate: 0, shippingCharges: 0 });

  useEffect(() => {
    if (data) {
      setProfileForm({ name: data.profile?.name || '', email: data.profile?.email || '', password: '' });
      setStoreForm({ currency: data.store.currency, taxRate: data.store.taxRate, shippingCharges: data.store.shippingCharges });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
  const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setProfileForm(p => ({ ...p, password: '' }));
    }
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ profile: { name: profileForm.name, email: profileForm.email, password: profileForm.password || undefined } });
  };

  const handleStoreSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ store: { ...storeForm } });
  };

  return (
    <AdminLayout>
    <div className='p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div>Loading...</div>}
          {error && <div className='text-red-500 text-sm'>{(error as any).message}</div>}
          {data && (
            <Tabs defaultValue='profile'>
              <TabsList className='mb-4'>
                <TabsTrigger value='profile'>Profile</TabsTrigger>
                <TabsTrigger value='store'>Store</TabsTrigger>
              </TabsList>
              <TabsContent value='profile'>
                <form onSubmit={handleProfileSave} className='space-y-4 max-w-md'>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Name</label>
                    <Input value={profileForm.name} onChange={e=>setProfileForm({...profileForm,name:e.target.value})} required />
                  </div>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Email</label>
                    <Input type='email' value={profileForm.email} onChange={e=>setProfileForm({...profileForm,email:e.target.value})} required />
                  </div>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Password (leave blank to keep)</label>
                    <Input type='password' value={profileForm.password} onChange={e=>setProfileForm({...profileForm,password:e.target.value})} />
                  </div>
                  <Button type='submit' disabled={updateMutation.isPending}>Save Profile</Button>
                </form>
              </TabsContent>
              <TabsContent value='store'>
                <form onSubmit={handleStoreSave} className='space-y-4 max-w-md'>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Currency</label>
                    <Input value={storeForm.currency} onChange={e=>setStoreForm({...storeForm,currency:e.target.value})} required />
                  </div>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Tax Rate (%)</label>
                    <Input type='number' step='0.01' value={storeForm.taxRate} onChange={e=>setStoreForm({...storeForm,taxRate:parseFloat(e.target.value)||0})} required />
                  </div>
                  <div>
                    <label className='block text-xs mb-1 font-medium'>Shipping Charges</label>
                    <Input type='number' step='0.01' value={storeForm.shippingCharges} onChange={e=>setStoreForm({...storeForm,shippingCharges:parseFloat(e.target.value)||0})} required />
                  </div>
                  <Button type='submit' disabled={updateMutation.isPending}>Save Store Settings</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
