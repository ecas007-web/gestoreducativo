import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';

export const TeacherDashboard = () => {
    const { profile } = useAuth();
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.assignedCourses) {
            setAssignedCourses(profile.assignedCourses);
            setLoading(false);
        } else if (profile?.id) {
            loadAssigned();
        }
    }, [profile]);

    const loadAssigned = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('docentes')
                .select(`
                    id,
                    docente_cursos (
                        cursos (*)
                    )
                `)
                .eq('user_id', profile.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const courses = data.docente_cursos
                    ?.map(dc => dc.cursos)
                    .filter(Boolean) || [];
                setAssignedCourses(courses);
            }
        } catch (err) {
            console.error("Error al cargar cursos:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando cursos asignados...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Mis Cursos</h2>
                    <p className="text-slate-500 font-medium">Gestiona el progreso académico de tus grupos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedCourses.map(c => (
                    <div key={c.id} className="card card-hover animate-fadeInUp">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">school</span>
                            </div>
                            <span className="badge badge-success">Activo</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{c.nombre}</h3>
                        <p className="text-sm text-slate-500 mb-8 line-clamp-2">{c.descripcion || 'Sin descripción del curso.'}</p>
                        <Link to={`/docente/calificaciones/${c.id}`} className="btn btn-primary btn-block">
                            <span className="material-symbols-outlined text-base">edit_note</span> Subir Calificaciones
                        </Link>
                    </div>
                ))}
                {assignedCourses.length === 0 && (
                    <div className="col-span-full card text-center py-20 border-dashed border-2">
                        <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">event_busy</span>
                        <p className="text-slate-400 font-bold">No tienes cursos asignados actualmente.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
