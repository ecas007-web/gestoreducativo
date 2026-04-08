import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const CoursesManager = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, nombre: '', descripcion: '', estado: 'Activo' });

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setLoading(true);
        const { data } = await supabase.from('cursos').select('*').order('id');
        setCourses(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { id, ...payload } = formData;
            if (id) {
                await supabase.from('cursos').update(payload).eq('id', id);
            } else {
                await supabase.from('cursos').insert([payload]);
            }
            mostrarToast('Curso actualizado', 'success');
            setShowModal(false);
            loadCourses();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Cursos Escolares</h2>
                    <p className="text-slate-500">Administra los grados académicos disponibles.</p>
                </div>
                <button onClick={() => { setFormData({ id: null, nombre: '', descripcion: '', estado: 'Activo' }); setShowModal(true); }} className="btn btn-primary">
                    <span className="material-symbols-outlined">add_circle</span> Crear Curso
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(c => (
                    <div key={c.id} className="card card-hover">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600">class</span>
                            </div>
                            <span className={`badge ${c.estado === 'Activo' ? 'badge-success' : 'badge-error'}`}>{c.estado}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{c.nombre}</h3>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2">{c.descripcion || 'Sin descripción.'}</p>
                        <div className="flex justify-end gap-2 border-t pt-4">
                            <Link to={`/admin/calificaciones/${c.id}`} className="btn btn-ghost btn-sm text-indigo-600" title="Cargar Notas"><span className="material-symbols-outlined text-base">edit_note</span></Link>
                            <button onClick={() => { setFormData(c); setShowModal(true); }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined text-base">edit</span></button>
                            <button onClick={async () => { if (confirm('¿Eliminar curso?')) { await supabase.from('cursos').delete().eq('id', c.id); loadCourses(); } }} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined text-base">delete</span></button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp">
                        <div className="modal-header">
                            <h3 className="modal-title">{formData.id ? 'Editar Curso' : 'Nuevo Curso'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="form-group"><label className="form-label">Nombre del Curso</label><input type="text" required className="form-input" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej. Párvulo" /></div>
                                <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-input h-24" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Opcional..."></textarea></div>
                                <div className="form-group">
                                    <label className="form-label">Estado</label>
                                    <select className="form-input" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                                        <option value="Activo">Activo</option><option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                                <div className="modal-footer pt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Curso'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
