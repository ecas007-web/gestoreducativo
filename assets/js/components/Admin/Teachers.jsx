import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const TeachersManager = () => {
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, nombres: '', apellidos: '', correo: '', tipo_documento: 'CC', numero_documento: '', cursos_ids: [] });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tRes, cRes] = await Promise.all([
                supabase.from('docentes').select('*').order('apellidos'),
                supabase.from('cursos').select('*').order('nombre')
            ]);

            // Cargar asignaciones de cursos para cada docente
            const teachersWithCourses = await Promise.all((tRes.data || []).map(async (t) => {
                const { data: asig } = await supabase.from('docente_cursos').select('curso_id').eq('docente_id', t.id);
                return { ...t, cursos_ids: asig?.map(a => a.curso_id) || [] };
            }));

            setTeachers(teachersWithCourses);
            setCourses(cRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { id, cursos_ids, ...payload } = formData;
            let teacherId = id;

            if (id) {
                await supabase.from('docentes').update(payload).eq('id', id);
            } else {
                const { data, error } = await supabase.from('docentes').insert([payload]).select().single();
                if (error) throw error;
                teacherId = data.id;
            }

            // Actualizar asignaciones de cursos
            await supabase.from('docente_cursos').delete().eq('docente_id', teacherId);
            if (cursos_ids.length > 0) {
                const newAsig = cursos_ids.map(cId => ({ docente_id: teacherId, curso_id: cId }));
                await supabase.from('docente_cursos').insert(newAsig);
            }

            mostrarToast('Docente guardado y cursos asignados', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleCourse = (cId) => {
        const ids = formData.cursos_ids.includes(cId)
            ? formData.cursos_ids.filter(id => id !== cId)
            : [...formData.cursos_ids, cId];
        setFormData({ ...formData, cursos_ids: ids });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Gestión de Docentes</h2>
                    <p className="text-slate-500">Registra profesores y asigna sus cursos de enseñanza.</p>
                </div>
                <button onClick={() => { setFormData({ id: null, nombres: '', apellidos: '', correo: '', tipo_documento: 'CC', numero_documento: '', cursos_ids: [] }); setShowModal(true); }} className="btn btn-primary">
                    <span className="material-symbols-outlined">person_add</span> Nuevo Docente
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Docente</th>
                                <th>Contacto</th>
                                <th>Cursos Asignados</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="font-bold text-slate-900">{t.nombres} {t.apellidos}</div>
                                        <div className="text-xs text-slate-400">{t.numero_documento}</div>
                                    </td>
                                    <td><div className="text-sm font-medium">{t.correo}</div></td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {t.cursos_ids.map(cId => {
                                                const curso = courses.find(c => c.id === cId);
                                                return <span key={cId} className="badge badge-primary text-[10px]">{curso?.nombre || 'Curso'}</span>;
                                            })}
                                            {t.cursos_ids.length === 0 && <span className="text-xs text-slate-400">Sin cursos</span>}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button onClick={() => { setFormData(t); setShowModal(true); }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={async () => { if (confirm('¿Eliminar docente?')) { await supabase.from('docentes').delete().eq('id', t.id); loadData(); } }} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal open">
                    <div className="modal-content animate-zoomIn max-w-2xl">
                        <h3 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar Docente' : 'Registrar Docente'}</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="form-group"><label className="form-label">Nombres</label><input type="text" required className="form-input" value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Apellidos</label><input type="text" required className="form-input" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Correo Electrónico</label><input type="email" required className="form-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Tipo Doc.</label>
                                        <select className="form-input" value={formData.tipo_documento} onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}>
                                            <option value="CC">CC</option><option value="CE">CE</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Número</label><input type="text" required className="form-input" value={formData.numero_documento} onChange={e => setFormData({ ...formData, numero_documento: e.target.value })} /></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="form-label">Asignar Cursos</label>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                                    {courses.map(c => (
                                        <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors mb-1">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                checked={formData.cursos_ids.includes(c.id)}
                                                onChange={() => toggleCourse(c.id)}
                                            />
                                            <span className="text-sm font-medium text-slate-700">{c.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-full flex justify-end gap-3 pt-6 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Docente'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
