import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const AcademicYearsManager = () => {
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, anio: '', fecha_inicio: '', fecha_fin: '', estado: false, valor_pension: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('anios_academicos').select('*').order('anio', { ascending: false });
            if (error) throw error;
            setYears(data || []);
        } catch (err) {
            mostrarToast('Error al cargar años académicos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Si vamos a activar este año, primero desactivamos todos los demás para no violar el UNIQUE index
            if (formData.estado) {
                await supabase.from('anios_academicos').update({ estado: false }).neq('id', '00000000-0000-0000-0000-000000000000');
            }

            const { id, ...payload } = formData;
            payload.anio = parseInt(payload.anio, 10);
            payload.valor_pension = parseFloat(payload.valor_pension) || 0;

            if (id) {
                const { error } = await supabase.from('anios_academicos').update(payload).eq('id', id);
                if (error) throw error;
                mostrarToast('Año académico actualizado', 'success');
            } else {
                const { error } = await supabase.from('anios_academicos').insert([payload]);
                if (error) throw error;
                mostrarToast('Año académico registrado', 'success');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este año? Esto podría afectar a los estudiantes y calificaciones ligadas a él si la base de datos no está en CASCADE.')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('anios_academicos').delete().eq('id', id);
            if (error) throw error;
            mostrarToast('Año académico eliminado', 'success');
            loadData();
        } catch (err) {
            mostrarToast('Error al eliminar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T12:00:00Z'); // force midday to avoid timezone shifts
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Parámetros de Años Académicos</h2>
                    <p className="text-slate-500">Gestiona los años del colegio. Solo puede haber uno activo a la vez.</p>
                </div>
                <button onClick={() => { setFormData({ id: null, anio: new Date().getFullYear(), fecha_inicio: '', fecha_fin: '', estado: false, valor_pension: 0 }); setShowModal(true); }} className="btn btn-primary">
                    <span className="material-symbols-outlined">add_circle</span> Nuevo Año
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Año</th>
                                <th>Periodo</th>
                                <th>Valor Pensión</th>
                                <th>Estado</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {years.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-slate-500">No hay años académicos registrados.</td></tr>
                            ) : years.map(y => (
                                <tr key={y.id} className={y.estado ? 'bg-blue-50/50' : ''}>
                                    <td>
                                        <div className="font-bold text-slate-900 text-lg">{y.anio}</div>
                                    </td>
                                    <td>
                                        <div className="text-sm font-medium text-slate-600">
                                            {formatDate(y.fecha_inicio)} - {formatDate(y.fecha_fin)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-sm font-bold text-slate-700">
                                            ${Number(y.valor_pension || 0).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        {y.estado ? (
                                            <span className="badge badge-primary"><span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>Activo</span>
                                        ) : (
                                            <span className="badge bg-slate-100 text-slate-600">Inactivo</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <button onClick={() => { setFormData(y); setShowModal(true); }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={() => handleDelete(y.id)} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal open">
                    <div className="modal-content animate-zoomIn max-w-md">
                        <h3 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar Año' : 'Registrar Año'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Año</label>
                                    <input type="number" required min="2000" max="2100" className="form-input w-full" value={formData.anio} onChange={e => setFormData({ ...formData, anio: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Valor Pensión Mensual</label>
                                    <input type="number" required min="0" className="form-input w-full" value={formData.valor_pension} onChange={e => setFormData({ ...formData, valor_pension: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Fecha de Inicio</label>
                                    <input type="date" required className="form-input w-full" value={formData.fecha_inicio} onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha Fin</label>
                                    <input type="date" required className="form-input w-full" value={formData.fecha_fin} onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })} />
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">¿Es el año activo actual?</p>
                                    <p className="text-xs text-slate-500">Al marcarlo, se desactivarán los demás.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.checked })} />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
