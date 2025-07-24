import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
import path from 'path';

dotenv.config({
    path: process.env.NODE_ENV === "production"
        ? path.resolve(__dirname, "../../.env.production")
        : path.resolve(__dirname, "../../.env"),
});

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing required .env variables: SUPABASE_URL or SUPABASE_ANON_KEY");
}

const supabasePublic = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export default supabasePublic;