
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DBNAME || "cokhaenergyfoods";

// Diagnostics: mask credentials and log host once at startup
try {
	const masked = uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@]+):([^@]+)@/, (_m, proto, user) => `${proto}${user}:****@`);
	const hostMatch = masked.match(/@([^/]+)\//);
	const host = hostMatch ? hostMatch[1] : (masked.includes('localhost') ? 'localhost' : 'unknown-host');
	if (process.env.NODE_ENV === 'production') {
		if (/localhost|127\.0\.0\.1/.test(uri)) {
			console.error('[DB] WARNING: Production environment using local MongoDB URI. Set MONGODB_URI to your Atlas connection string.');
		} else {
			console.log(`[DB] Using MongoDB host: ${host}`);
		}
	} else {
		console.log(`[DB] (dev) Mongo URI host: ${host}`);
	}
} catch {}

export const client = new MongoClient(uri);
export const db = client.db(dbName);
export default db;
