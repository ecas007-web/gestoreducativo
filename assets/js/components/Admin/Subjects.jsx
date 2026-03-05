import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const SubjectsManager = () => {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, nombre: '', descripcion: '' });

    // Para asignar materias a cursos
    const [selectedCourse, setSelectedCourse] = useState('');
    const [courseSubjects, setCourseSubjects] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [subRes, curRes] = await Promise.all([
            supabase.from('materias').select('*').order('nombre'),
            supabase.from('cursos').select('*').order('nombre')
        ]);
        setSubjects(subRes.data || []);
        setCourses(curRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedCourse) loadCourseSubjects();
        else setCourseSubjects([]);
    }, [selectedCourse]);

    const loadCourseSubjects = async () => {
        const { data } = await supabase.from('curso_materias').select('materia_id').eq('curso_id', selectedCourse);
        setCourseSubjects(data?.map(d => d.materia_id) || []);
    };

    const handleSubjectSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { id, ...payload } = formData;
            if (id) await supabase.from('materias').update(payload).eq('id', id);
            else await supabase.from('materias').insert([payload]);

            mostrarToast('Materia guardada', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleSubjectToCourse = async (mId) => {
        try {
            if (courseSubjects.includes(mId)) {
                await supabase.from('curso_materias').delete().match({ curso_id: selectedCourse, materia_id: mId });
            } else {
                await supabase.from('curso_materias').insert([{ curso_id: selectedCourse, materia_id: mId }]);
            }
            loadCourseSubjects();
        } catch (err) {
            mostrarToast(err.message, 'error');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Listado de Materias */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-800">Materias</h2>
                    <button onClick={() => { setFormData({ id: null, nombre: '', descripcion: '' }); setShowModal(true); }} className="btn btn-primary btn-sm">
                        <span className="material-symbols-outlined">add</span> Nueva Materia
                    </button>
                </div>
                <div className="card p-0 overflow-hidden">
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Materia</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map(s => (
                                    <tr key={s.id}>
                                        <td><span className="font-bold text-slate-700">{s.nombre}</span></td>
                                        <td className="text-right">
                                            <button onClick={() => { setFormData(s); setShowModal(true); }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined text-base">edit</span></button>
                                            <button onClick={async () => { if (confirm('¿Eliminar materia?')) { await supabase.from('materias').delete().eq('id', s.id); loadData(); } }} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined text-base">delete</span></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Asignación a Cursos */}
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-800">Asignación por Curso</h2>
                <div className="card bg-blue-600 border-none text-white">
                    <p className="text-sm opacity-80 mb-4">Selecciona un curso para ver y asignar sus materias.</p>
                    <select
                        className="form-input bg-white/10 border-white/20 text-white placeholder:text-blue-200"
                        value={selectedCourse}
                        onChange={e => setSelectedCourse(e.target.value)}
                    >
                        <option value="" className="text-slate-800">Seleccionar un curso...</option>
                        {courses.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.nombre}</option>)}
                    </select>
                </div>

                {selectedCourse ? (
                    <div className="card space-y-3 max-h-[500px] overflow-y-auto animate-fadeIn">
                        {subjects.map(s => (
                            <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${courseSubjects.includes(s.id) ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <span className={`font-bold ${courseSubjects.includes(s.id) ? 'text-blue-700' : 'text-slate-500'}`}>{s.nombre}</span>
                                <button
                                    onClick={() => toggleSubjectToCourse(s.id)}
                                    className={`btn btn-sm ${courseSubjects.includes(s.id) ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">{courseSubjects.includes(s.id) ? 'check_circle' : 'add_circle'}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card text-center py-20 border-dashed">
                        <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">assignment_turned_in</span>
                        <p className="text-slate-400 font-medium text-sm">Elige un curso para empezar a asignar materias.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal open">
                    <div className="modal-content animate-zoomIn max-w-md">
                        <h3 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar Materia' : 'Nueva Materia'}</h3>
                        <form onSubmit={handleSubjectSubmit} className="space-y-4">
                            <div className="form-group"><label className="form-label">Nombre</label><input type="text" required className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-input h-24" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })}></textarea></div>
                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>Guardar Materia</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
