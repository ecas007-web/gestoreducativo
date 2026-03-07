import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';

export const StudentDashboard = () => {
    const { profile } = useAuth();
    const [periodo, setPeriodo] = useState('P1');
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [estData, setEstData] = useState(null);
    const [notas, setNotas] = useState([]);
    const [expandedNota, setExpandedNota] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) loadStudentInfo();
    }, [profile]);

    useEffect(() => {
        if (estData && selectedYear) loadGrades();
    }, [estData, periodo, selectedYear]);

    const loadStudentInfo = async () => {
        setLoading(true);
        const [estRes, anRes] = await Promise.all([
            supabase.from('estudiantes').select('*, cursos(nombre)').eq('numero_documento', profile.numero_documento).single(),
            supabase.from('anios_academicos').select('*').order('anio', { ascending: false })
        ]);

        const loadedYears = anRes.data || [];
        setYears(loadedYears);

        // Find the active year (or the anio_academico_id of the student themselves as fallback)
        const activeY = loadedYears.find(y => y.estado);
        const defYear = activeY?.id || estRes.data?.anio_academico_id || (loadedYears[0]?.id || '');
        setSelectedYear(defYear);

        setEstData(estRes.data);
        setLoading(false);
    };

    const loadGrades = async () => {
        if (!selectedYear) return;
        const { data } = await supabase.from('calificaciones')
            .select('*, materias(nombre)')
            .eq('estudiante_id', estData.id)
            .eq('periodo', periodo)
            .eq('anio_academico_id', selectedYear);
        setNotas(data || []);
    };

    const prom = notas.length > 0 ? (notas.reduce((acc, n) => acc + (n.nota_final || n.nota), 0) / notas.length).toFixed(2) : '0.00';

    const getScaleBadgeClass = (escala) => {
        switch (escala) {
            case 'Superior': return 'badge-success';
            case 'Alto': return 'badge-primary';
            case 'Básico': return 'badge-warning';
            case 'Bajo': return 'badge-error';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando progreso académico...</div>;

    return (
        <div className="space-y-6">
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Mi Progreso</h2>
                        <p className="text-slate-500 font-medium">Curso: {estData?.cursos?.nombre || 'Pendiente'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select className="form-input w-full sm:w-32" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                            {years.map(y => <option key={y.id} value={y.id}>{y.anio}</option>)}
                        </select>
                        <select className="form-input w-full sm:w-48" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                            <option value="P1">Primer Periodo</option>
                            <option value="P2">Segundo Periodo</option>
                            <option value="P3">Tercer Periodo</option>
                            <option value="P4">Cuarto Periodo</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl">
                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Promedio General</p>
                        <p className="text-3xl font-black text-blue-900">{prom}</p>
                    </div>
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Materias Calificadas</p>
                        <p className="text-3xl font-black text-emerald-900">{notas.length}</p>
                    </div>
                    <div className="p-6 bg-violet-50 border border-violet-100 rounded-3xl">
                        <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-1">Estado de Pago</p>
                        <p className="text-2xl font-black text-violet-900">Al día</p>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Asignatura</th>
                                <th className="text-center">Nota</th>
                                <th>Desempeño</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notas.map(n => {
                                const isExpanded = expandedNota === n.id;
                                return (
                                    <React.Fragment key={n.id}>
                                        <tr className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedNota(isExpanded ? null : n.id)}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                                                    <p className="font-bold text-slate-800">{n.materias?.nombre}</p>
                                                </div>
                                            </td>
                                            <td className="text-center font-black text-lg text-blue-900">{(n.nota_final || n.nota).toFixed(1)}</td>
                                            <td><span className={`badge ${getScaleBadgeClass(n.escala_valorativa)}`}>{n.escala_valorativa || 'Pendiente'}</span></td>
                                            <td className="text-sm text-slate-600 font-medium max-w-xs">{n.logro_calculado || n.descripcion || 'Sin observaciones.'}</td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan="4" className="p-6">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[10px] font-black uppercase text-blue-600 mb-2">Tareas Clase (30%)</p>
                                                            <div className="flex gap-2">
                                                                {[n.tc1, n.tc2, n.tc3, n.tc4].map((v, i) => (
                                                                    <div key={i} className="flex-1 text-center py-1 bg-blue-50 rounded-lg text-xs font-bold">{v || '-'}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[10px] font-black uppercase text-emerald-600 mb-2">Tareas Casa (30%)</p>
                                                            <div className="flex gap-2">
                                                                {[n.th1, n.th2, n.th3, n.th4].map((v, i) => (
                                                                    <div key={i} className="flex-1 text-center py-1 bg-emerald-50 rounded-lg text-xs font-bold">{v || '-'}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                            <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Cuaderno (10%)</p>
                                                            <p className="text-lg font-black">{n.cuaderno || '-'}</p>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                            <p className="text-[10px] font-black uppercase text-violet-600 mb-1">Examen (30%)</p>
                                                            <p className="text-lg font-black">{n.examen || '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {notas.length === 0 && (
                                <tr><td colSpan="4" className="text-center py-20 text-slate-400">No hay calificaciones para este periodo.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
