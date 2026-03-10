import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './config.jsx';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (data) {
                // Si es docente, pre-cargar sus cursos asignados
                if (data.rol === 'docente') {
                    const { data: teacherData } = await supabase
                        .from('docentes')
                        .select('id, docente_cursos(cursos(*))')
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (teacherData) {
                        data.assignedCourses = teacherData.docente_cursos
                            ?.map(dc => dc.cursos)
                            .filter(Boolean) || [];
                    }
                }
                setProfile(data);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error);
    };

    useEffect(() => {
        let timer;
        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            if (session) {
                timer = setTimeout(() => {
                    console.log("Cierre de sesión por inactividad");
                    signOut();
                }, INACTIVITY_LIMIT);
            }
        };

        if (session) {
            // Eventos que reinician el contador
            const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            events.forEach(event => window.addEventListener(event, resetTimer));

            resetTimer(); // Llamada inicial

            return () => {
                if (timer) clearTimeout(timer);
                events.forEach(event => window.removeEventListener(event, resetTimer));
            };
        }
    }, [session]);

    return (
        <AuthContext.Provider value={{ session, profile, loading, setProfile, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
