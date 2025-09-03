// Admin settings (GET profile+store, PUT update store/profile)
import { getDb } from './lib/db.js';
import { verifyAdmin, json, handleOptions } from './lib/auth.js';
import bcrypt from 'bcryptjs';

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  const auth = verifyAdmin(event); if (auth.error) return json(auth.error.statusCode,{ message: auth.error.message });
  try {
    const db = await getDb();
    const users = db.collection('users');
    const settings = db.collection('settings');
    const adminId = auth.payload.id;
    if (event.httpMethod === 'GET') {
      const user = await users.findOne({ _id: new (await import('mongodb')).ObjectId(adminId) }).catch(()=>null) || await users.findOne({ id: adminId }).catch(()=>null);
      const storeDoc = await settings.findOne({ key:'storeSettings' });
      const store = { currency: storeDoc?.currency || 'INR', taxRate: typeof storeDoc?.taxRate==='number'?storeDoc.taxRate:0, shippingCharges: typeof storeDoc?.shippingCharges==='number'?storeDoc.shippingCharges:0 };
      return json(200,{ profile:{ id: adminId, name: user?.name, email: user?.email }, store });
    }
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { profile, store } = body;
      if (profile) {
        const upd = {};
        if (profile.name) upd.name = profile.name;
        if (profile.email) upd.email = profile.email;
        if (profile.password) upd.password = await bcrypt.hash(profile.password,10);
        if (Object.keys(upd).length) {
          try { await users.updateOne({ _id: new (await import('mongodb')).ObjectId(adminId) }, { $set: upd }); } catch { await users.updateOne({ id: adminId }, { $set: upd }); }
        }
      }
      if (store) {
        const storeUpd = {};
        if (store.currency) storeUpd.currency = store.currency;
        if (typeof store.taxRate === 'number') storeUpd.taxRate = store.taxRate;
        if (typeof store.shippingCharges === 'number') storeUpd.shippingCharges = store.shippingCharges;
        if (Object.keys(storeUpd).length) {
          await settings.updateOne({ key:'storeSettings' }, { $set: { key:'storeSettings', ...storeUpd } }, { upsert:true });
        }
      }
      return json(200,{ success:true });
    }
    return json(405,{ message:'Method Not Allowed' });
  } catch (e){
    return json(500,{ message:'Failed to process settings', error: e.message });
  }
}