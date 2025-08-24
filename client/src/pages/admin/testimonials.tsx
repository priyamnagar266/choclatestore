import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin-nav';
import { useAdminAuth } from '@/components/admin-auth';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Save, Trash2, GripVertical, X } from 'lucide-react';

interface Testimonial { _id?: string; name: string; role: string; text: string; rating: number; order?: number; active?: boolean; }

export default function AdminTestimonialsPage(){
  const { adminUser } = useAdminAuth();
  const { user } = useAuth();
  const token = adminUser?.token || (user?.role==='admin'? user.token: undefined);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Testimonial | null>(null);

  async function api(path: string, init: RequestInit = {}){
    if(!token) throw new Error('No token');
    const res = await fetch(path, { ...init, headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}`, ...(init.headers||{}) } });
    if(!res.ok){ const data = await res.json().catch(()=>({})); throw new Error(data.message|| 'Request failed'); }
    return res.json();
  }

  async function load(){
    if(!token) return; setLoading(true); setError('');
    try { const list = await api('/api/admin/testimonials'); setItems(list); }
    catch(e:any){ setError(e.message); }
    finally{ setLoading(false);} }

  useEffect(()=>{ load(); },[token]);

  function startNew(){ setEditing({ name:'', role:'', text:'', rating:5, active:true, order: items.length }); }
  function startEdit(t:Testimonial){ setEditing({...t}); }
  function cancelEdit(){ setEditing(null); }

  async function save(){
    if(!editing) return;
    const payload = { name: editing.name, role: editing.role, text: editing.text, rating: editing.rating, active: editing.active, order: editing.order };
    try {
      if(editing._id){
        const updated = await api('/api/admin/testimonials/'+editing._id, { method:'PATCH', body: JSON.stringify(payload) });
        setItems(prev => prev.map(p=> p._id===updated._id? updated : p));
      } else {
        const created = await api('/api/admin/testimonials', { method:'POST', body: JSON.stringify(payload) });
        setItems(prev => [...prev, created].sort((a,b)=>(a.order||0)-(b.order||0)));
      }
      setEditing(null);
    } catch(e:any){ alert(e.message); }
  }

  async function remove(id?:string){ if(!id) return; if(!confirm('Delete testimonial?')) return;
    try { await api('/api/admin/testimonials/'+id, { method:'DELETE' }); setItems(prev => prev.filter(p=>p._id!==id)); }
    catch(e:any){ alert(e.message); }
  }

  function reorder(from:number, to:number){ if(to<0||to>=items.length) return; setItems(prev => {
    const copy=[...prev]; const [m]=copy.splice(from,1); copy.splice(to,0,m); return copy.map((t,i)=>({...t, order:i})); }); }

  async function persistOrder(){
    for(const t of items){ if(!t._id) continue; try{ await api('/api/admin/testimonials/'+t._id,{ method:'PATCH', body: JSON.stringify({ order:t.order }) }); }catch{/* ignore */} }
    alert('Order saved');
  }

  return React.createElement(AdminLayout,null,
    React.createElement('div',{className:'max-w-5xl mx-auto p-6 space-y-6'},
      React.createElement('div',{className:'flex items-center justify-between'},
        React.createElement('h1',{className:'text-2xl font-bold'},'Testimonials'),
        React.createElement('div',{className:'flex gap-2'},
          React.createElement(Button,{size:'sm',variant:'outline',onClick:persistOrder,disabled:loading},'Save Order'),
          React.createElement(Button,{size:'sm',onClick:startNew},React.createElement(Plus,{className:'h-4 w-4 mr-1'}),' New')
        )
      ),
      error && React.createElement('div',{className:'text-red-500 text-sm'},error),
      loading && React.createElement('div',{className:'text-sm text-neutral-500'},'Loading...'),
      React.createElement('div',{className:'space-y-3'},
        items.sort((a,b)=>(a.order||0)-(b.order||0)).map((t,i)=> React.createElement(Card,{key:t._id||i,className:'border border-neutral-200'},
          React.createElement(CardContent,{className:'p-4 flex items-start gap-4'},
            React.createElement('div',{className:'flex flex-col items-center gap-2'},
              React.createElement('button',{className:'p-1 rounded hover:bg-neutral-100',onClick:()=>reorder(i,i-1),title:'Move up'},'↑'),
              React.createElement('button',{className:'p-1 rounded hover:bg-neutral-100',onClick:()=>reorder(i,i+1),title:'Move down'},'↓')
            ),
            React.createElement('div',{className:'flex-1'},
              React.createElement('div',{className:'flex flex-wrap gap-2 items-center justify-between'},
                React.createElement('h2',{className:'font-semibold'},t.name || '(No name)'),
                React.createElement('div',{className:'flex gap-2 items-center'},
                  React.createElement('span',{className:'text-xs text-neutral-500'},'Rating: '+t.rating),
                  React.createElement('span',{className:'text-xs px-2 py-0.5 rounded-full border'},t.active? 'Active':'Hidden')
                )
              ),
              React.createElement('p',{className:'text-sm text-neutral-600 mt-2 line-clamp-2'},t.text),
              React.createElement('div',{className:'mt-2 text-xs text-neutral-500'},t.role),
              React.createElement('div',{className:'mt-3 flex gap-2'},
                React.createElement(Button,{size:'sm',variant:'outline',onClick:()=>startEdit(t)},'Edit'),
                React.createElement(Button,{size:'sm',variant:'destructive',onClick:()=>remove(t._id)},React.createElement(Trash2,{className:'h-3 w-3'}))
              )
            ),
            React.createElement('div',{className:'w-12 h-12 rounded-full bg-white border flex items-center justify-center font-semibold text-amber-500'},t.name?.charAt(0))
          )
        ))
      ),
      editing && React.createElement(Card,{className:'border border-neutral-300'},
        React.createElement(CardHeader,{className:'pb-2 flex flex-row items-center justify-between'},
          React.createElement(CardTitle,{className:'text-base font-semibold'},editing._id? 'Edit Testimonial':'New Testimonial'),
          React.createElement('button',{onClick:cancelEdit,className:'text-neutral-500 hover:text-black'},React.createElement(X,{className:'h-4 w-4'}))
        ),
        React.createElement(CardContent,{className:'space-y-4'},
          React.createElement('div',{className:'grid md:grid-cols-2 gap-4'},
            React.createElement('div',null,
              React.createElement('label',{className:'text-xs font-medium'},'Name'),
              React.createElement(Input,{value:editing.name,onChange:e=>setEditing(p=>p?{...p,name:(e.target as HTMLInputElement).value}:p),placeholder:'Full name'})
            ),
            React.createElement('div',null,
              React.createElement('label',{className:'text-xs font-medium'},'Role / Title'),
              React.createElement(Input,{value:editing.role,onChange:e=>setEditing(p=>p?{...p,role:(e.target as HTMLInputElement).value}:p),placeholder:'e.g. Software Engineer'})
            ),
            React.createElement('div',null,
              React.createElement('label',{className:'text-xs font-medium'},'Rating (1-5)'),
              React.createElement(Input,{type:'number',min:1,max:5,value:editing.rating,onChange:e=>setEditing(p=>p?{...p,rating:Math.max(1,Math.min(5,Number((e.target as HTMLInputElement).value)||5))}:p)})
            ),
            React.createElement('div',null,
              React.createElement('label',{className:'text-xs font-medium'},'Order'),
              React.createElement(Input,{type:'number',value:editing.order ?? 0,onChange:e=>setEditing(p=>p?{...p,order:Number((e.target as HTMLInputElement).value)||0}:p)})
            ),
            React.createElement('div',{className:'flex items-center gap-2 pt-4'},
              React.createElement(Switch,{checked:!!editing.active,onCheckedChange:v=>setEditing(p=>p?{...p,active:v}:p)}),
              React.createElement('span',{className:'text-xs'},'Active')
            )
          ),
          React.createElement('div',null,
            React.createElement('label',{className:'text-xs font-medium'},'Text'),
            React.createElement(Textarea,{rows:5,value:editing.text,onChange:e=>setEditing(p=>p?{...p,text:(e.target as HTMLTextAreaElement).value}:p),placeholder:'Testimonial content...'})
          ),
          React.createElement('div',{className:'flex gap-2'},
            React.createElement(Button,{size:'sm',onClick:save},React.createElement(Save,{className:'h-4 w-4 mr-1'}),' Save'),
            React.createElement(Button,{size:'sm',variant:'outline',onClick:cancelEdit},'Cancel')
          )
        )
      )
    )
  );
}
