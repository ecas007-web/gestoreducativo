import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ConfirmationsVerifier = () => {
    const [confirmations, setConfirmations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ query: '', status: '', year: '' });
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch confirmation records with student details
            const { data, error } = await supabase
                .from('estudiante_confirmacion_cupo')
                .select('*, estudiantes(nombres, apellidos)')
                .order('fecha_confirmacion', { ascending: false });

            if (error) throw error;
            setConfirmations(data || []);

            // Extract unique years
            const years = Array.from(new Set((data || []).map(c => c.anio))).sort((a, b) => b - a);
            setAvailableYears(years);
        } catch (err) {
            mostrarToast('Error al cargar confirmaciones: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = confirmations.filter(item => {
        const studentName = item.estudiantes ? `${item.estudiantes.nombres} ${item.estudiantes.apellidos}` : '';
        const doc = item.documento_estudiante || '';
        const matchesQuery = (studentName + doc).toLowerCase().includes(filters.query.toLowerCase());
        const matchesStatus = !filters.status || item.estado === filters.status;
        const matchesYear = !filters.year || item.anio.toString() === filters.year;

        return matchesQuery && matchesStatus && matchesYear;
    });

    const formatFecha = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800">Verificación de Cupos Confirmados</h2>
                <p className="text-slate-500">Consulta y gestiona las confirmaciones de cupos de los estudiantes para el próximo año lectivo.</p>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Total Registros</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{filteredData.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined">list_alt</span>
                    </div>
                </div>
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Cupos Confirmados</p>
                        <h3 className="text-3xl font-black text-emerald-600 mt-1">
                            {filteredData.filter(c => c.estado === 'confirmado').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                </div>
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Cupos No Confirmados</p>
                        <h3 className="text-3xl font-black text-rose-600 mt-1">
                            {filteredData.filter(c => c.estado === 'no confirmado').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                        <span className="material-symbols-outlined">cancel</span>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="card p-6 shadow-sm bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group">
                        <label className="form-label">Buscar Estudiante</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="form-input pl-10"
                                placeholder="Nombre o documento..."
                                value={filters.query}
                                onChange={e => setFilters({ ...filters, query: e.target.value })}
                            />
                            <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-lg">search</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Año de Confirmación</label>
                        <select
                            className="form-input"
                            value={filters.year}
                            onChange={e => setFilters({ ...filters, year: e.target.value })}
                        >
                            <option value="">Todos los años</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Estado de Confirmación</label>
                        <select
                            className="form-input"
                            value={filters.status}
                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">Todos los estados</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="no confirmado">No confirmado</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="card p-0 overflow-hidden shadow-sm bg-white">
                {loading ? (
                    <div className="p-20 text-center text-slate-500 font-medium">Cargando registros...</div>
                ) : filteredData.length === 0 ? (
                    <div className="p-20 text-center text-slate-400 font-medium">
                        <span className="material-symbols-outlined text-5xl mb-2 block">inbox</span>
                        No se encontraron registros de confirmación.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Estudiante</th>
                                    <th className="p-4">Grado Destino</th>
                                    <th className="p-4">Año Académico</th>
                                    <th className="p-4">Fecha Registro</th>
                                    <th className="p-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm text-slate-700">
                                {filteredData.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono font-bold text-slate-600">
                                            {item.documento_estudiante}
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {item.estudiantes ? `${item.estudiantes.apellidos}, ${item.estudiantes.nombres}` : 'No encontrado'}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                                                <span className="material-symbols-outlined text-base">school</span>
                                                {item.grado}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {item.anio}
                                        </td>
                                        <td className="p-4 text-slate-500 font-medium">
                                            {formatFecha(item.fecha_confirmacion)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                item.estado === 'confirmado'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                <span className="material-symbols-outlined text-xs">
                                                    {item.estado === 'confirmado' ? 'check_circle' : 'cancel'}
                                                </span>
                                                {item.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
