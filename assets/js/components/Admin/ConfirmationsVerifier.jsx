import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ConfirmationsVerifier = () => {
    const [rawEstudiantes, setRawEstudiantes] = useState([]);
    const [rawConfirmations, setRawConfirmations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ query: '', status: '', year: '', grade: '' });
    const [availableYears, setAvailableYears] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Obtener año académico activo para calcular el año entrante por defecto
            const { data: activeYearData, error: activeYearError } = await supabase
                .from('anios_academicos')
                .select('*')
                .eq('estado', true)
                .maybeSingle();

            if (activeYearError) throw activeYearError;

            const defaultNextYear = activeYearData ? activeYearData.anio + 1 : new Date().getFullYear() + 1;

            // 2. Traer todos los estudiantes activos (con sus respectivos cursos actuales)
            const { data: estudiantes, error: estError } = await supabase
                .from('estudiantes')
                .select('*, cursos(*)')
                .eq('estado', 'activo');

            if (estError) throw estError;

            // 3. Traer todas las confirmaciones de cupo de la tabla estudiante_confirmacion_cupo
            const { data: confirmaciones, error: confError } = await supabase
                .from('estudiante_confirmacion_cupo')
                .select('*');

            if (confError) throw confError;

            setRawEstudiantes(estudiantes || []);
            setRawConfirmations(confirmaciones || []);

            // Generar la lista de años disponibles de confirmación (basado en confirmaciones + año entrante por defecto)
            const years = Array.from(new Set([
                defaultNextYear,
                ...(confirmaciones || []).map(c => c.anio)
            ])).sort((a, b) => b - a);

            setAvailableYears(years);

            // Seleccionar por defecto el año entrante en el filtro de año
            setFilters(prev => ({
                ...prev,
                year: prev.year || defaultNextYear.toString()
            }));

        } catch (err) {
            mostrarToast('Error al cargar datos de verificación: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getNextGradeName = (currentName) => {
        if (!currentName) return '';
        const clean = currentName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (clean.includes("parvulo")) return "Prejardín";
        if (clean.includes("pre jardin") || clean.includes("prejardin")) return "Jardín";
        if (clean.includes("jardin")) return "Transición";
        return "Transición (Último grado)";
    };

    // Lista de grados actuales únicos extraídos de los estudiantes
    const availableGrades = useMemo(() => {
        const gradesMap = {};
        rawEstudiantes.forEach(est => {
            if (est.cursos) {
                gradesMap[est.cursos.id] = est.cursos.nombre;
            }
        });
        return Object.entries(gradesMap).map(([id, nombre]) => ({ id, nombre }));
    }, [rawEstudiantes]);

    // Combinación de datos en memoria para el año consultado
    const processedData = useMemo(() => {
        const queryYear = parseInt(filters.year) || (availableYears[0] || new Date().getFullYear() + 1);

        return rawEstudiantes.map(est => {
            // Buscar si tiene confirmación para el año de consulta
            const conf = rawConfirmations.find(c => c.estudiante_id === est.id && c.anio === queryYear);

            return {
                id: est.id,
                documento_estudiante: est.numero_documento,
                nombre_completo: `${est.apellidos || ''}, ${est.nombres || ''}`.trim(),
                grado_actual_id: est.curso_id,
                grado_actual_nombre: est.cursos?.nombre || 'Sin grado',
                grado_destino: conf ? conf.grado : getNextGradeName(est.cursos?.nombre || ''),
                anio: queryYear,
                fecha_confirmacion: conf ? conf.fecha_confirmacion : null,
                estado: conf ? conf.estado : 'sin_responder' // 'confirmado', 'no confirmado', 'sin_responder'
            };
        });
    }, [rawEstudiantes, rawConfirmations, filters.year, availableYears]);

    // Filtros aplicados a los datos unificados
    const filteredData = useMemo(() => {
        return processedData.filter(item => {
            const matchesQuery = item.nombre_completo.toLowerCase().includes(filters.query.toLowerCase()) || 
                                 item.documento_estudiante.includes(filters.query.trim());
                                 
            const matchesStatus = !filters.status || item.estado === filters.status;
            const matchesYear = !filters.year || item.anio.toString() === filters.year;
            const matchesGrade = !filters.grade || item.grado_actual_id === filters.grade;

            return matchesQuery && matchesStatus && matchesYear && matchesGrade;
        });
    }, [processedData, filters]);

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Estudiantes Activos</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{filteredData.length}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined">list_alt</span>
                    </div>
                </div>
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Confirmados</p>
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
                        <p className="text-sm font-bold text-slate-400 uppercase">No Confirmados</p>
                        <h3 className="text-3xl font-black text-rose-600 mt-1">
                            {filteredData.filter(c => c.estado === 'no confirmado').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                        <span className="material-symbols-outlined">cancel</span>
                    </div>
                </div>
                <div className="card bg-white p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase">Sin Responder</p>
                        <h3 className="text-3xl font-black text-amber-600 mt-1">
                            {filteredData.filter(c => c.estado === 'sin_responder').length}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <span className="material-symbols-outlined">pending</span>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="card p-6 shadow-sm bg-white">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <label className="form-label">Grado Actual</label>
                        <select
                            className="form-input"
                            value={filters.grade}
                            onChange={e => setFilters({ ...filters, grade: e.target.value })}
                        >
                            <option value="">Todos los grados actuales</option>
                            {availableGrades.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
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
                            <option value="sin_responder">Sin responder</option>
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
                                    <th className="p-4">Grado Actual</th>
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
                                            {item.nombre_completo}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                                <span className="material-symbols-outlined text-base text-slate-400">grade</span>
                                                {item.grado_actual_nombre}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                                                <span className="material-symbols-outlined text-base">school</span>
                                                {item.grado_destino}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800">
                                            {item.anio}
                                        </td>
                                        <td className="p-4 text-slate-500 font-medium">
                                            {item.fecha_confirmacion ? formatFecha(item.fecha_confirmacion) : (
                                                <span className="text-slate-400 italic font-normal">Pendiente</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                item.estado === 'confirmado'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : item.estado === 'no confirmado'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                <span className="material-symbols-outlined text-xs">
                                                    {item.estado === 'confirmado' ? 'check_circle' : item.estado === 'no confirmado' ? 'cancel' : 'pending'}
                                                </span>
                                                {item.estado === 'sin_responder' ? 'Sin responder' : item.estado}
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
