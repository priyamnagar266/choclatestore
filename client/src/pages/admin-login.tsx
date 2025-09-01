import { useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { useAdminAuth } from '@/components/admin-auth';
import { useLocation } from 'wouter';

export default function AdminLogin() {
  const { login } = useAuth();
  const { setAdminUser } = useAdminAuth();
  const [ , setLocation ] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  let data: any = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    // Probably an HTML error page (missing backend base URL or 404). Avoid JSON parse crash.
    const text = await res.text();
    throw new Error(res.status === 404 ? 'API endpoint not found (check backend URL / deploy redirects).' : `Unexpected response (${res.status}).`);
  }
  if (!res.ok) throw new Error(data?.message || 'Login failed');
  if (!data?.token) throw new Error('Missing token in response');
  if (data.role !== 'admin') throw new Error('Not an admin user');
  // Persist
  setAdminUser(data);
  // Ensure localStorage write flushed before navigating to avoid race with AdminLayout rehydrate
  await new Promise(r => setTimeout(r, 20));
  setLocation('/admin/home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
      <form onSubmit={handleSubmit} className='w-full max-w-sm bg-white shadow-md rounded p-6 space-y-4'>
        <h1 className='text-xl font-semibold text-center'>Admin Login</h1>
  {error && <div className='text-sm text-red-600' role='alert'>{error}</div>}
        <div className='space-y-1'>
          <label className='block text-sm font-medium'>Email</label>
          <input type='email' value={email} onChange={e=>setEmail(e.target.value)} required className='w-full border rounded px-3 py-2 text-sm'/>
        </div>
        <div className='space-y-1'>
          <label className='block text-sm font-medium'>Password</label>
          <input type='password' value={password} onChange={e=>setPassword(e.target.value)} required className='w-full border rounded px-3 py-2 text-sm'/>
        </div>
        <button disabled={loading} className='w-full bg-black text-white py-2 rounded text-sm disabled:opacity-50'>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
