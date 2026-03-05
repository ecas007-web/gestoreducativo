import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';

export const StudentDashboard = () => {
    const { profile } = useAuth();
    const [periodo, setPeriodo] = useState('P1');
    const [estData, setEstData] = useState(null);
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) loadStudentInfo();
    }, [profile]);

    useEffect(() => {
        if (estData) loadGrades();
    }, [estData, periodo]);

    const loadStudentInfo = async () => {
        setLoading(true);
        const { data } = await supabase.from('estudiantes')
            .select('*, cursos(nombre)')
            .eq('numero_documento', profile.numero_documento)
            .single();
        setEstData(data);
        setLoading(false);
    };

    const loadGrades = async () => {
        const { data } = await supabase.from('calificaciones')
            .select('*, materias(nombre)')
            .eq('estudiante_id', estData.id)
            .eq('periodo', periodo)
            .eq('anio', new Date().getFullYear());
        setNotas(data || []);
    };

    const prom = notas.length > 0 ? (notas.reduce((acc, n) => acc + n.nota, 0) / notas.length).toFixed(2) : '0.00';

    const getQualVal = (nota) => {
        if (nota >= 4.5) return { text: 'Superior', className: 'badge-success' };
        if (nota >= 4.0) return { text: 'Alto', className: 'badge-primary' };
        if (nota >= 3.0) return { text: 'Básico', className: 'badge-warning' };
        return { text: 'Bajo', className: 'badge-error' };
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
                    <select className="form-input w-48" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                        <option value="P1">Primer Periodo</option>
                        <option value="P2">Segundo Periodo</option>
                        <option value="P3">Tercer Periodo</option>
                        <option value="P4">Cuarto Periodo</option>
                    </select>
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
                                const qual = getQualVal(n.nota);
                                return (
                                    <tr key={n.id}>
                                        <td><p className="font-bold text-slate-800">{n.materias?.nombre}</p></td>
                                        <td className="text-center font-black text-lg">{n.nota.toFixed(1)}</td>
                                        <td><span className={`badge ${qual.className}`}>{qual.text}</span></td>
                                        <td className="text-sm text-slate-500 italic max-w-xs truncate">{n.descripcion || 'Sin nota explicativa.'}</td>
                                    </tr>
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
