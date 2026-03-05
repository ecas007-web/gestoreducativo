import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nnyxempayhkokekuyrlu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueXhlbXBheWhrb2tla3V5cmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjczMzcsImV4cCI6MjA4ODMwMzMzN30.3bOw2-s8-L5tZC0Qmq0sY5jdfP-hoZizj2BvfmgdyeE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const ADMIN_CREATOR_EMAIL = import.meta.env.VITE_ADMIN_CREATOR_EMAIL;
export const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME;
