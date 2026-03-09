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

    return (
        <AuthContext.Provider value={{ session, profile, loading, setProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
