import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DBNAME || "cokhaenergyfoods";
export const client = new MongoClient(uri);
export const db = client.db(dbName);
