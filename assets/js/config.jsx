import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente secundario para registro de usuarios desde Admin sin cerrar su sesión 
export const authAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

export const ADMIN_CREATOR_EMAIL = import.meta.env.VITE_ADMIN_CREATOR_EMAIL;
export const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME;
