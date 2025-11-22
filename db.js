import { Client } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const client = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
});


