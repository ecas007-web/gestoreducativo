import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ActivitiesManager = () => {
    const { profile } = useAuth();
    const [activeYear, setActiveYear] = useState(null);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [activities, setActivities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false, data: null });
    const [formData, setFormData] = useState({ curso_id: '', materia_id: '', periodo: 'P1', actividad: 'TC1', descripcion: '' });

    // Filter states
    const [filterCurso, setFilterCurso] = useState('');
    const [filterMateria, setFilterMateria] = useState('');
    const [filterPeriodo, setFilterPeriodo] = useState('');

    const activityTypes = [
        { id: 'TC1', label: 'Tarea en clase 1' },
        { id: 'TC2', label: 'Tarea en clase 2' },
        { id: 'TC3', label: 'Tarea en clase 3' },
        { id: 'TC4', label: 'Tarea en clase 4' },
        { id: 'TH1', label: 'Tarea en casa 1' },
        { id: 'TH2', label: 'Tarea en casa 2' },
        { id: 'TH3', label: 'Tarea en casa 3' },
        { id: 'TH4', label: 'Tarea en casa 4' },
    ];

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (activeYear) {
            loadActivities(activeYear.id);
        }
    }, [filterCurso, filterMateria, filterPeriodo, activeYear]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const { data: yData } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            setActiveYear(yData);

            if (profile.rol === 'admin') {
                const [cRes, mRes] = await Promise.all([
                    supabase.from('cursos').select('*').order('nombre'),
                    supabase.from('materias').select('*').order('nombre')
                ]);
                setCourses(cRes.data || []);
                setSubjects(mRes.data || []);
            } else {
                const { data: doc } = await supabase.from('docentes').select('id').eq('user_id', profile.id).single();
                if (doc) {
                    const { data: assigned } = await supabase.from('docente_cursos').select('cursos(id, nombre)').eq('docente_id', doc.id);
                    const assignedCourses = assigned?.map(a => a.cursos) || [];
                    setCourses(assignedCourses);

                    if (assignedCourses.length > 0) {
                        const { data: assignedSubjects } = await supabase
                            .from('curso_materias')
                            .select('materias(id, nombre)')
                            .in('curso_id', assignedCourses.map(c => c.id));

                        const uniqueSubjects = Array.from(new Set(assignedSubjects?.map(s => JSON.stringify(s.materias)) || []))
                            .map(s => JSON.parse(s));
                        setSubjects(uniqueSubjects);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al cargar datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadActivities = async (yearId) => {
        let query = supabase
            .from('actividades')
            .select('*, cursos(nombre), materias(nombre)')
            .eq('anio_academico_id', yearId);

        if (filterCurso) query = query.eq('curso_id', filterCurso);
        if (filterMateria) query = query.eq('materia_id', filterMateria);
        if (filterPeriodo) query = query.eq('periodo', filterPeriodo);

        const { data } = await query.order('periodo', { ascending: true });
        setActivities(data || []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!activeYear) return mostrarToast('No hay un año académico activo.', 'warning');

        try {
            if (modal.data) {
                const { error } = await supabase.from('actividades').update({
                    descripcion: formData.descripcion
                }).eq('id', modal.data.id);
                if (error) throw error;
                mostrarToast('Actividad actualizada', 'success');
            } else {
                const { error } = await supabase.from('actividades').insert([{
                    ...formData,
                    anio_academico_id: activeYear.id
                }]);
                if (error) throw error;
                mostrarToast('Actividad creada', 'success');
            }
            setModal({ open: false, data: null });
            loadActivities(activeYear.id);
        } catch (error) {
            mostrarToast(error.message.includes('unique') ? 'Ya existe una descripción para esta actividad.' : error.message, 'error');
        }
    };

    const openModal = (activity = null) => {
        if (activity) {
            setFormData({
                curso_id: activity.curso_id,
                materia_id: activity.materia_id,
                periodo: activity.periodo,
                actividad: activity.actividad,
                descripcion: activity.descripcion
            });
            setModal({ open: true, data: activity });
        } else {
            setFormData({ curso_id: '', materia_id: '', periodo: 'P1', actividad: 'TC1', descripcion: '' });
            setModal({ open: true, data: null });
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando gestión de actividades...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Módulo de Actividades {activeYear && <span className="text-blue-600">({activeYear.anio})</span>}</h2>
                    <p className="text-slate-500 font-medium">Gestiona las descripciones de las actividades para los periodos académicos.</p>
                </div>
                <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nueva Actividad
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border-b items-end">
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] md:text-xs uppercase font-bold text-blue-600 mb-1 block">Filtrar por Curso</label>
                        <select className="form-input !py-2 text-sm md:text-base" value={filterCurso} onChange={e => setFilterCurso(e.target.value)}>
                            <option value="">Todos los Cursos</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] md:text-xs uppercase font-bold text-blue-600 mb-1 block">Filtrar por Materia</label>
                        <select className="form-input !py-2 text-sm md:text-base" value={filterMateria} onChange={e => setFilterMateria(e.target.value)}>
                            <option value="">Todas las Materias</option>
                            {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0 min-w-[180px]">
                        <label className="text-[10px] md:text-xs uppercase font-bold text-blue-600 mb-1 block">Filtrar por Periodo</label>
                        <select className="form-input !py-2 text-sm md:text-base" value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}>
                            <option value="">Todos los Periodos</option>
                            <option value="P1">Periodo 1</option><option value="P2">Periodo 2</option>
                            <option value="P3">Periodo 3</option><option value="P4">Periodo 4</option>
                        </select>
                    </div>
                    {(filterCurso || filterMateria || filterPeriodo) && (
                        <button onClick={() => { setFilterCurso(''); setFilterMateria(''); setFilterPeriodo(''); }} className="btn btn-ghost btn-sm text-blue-600 font-bold h-10 flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">filter_alt_off</span> Limpiar
                        </button>
                    )}
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Periodo</th>
                                <th>Curso</th>
                                <th>Materia</th>
                                <th>Actividad</th>
                                <th>Descripción</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((item) => (
                                <tr key={item.id}>
                                    <td><span className="badge badge-primary">{item.periodo}</span></td>
                                    <td className="font-bold text-slate-800">{item.cursos?.nombre}</td>
                                    <td className="text-slate-600 font-medium">{item.materias?.nombre}</td>
                                    <td><span className="badge badge-ghost uppercase">{item.actividad}</span></td>
                                    <td className="text-slate-500 text-sm max-w-md truncate">{item.descripcion}</td>
                                    <td className="text-right">
                                        <button onClick={() => openModal(item)} className="btn btn-ghost btn-sm">
                                            <span className="material-symbols-outlined text-slate-400">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activities.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-slate-400">No se han definido descripciones de actividades.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modal.open && (
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp !max-w-6xl">
                        <div className="modal-header">
                            <h3 className="modal-title">{modal.data ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
                            <button onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost btn-sm">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Curso</label>
                                        <select className="form-input" required disabled={!!modal.data} value={formData.curso_id} onChange={e => setFormData({ ...formData, curso_id: e.target.value })}>
                                            <option value="">Seleccionar...</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Materia</label>
                                        <select className="form-input" required disabled={!!modal.data} value={formData.materia_id} onChange={e => setFormData({ ...formData, materia_id: e.target.value })}>
                                            <option value="">Seleccionar...</option>
                                            {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Periodo</label>
                                        <select className="form-input" required disabled={!!modal.data} value={formData.periodo} onChange={e => setFormData({ ...formData, periodo: e.target.value })}>
                                            <option value="P1">Periodo 1</option><option value="P2">Periodo 2</option>
                                            <option value="P3">Periodo 3</option><option value="P4">Periodo 4</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Actividad</label>
                                        <select className="form-input" required disabled={!!modal.data} value={formData.actividad} onChange={e => setFormData({ ...formData, actividad: e.target.value })}>
                                            {activityTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Descripción de la Actividad</label>
                                    <textarea className="form-input min-h-[120px]" required placeholder="Escribe aquí de qué trata esta actividad..." value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })}></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setModal({ open: false, data: null })} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary flex-1">{modal.data ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
