import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const StudentsManager = () => {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, nombres: '', apellidos: '', tipo_documento: 'RC', numero_documento: '', curso_id: '' });
    const [filters, setFilters] = useState({ query: '', courseId: '', status: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [stRes, crRes] = await Promise.all([
            supabase.from('estudiantes').select('*, cursos(nombre)').order('apellidos'),
            supabase.from('cursos').select('*').order('nombre')
        ]);
        setStudents(stRes.data || []);
        setCourses(crRes.data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            delete payload.id;
            if (formData.id) {
                await supabase.from('estudiantes').update(payload).eq('id', formData.id);
            } else {
                await supabase.from('estudiantes').insert([payload]);
            }
            mostrarToast('Estudiante guardado correctamente', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const name = (s.nombres || '') + ' ' + (s.apellidos || '');
        const doc = s.numero_documento || '';
        const matchesQuery = (name + doc).toLowerCase().includes(filters.query.toLowerCase());
        const matchesCourse = !filters.courseId || s.curso_id == filters.courseId;
        const matchesStatus = !filters.status || (filters.status === 'complete' ? s.registro_completo : !s.registro_completo);
        return matchesQuery && matchesCourse && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Gestión de Estudiantes</h2>
                    <p className="text-slate-500">Pre-registra y administra los perfiles de los niños.</p>
                </div>
                <button onClick={() => { setFormData({ id: null, nombres: '', apellidos: '', tipo_documento: 'RC', numero_documento: '', curso_id: '' }); setShowModal(true); }} className="btn btn-primary">
                    <span className="material-symbols-outlined">person_add</span> Pre-registrar Estudiante
                </button>
            </div>

            <div className="card flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input type="text" className="form-input" placeholder="Buscar por nombre o documento..." value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} />
                </div>
                <select className="form-input md:w-48" value={filters.courseId} onChange={e => setFilters({ ...filters, courseId: e.target.value })}>
                    <option value="">Todos los Cursos</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <select className="form-input md:w-48" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">Todos los Estados</option>
                    <option value="pending">Pre-registro</option>
                    <option value="complete">Completo</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Curso</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="font-bold text-slate-900">{s.nombres} {s.apellidos}</div>
                                        <div className="text-xs text-slate-400">{s.tipo_documento} {s.numero_documento}</div>
                                    </td>
                                    <td><span className="badge badge-primary">{s.cursos?.nombre || 'Sin asignar'}</span></td>
                                    <td>
                                        <span className={`badge ${s.registro_completo ? 'badge-success' : 'badge-warning'}`}>
                                            {s.registro_completo ? 'Completo' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button onClick={() => { setFormData(s); setShowModal(true); }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={async () => { if (confirm('¿Eliminar estudiante?')) { await supabase.from('estudiantes').delete().eq('id', s.id); loadData(); } }} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr><td colSpan="4" className="text-center py-20 text-slate-400">No se encontraron estudiantes.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal open">
                    <div className="modal-content animate-zoomIn max-w-lg">
                        <h3 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar Estudiante' : 'Pre-registrar Estudiante'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group"><label className="form-label">Nombres</label><input type="text" required className="form-input" value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Apellidos</label><input type="text" required className="form-input" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Tipo Documento</label>
                                    <select className="form-input" value={formData.tipo_documento} onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}>
                                        <option value="RC">RC</option><option value="TI">TI</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Número</label><input type="text" required className="form-input" value={formData.numero_documento} onChange={e => setFormData({ ...formData, numero_documento: e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Curso Inicial</label>
                                <select required className="form-input" value={formData.curso_id} onChange={e => setFormData({ ...formData, curso_id: e.target.value })}>
                                    <option value="">Seleccionar Curso</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Estudiante'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
