import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const DiscountsManager = () => {
    const [descuentos, setDescuentos] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [anios, setAnios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Búsqueda de estudiantes
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const initialFormState = { id: null, estudiante_id: '', estudiante_nombre: '', anio_academico_id: '', monto_descuento: 0, observacion: '' };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        loadBaseData();
    }, []);

    const loadBaseData = async () => {
        setLoading(true);
        try {
            // Cargar años
            const { data: aniosData, error: aniosError } = await supabase.from('anios_academicos').select('*').order('anio', { ascending: false });
            if (aniosError) throw aniosError;
            setAnios(aniosData || []);

            const anioActivo = aniosData?.find(a => a.estado) || aniosData?.[0];
            if (anioActivo) {
                setFormData(prev => ({ ...prev, anio_academico_id: anioActivo.id }));
            }

            // Cargar descuentos
            await loadDescuentos(anioActivo?.id);
        } catch (err) {
            mostrarToast('Error al cargar datos base: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadDescuentos = async (anioId) => {
        if (!anioId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('descuentos_pensiones')
                .select(`
                    *,
                    estudiantes ( nombres, apellidos, numero_documento ),
                    anios_academicos ( anio )
                `)
                .eq('anio_academico_id', anioId);

            if (error) throw error;
            setDescuentos(data || []);
        } catch (err) {
            mostrarToast('Error al cargar descuentos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Auto-complete simple
    useEffect(() => {
        if (searchTerm.length < 3) {
            setEstudiantes([]);
            return;
        }

        const searchTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('estudiantes')
                    .select('id, nombres, apellidos, numero_documento')
                    .or(`nombres.ilike.%${searchTerm}%,apellidos.ilike.%${searchTerm}%,numero_documento.ilike.%${searchTerm}%`)
                    .limit(5);

                if (error) throw error;
                setEstudiantes(data || []);
            } catch (err) {
                console.error('Busqueda error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [searchTerm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.estudiante_id || !formData.anio_academico_id) {
            return mostrarToast('Debe seleccionar un estudiante y un año académico', 'error');
        }

        setLoading(true);
        try {
            const payload = {
                estudiante_id: formData.estudiante_id,
                anio_academico_id: formData.anio_academico_id,
                monto_descuento: parseFloat(formData.monto_descuento),
                observacion: formData.observacion
            };

            if (formData.id) {
                const { error } = await supabase.from('descuentos_pensiones').update(payload).eq('id', formData.id);
                if (error) throw error;
                mostrarToast('Descuento actualizado', 'success');
            } else {
                const { error } = await supabase.from('descuentos_pensiones').insert([payload]);
                if (error) throw error;
                mostrarToast('Descuento registrado', 'success');
            }
            setShowModal(false);
            loadDescuentos(formData.anio_academico_id);
        } catch (err) {
            if (err.code === '23505') {
                mostrarToast('El estudiante ya tiene un descuento registrado en este año', 'error');
            } else {
                mostrarToast(err.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, anioId) => {
        if (!confirm('¿Seguro que deseas eliminar este descuento?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('descuentos_pensiones').delete().eq('id', id);
            if (error) throw error;
            mostrarToast('Descuento eliminado', 'success');
            loadDescuentos(anioId);
        } catch (err) {
            mostrarToast('Error al eliminar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Descuentos de Pensión</h2>
                    <p className="text-slate-500">Gestiona los descuentos anuales por estudiante.</p>
                </div>
                <button onClick={() => {
                    const anioActivo = anios.find(a => a.estado) || anios[0];
                    setFormData({ ...initialFormState, anio_academico_id: anioActivo?.id });
                    setSearchTerm('');
                    setShowModal(true);
                }} className="btn btn-primary">
                    <span className="material-symbols-outlined">add_circle</span> Nuevo Descuento
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
                    <div className="w-1/3">
                        <label className="form-label text-xs mb-1">Filtrar por Año Académico</label>
                        <select
                            className="form-input w-full"
                            onChange={(e) => loadDescuentos(e.target.value)}
                        >
                            {anios.map(a => (
                                <option key={a.id} value={a.id}>
                                    Año {a.anio} {a.estado ? '(Activo)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Documento</th>
                                <th>Valor Descuento</th>
                                <th>Observación</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {descuentos.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-slate-500">No hay descuentos registrados en este año.</td></tr>
                            ) : descuentos.map(d => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="font-bold text-slate-800">
                                            {d.estudiantes?.nombres} {d.estudiantes?.apellidos}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-500 text-sm">{d.estudiantes?.numero_documento}</span>
                                    </td>
                                    <td>
                                        <div className="font-bold text-emerald-600">
                                            ${Number(d.monto_descuento).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-slate-600 text-sm">{d.observacion || '-'}</span>
                                    </td>
                                    <td className="text-right">
                                        <button onClick={() => {
                                            setFormData({
                                                id: d.id,
                                                estudiante_id: d.estudiante_id,
                                                estudiante_nombre: `${d.estudiantes?.nombres} ${d.estudiantes?.apellidos}`,
                                                anio_academico_id: d.anio_academico_id,
                                                monto_descuento: d.monto_descuento,
                                                observacion: d.observacion || ''
                                            });
                                            setSearchTerm('');
                                            setShowModal(true);
                                        }} className="btn btn-ghost btn-sm text-blue-600"><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={() => handleDelete(d.id, d.anio_academico_id)} className="btn btn-ghost btn-sm text-rose-600"><span className="material-symbols-outlined">delete</span></button>
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
                        <h3 className="text-xl font-black text-slate-800 mb-6">{formData.id ? 'Editar Descuento' : 'Registrar Descuento'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!formData.id && (
                                <div className="form-group relative">
                                    <label className="form-label">Buscar Estudiante</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                        <input
                                            type="text"
                                            className="form-input pl-10 w-full"
                                            placeholder="Nombre, apellido o documento..."
                                            value={formData.estudiante_nombre || searchTerm}
                                            onChange={e => {
                                                setSearchTerm(e.target.value);
                                                if (formData.estudiante_id) {
                                                    setFormData({ ...formData, estudiante_id: '', estudiante_nombre: '' });
                                                }
                                            }}
                                        />
                                        {isSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>}
                                    </div>

                                    {/* Resultados Autocomplete */}
                                    {estudiantes.length > 0 && !formData.estudiante_id && searchTerm.length >= 3 && (
                                        <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {estudiantes.map(est => (
                                                <li
                                                    key={est.id}
                                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            estudiante_id: est.id,
                                                            estudiante_nombre: `${est.nombres} ${est.apellidos} - ${est.numero_documento}`
                                                        });
                                                        setSearchTerm('');
                                                        setEstudiantes([]);
                                                    }}
                                                >
                                                    <div className="font-medium text-slate-800 text-sm">{est.nombres} {est.apellidos}</div>
                                                    <div className="text-xs text-slate-500">Doc: {est.numero_documento}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {formData.id && (
                                <div className="form-group">
                                    <label className="form-label">Estudiante</label>
                                    <input type="text" className="form-input w-full bg-slate-50" value={formData.estudiante_nombre} disabled />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Año Académico</label>
                                <select
                                    className="form-input w-full"
                                    value={formData.anio_academico_id}
                                    onChange={e => setFormData({ ...formData, anio_academico_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar Año</option>
                                    {anios.map(a => (
                                        <option key={a.id} value={a.id}>{a.anio} {a.estado ? '(Activo)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Valor del Descuento Mensual</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="form-input pl-8 w-full font-medium"
                                        value={formData.monto_descuento}
                                        onChange={e => setFormData({ ...formData, monto_descuento: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Este monto se descontará de la pensión mensual parametrizada.</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Observación (Opcional)</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    placeholder="Ej: Beca deportiva, Hermanos..."
                                    value={formData.observacion}
                                    onChange={e => setFormData({ ...formData, observacion: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={loading || !formData.estudiante_id}>{loading ? 'Guardando...' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
