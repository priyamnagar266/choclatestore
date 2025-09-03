// Admin login via Netlify Function
import { getDb } from './lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { json, handleOptions } from './lib/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return handleOptions();
  if (event.httpMethod !== 'POST') return json(405,{ message:'Method Not Allowed' });
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;
    if (!email || !password) return json(400,{ message:'Email and password required' });
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user) return json(401,{ message:'Invalid credentials' });
    if (user.role !== 'admin') return json(403,{ message:'Not an admin user' });
    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return json(401,{ message:'Invalid credentials' });
    const userId = user._id?.toString?.() || user.id;
    const token = jwt.sign({ id: userId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return json(200,{ id: userId, email: user.email, name: user.name, role: user.role, token });
  } catch (e){
    return json(500,{ message:'Login failed', error: e.message });
  }
}