import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nnyxempayhkokekuyrlu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueXhlbXBheWhrb2tla3V5cmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjczMzcsImV4cCI6MjA4ODMwMzMzN30.3bOw2-s8-L5tZC0Qmq0sY5jdfP-hoZizj2BvfmgdyeE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    await supabase.auth.signInWithPassword({ email: 'ecas007@hotmail.es', password: 'password123' }); // standard simple password assumption
    const { data: pagos, error: errPagos } = await supabase.from('pagos').select('*').limit(5).order('created_at', { ascending: false });
    console.log("Pagos Error:", errPagos ? errPagos.message : null);
    if (pagos) console.log("Pagos (registrado_por):", pagos.map(p => ({ id: p.id, reg_por: p.registrado_por })));

    const { data: profiles, error: errProf } = await supabase.from('profiles').select('*').limit(5);
    console.log("Profiles Error:", errProf ? errProf.message : null);
    if (profiles) {
        console.log("Profiles:");
        profiles.forEach(p => console.log(typeof p.id, p.id, p.nombres, p.apellidos, p.rol));
    }
}

check();
