import { createClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
import path from 'path';

dotenv.config({
    path: process.env.NODE_ENV === "production"
        ? path.resolve(__dirname, "../../../.env.production")
        : path.resolve(__dirname, "../../../.env"),
});

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing required .env variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default supabaseAdmin;