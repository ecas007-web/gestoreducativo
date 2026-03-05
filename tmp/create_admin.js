import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovjyllyuzskjovcypgbt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92anlsbHl1enNram92Y3lwZ2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMDYyMDcsImV4cCI6MjA1NjY4MjIwN30.2r8m_Yy7_D9oXj_W9vY7X_P9r7v_Yy7_D9oXj_W9vY7'; // Este es el anon key del config.jsx del usuario
// Nota: Para crear usuarios directamente con password se usa signUp.

const createAdmin = async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const email = 'ecas007@hotmail.es';
    const password = 'Eduardo3798426';
    const userData = {
        nombres: 'Eduardo',
        apellidos: 'Castro',
        tipo_documento: 'CC',
        numero_documento: '3798426',
        rol: 'admin'
    };

    console.log('Intentando crear admin...');

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        });

        if (error) throw error;

        console.log('Usuario creado exitosamente:', data.user.id);

        // El trigger de Supabase debería crear el profile, pero nos aseguramos
        const { error: profError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                ...userData,
                correo: email
            });

        if (profError) console.error('Error al crear perfil:', profError);
        else console.log('Perfil de administrador configurado correctamente.');

    } catch (err) {
        console.error('Error:', err.message);
    }
};

createAdmin();
