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
    const [formData, setFormData] = useState({ curso_id: '', materia_id: '', periodo: 'P1', logro: '' });

    // Filter states
    const [filterCurso, setFilterCurso] = useState('');
    const [filterMateria, setFilterMateria] = useState('');
    const [filterPeriodo, setFilterPeriodo] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (activeYear) {
            loadAchievements(activeYear.id);
        }
    }, [filterCurso, filterMateria, filterPeriodo, activeYear]);

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
                const { data: doc } = await supabase.from('docentes').select('id').eq('user_id', profile.id).single();

                if (doc) {
                    const { data: assigned } = await supabase
                        .from('docente_cursos')
                        .select('curso_id, cursos(id, nombre)')
                        .eq('docente_id', doc.id);

                    // For subjects, we'll need to fetch based on what's available in the assigned courses
                    const assignedCourses = assigned?.map(a => a.cursos) || [];
                    setCourses(assignedCourses);

                    if (assignedCourses.length > 0) {
                        const { data: assignedSubjects } = await supabase
                            .from('curso_materias')
                            .select('materias(id, nombre)')
                            .in('curso_id', assignedCourses.map(c => c.id));

                        // Unique subjects
                        const uniqueSubjects = [];
                        const seen = new Set();
                        assignedSubjects?.forEach(s => {
                            if (s.materias && !seen.has(s.materias.id)) {
                                seen.add(s.materias.id);
                                uniqueSubjects.push(s.materias);
                            }
                        });
                        setSubjects(uniqueSubjects);
                    }
                }
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
        let query = supabase
            .from('logros_generales')
            .select('*, cursos(nombre), materias(nombre)')
            .eq('anio_academico_id', yearId);

        if (filterCurso) query = query.eq('curso_id', filterCurso);
        if (filterMateria) query = query.eq('materia_id', filterMateria);
        if (filterPeriodo) query = query.eq('periodo', filterPeriodo);

        const { data } = await query.order('periodo', { ascending: true });
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
                const { error } = await supabase.from('logros_generales').update({ logro: formData.logro, periodo: formData.periodo }).eq('id', modal.data.id);
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
            setFormData({ curso_id: achievement.curso_id, materia_id: achievement.materia_id, periodo: achievement.periodo, logro: achievement.logro });
            setModal({ open: true, data: achievement });
        } else {
            setFormData({ curso_id: '', materia_id: '', periodo: 'P1', logro: '' });
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
                {/* Filter Bar */}
                <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border-b items-end">
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Filtrar por Curso</label>
                        <select
                            className="form-input !py-2 text-sm"
                            value={filterCurso}
                            onChange={e => setFilterCurso(e.target.value)}
                        >
                            <option value="">Todos los Cursos</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Filtrar por Materia</label>
                        <select
                            className="form-input !py-2 text-sm"
                            value={filterMateria}
                            onChange={e => setFilterMateria(e.target.value)}
                        >
                            <option value="">Todas las Materias</option>
                            {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Filtrar por Periodo</label>
                        <select
                            className="form-input !py-2 text-sm"
                            value={filterPeriodo}
                            onChange={e => setFilterPeriodo(e.target.value)}
                        >
                            <option value="">Todos los Periodos</option>
                            <option value="P1">Periodo 1</option>
                            <option value="P2">Periodo 2</option>
                            <option value="P3">Periodo 3</option>
                            <option value="P4">Periodo 4</option>
                        </select>
                    </div>
                    {(filterCurso || filterMateria || filterPeriodo) && (
                        <button
                            onClick={() => { setFilterCurso(''); setFilterMateria(''); setFilterPeriodo(''); }}
                            className="btn btn-ghost btn-sm text-blue-600 font-bold h-10 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-base">filter_alt_off</span>
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Curso</th>
                                <th>Materia</th>
                                <th>Periodo</th>
                                <th>Logro General</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {achievements.map((item) => (
                                <tr key={item.id}>
                                    <td className="font-bold text-slate-800">{item.cursos?.nombre}</td>
                                    <td className="text-slate-600 font-medium">{item.materias?.nombre}</td>
                                    <td><span className="badge badge-primary">{item.periodo}</span></td>
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
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp !max-w-4xl">
                        <div className="modal-header">
                            <h3 className="modal-title">{modal.data ? 'Editar Logro' : 'Nuevo Logro'}</h3>
                            <button onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost btn-sm">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form id="achievementForm" onSubmit={handleSubmit}>
                            <div className="modal-body overflow-y-auto max-h-[75vh] space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        <label className="form-label">Periodo</label>
                                        <select
                                            className="form-input" required
                                            disabled={!!modal.data}
                                            value={formData.periodo}
                                            onChange={e => setFormData({ ...formData, periodo: e.target.value })}
                                        >
                                            <option value="P1">Periodo 1</option>
                                            <option value="P2">Periodo 2</option>
                                            <option value="P3">Periodo 3</option>
                                            <option value="P4">Periodo 4</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label font-bold text-slate-700">Logro General (Sin verbo de inicio)</label>
                                    <textarea
                                        className="form-input min-h-[180px] resize-y text-base leading-relaxed" required
                                        placeholder="Ej: las operaciones básicas de matemáticas y su aplicación en problemas cotidianos."
                                        value={formData.logro}
                                        onChange={e => setFormData({ ...formData, logro: e.target.value })}
                                    ></textarea>
                                    <p className="text-xs text-slate-400 mt-2 italic flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">info</span>
                                        Este texto se concatenará con el verbo de la escala valorativa.
                                    </p>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary flex-1">{modal.data ? 'Actualizar Logro' : 'Guardar Logro'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
