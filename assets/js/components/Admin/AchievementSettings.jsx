import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const AchievementSettings = () => {
    const { profile } = useAuth();
    const [years, setYears] = useState([]);
    const [activeYear, setActiveYear] = useState(null);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [achievements, setAchievements] = useState([]);

    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: null });
    const [formData, setFormData] = useState({ curso_id: '', materia_id: '', logro: '' });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Load active academic year
            const { data: yData } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            setActiveYear(yData);

            // 2. Load Courses and subjects based on role
            if (profile.rol === 'admin') {
                const [cRes, mRes] = await Promise.all([
                    supabase.from('cursos').select('*').order('nombre'),
                    supabase.from('materias').select('*').order('nombre')
                ]);
                setCourses(cRes.data || []);
                setSubjects(mRes.data || []);
            } else {
                // If teacher, load only assigned courses and subjects
                const { data: assigned } = await supabase
                    .from('docente_cursos')
                    .select('curso_id, cursos(id, nombre)')
                    .eq('docente_id', profile.id);

                // For subjects, we'll need to fetch based on what's available in the assigned courses
                const assignedCourses = assigned?.map(a => a.cursos) || [];
                setCourses(assignedCourses);

                const { data: assignedSubjects } = await supabase
                    .from('curso_materias')
                    .select('materias(id, nombre)')
                    .in('curso_id', assignedCourses.map(c => c.id));

                // Unique subjects
                const uniqueSubjects = [];
                const seen = new Set();
                assignedSubjects?.forEach(s => {
                    if (!seen.has(s.materias.id)) {
                        seen.add(s.materias.id);
                        uniqueSubjects.push(s.materias);
                    }
                });
                setSubjects(uniqueSubjects);
            }

            // 3. Load existing achievements for the active year
            if (yData) {
                loadAchievements(yData.id);
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al cargar datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadAchievements = async (yearId) => {
        const { data } = await supabase
            .from('logros_generales')
            .select('*, cursos(nombre), materias(nombre)')
            .eq('anio_academico_id', yearId);
        setAchievements(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeYear) return mostrarToast('No hay un año académico activo.', 'warning');

        const payload = {
            ...formData,
            anio_academico_id: activeYear.id
        };

        try {
            if (modal.data) {
                const { error } = await supabase.from('logros_generales').update({ logro: formData.logro }).eq('id', modal.data.id);
                if (error) throw error;
                mostrarToast('Logro actualizado', 'success');
            } else {
                const { error } = await supabase.from('logros_generales').insert([payload]);
                if (error) throw error;
                mostrarToast('Logro creado', 'success');
            }
            setModal({ open: false, data: null });
            loadAchievements(activeYear.id);
        } catch (error) {
            mostrarToast(error.message === 'duplicate key value violates unique constraint "logros_generales_curso_id_materia_id_anio_academico_id_key"' ? 'Ya existe un logro para esta materia y curso.' : error.message, 'error');
        }
    };

    const openModal = (achievement = null) => {
        if (achievement) {
            setFormData({ curso_id: achievement.curso_id, materia_id: achievement.materia_id, logro: achievement.logro });
            setModal({ open: true, data: achievement });
        } else {
            setFormData({ curso_id: '', materia_id: '', logro: '' });
            setModal({ open: true, data: null });
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando gestión de logros...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Logros Generales {activeYear && <span className="text-blue-600">({activeYear.anio})</span>}</h2>
                    <p className="text-slate-500 font-medium">Define los logros que se aplicarán a las calificaciones de este año.</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nuevo Logro
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Curso</th>
                                <th>Materia</th>
                                <th>Logro General</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {achievements.map((item) => (
                                <tr key={item.id}>
                                    <td className="font-bold text-slate-800">{item.cursos?.nombre}</td>
                                    <td className="text-slate-600 font-medium">{item.materias?.nombre}</td>
                                    <td className="text-slate-500 text-sm italic max-w-md truncate">{item.logro}</td>
                                    <td className="text-right">
                                        <button onClick={() => openModal(item)} className="btn btn-ghost btn-sm">
                                            <span className="material-symbols-outlined text-slate-400">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {achievements.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-20 text-slate-400">No se han definido logros para este año académico.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal.open && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">{modal.data ? 'Editar Logro' : 'Nuevo Logro'}</h3>
                            <button onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost p-1 h-auto">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Curso</label>
                                <select
                                    className="form-input" required
                                    disabled={!!modal.data}
                                    value={formData.curso_id}
                                    onChange={e => setFormData({ ...formData, curso_id: e.target.value })}
                                >
                                    <option value="">Seleccionar Curso...</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Materia</label>
                                <select
                                    className="form-input" required
                                    disabled={!!modal.data}
                                    value={formData.materia_id}
                                    onChange={e => setFormData({ ...formData, materia_id: e.target.value })}
                                >
                                    <option value="">Seleccionar Materia...</option>
                                    {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Logro General (Sin verbo de inicio)</label>
                                <textarea
                                    className="form-input h-32 resize-none" required
                                    placeholder="Ej: las operaciones básicas de matemáticas y su aplicación en problemas cotidianos."
                                    value={formData.logro}
                                    onChange={e => setFormData({ ...formData, logro: e.target.value })}
                                ></textarea>
                                <p className="text-xs text-slate-400 mt-1 italic">Este texto se concatenará con el verbo de la escala valorativa.</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost flex-1">Cancelar</button>
                                <button type="submit" className="btn btn-primary flex-1">{modal.data ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
