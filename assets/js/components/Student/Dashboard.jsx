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
    const [docentes, setDocentes] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [estadoPago, setEstadoPago] = useState({ estado: 'Calculando...', badge: 'badge-ghost', claseExtra: 'bg-slate-50 border-slate-100' });

    const MESES = [
        { id: 1, label: 'Enero' }, { id: 2, label: 'Febrero' }, { id: 3, label: 'Marzo' },
        { id: 4, label: 'Abril' }, { id: 5, label: 'Mayo' }, { id: 6, label: 'Junio' },
        { id: 7, label: 'Julio' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Septiembre' },
        { id: 10, label: 'Octubre' }, { id: 11, label: 'Noviembre' }, { id: 12, label: 'Diciembre' }
    ];
    const mesActualId = new Date().getMonth() + 1;
    const mesActualLabel = MESES.find(m => m.id === mesActualId)?.label || 'Actual';

    useEffect(() => {
        if (profile) loadStudentInfo();
    }, [profile]);

    useEffect(() => {
        if (estData) {
            // Cargar docentes apenas tengamos el curso_id
            loadDocentes();
        }
    }, [estData]);

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

        if (estRes.data && activeY) {
            verificarEstadoPago(estRes.data.id, activeY);
        }
    };

    const verificarEstadoPago = async (estudianteId, activeY) => {
        try {
            const valorPensionNormal = Number(activeY.valor_pension || 0);

            // Fetch descuento
            const { data: descuentoData } = await supabase
                .from('descuentos_pensiones')
                .select('monto_descuento')
                .eq('estudiante_id', estudianteId)
                .eq('anio_academico_id', activeY.id)
                .maybeSingle();

            const descuento = Number(descuentoData?.monto_descuento || 0);
            const pensionEsperada = valorPensionNormal - descuento;

            // Fetch pagos del mes actual
            const { data: pagos } = await supabase
                .from('pagos')
                .select('monto')
                .eq('estudiante_id', estudianteId)
                .eq('anio_academico_id', activeY.id)
                .eq('mes', mesActualId);

            const totalPagado = (pagos || []).reduce((acc, curr) => acc + Number(curr.monto), 0);

            if (totalPagado >= pensionEsperada) {
                setEstadoPago({ estado: 'Al día', badge: 'text-emerald-600', claseExtra: 'bg-emerald-50 border-emerald-100' });
            } else {
                setEstadoPago({ estado: 'En mora', badge: 'text-rose-600', claseExtra: 'bg-rose-50 border-rose-100' });
            }
        } catch (error) {
            console.error('Error verificando pago:', error);
            setEstadoPago({ estado: 'Desconocido', badge: 'text-slate-600', claseExtra: 'bg-slate-50 border-slate-100' });
        }
    };

    const loadDocentes = async () => {
        try {
            if (!estData?.curso_id) return;

            // 1. Obtener los IDs de docentes asignados al curso
            const { data: asig, error: cError } = await supabase
                .from('docente_cursos')
                .select('docente_id')
                .eq('curso_id', estData.curso_id);

            if (cError || !asig || asig.length === 0) {
                setDocentes('Sin docente asignado');
                return;
            }

            // 2. Obtener los detalles de esos docentes

            const docenteIds = [...new Set(asig.map(a => a.docente_id))];
            const { data: docs, error: dError } = await supabase
                .from('docentes')
                .select('nombres, apellidos')
                .in('id', docenteIds);

            if (dError || !docs) {
                setDocentes('Sin docente asignado');
                return;
            }

            const docsArr = docs.map(d => `${d.nombres || ''} ${d.apellidos || ''}`.trim()).filter(Boolean);
            setDocentes(docsArr.join(', ') || 'Sin docente asignado');
        } catch (error) {
            console.error("Error cargando docentes:", error);
            setDocentes('Error al cargar docentes');
        }
    };

    const loadGrades = async () => {
        if (!selectedYear || !estData?.curso_id) return;
        setLoading(true);
        const { data } = await supabase.from('calificaciones')
            .select('*, materias(nombre)')
            .eq('estudiante_id', estData.id)
            .eq('periodo', periodo)
            .eq('anio_academico_id', selectedYear);
        setNotas(data || []);
        setHasSearched(true);
        setLoading(false);
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
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="flex-1 sm:w-40">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Año Académico</label>
                            <select className="form-input w-full" value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setHasSearched(false); }}>
                                {years.map(y => <option key={y.id} value={y.id}>{y.anio}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 sm:w-64">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Periodo</label>
                            <select className="form-input w-full" value={periodo} onChange={e => { setPeriodo(e.target.value); setHasSearched(false); }}>
                                <option value="P1">Primer Periodo Académico</option>
                                <option value="P2">Segundo Periodo Académico</option>
                                <option value="P3">Tercer Periodo Académico</option>
                                <option value="P4">Cuarto Periodo Académico</option>
                            </select>
                        </div>
                        <button onClick={loadGrades} className="btn btn-primary h-12 px-8 flex items-center gap-2 shadow-lg shadow-blue-100">
                            <span className="material-symbols-outlined">search</span>
                            Consultar
                        </button>
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
                    <div className={`p-6 border rounded-3xl ${estadoPago.claseExtra}`}>
                        <p className={`text-xs font-black uppercase tracking-widest mb-1 ${estadoPago.badge}`}>
                            Pensión {mesActualLabel}
                        </p>
                        <p className={`text-2xl font-black ${estadoPago.estado === 'Al día' ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {estadoPago.estado}
                        </p>
                    </div>
                </div>

                {!hasSearched ? (
                    <div className="p-20 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl mt-6">
                        <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">analytics</span>
                        <h3 className="text-xl font-bold text-slate-500">Selecciona los filtros y haz clic en Consultar</h3>
                        <p className="text-slate-400 max-w-xs mx-auto">Para visualizar tus calificaciones y logros del periodo seleccionado.</p>
                    </div>
                ) : estadoPago.estado === 'En mora' ? (
                    <div className="p-12 text-center bg-rose-50 border border-rose-200 rounded-3xl mt-6 shadow-sm">
                        <span className="material-symbols-outlined text-rose-500 text-6xl mb-4">gavel</span>
                        <h3 className="text-2xl font-black text-rose-900 mb-2">Visualización Restringida</h3>
                        <p className="text-rose-700 font-medium max-w-md mx-auto">Tus calificaciones se encuentran bloqueadas debido a que presentas un saldo en mora en la pensión de {mesActualLabel}. Por favor ponte al día para visualizar tus notas y logros.</p>
                    </div>
                ) : estadoPago.estado === 'Calculando...' ? (
                    <div className="p-12 text-center text-slate-400 mt-6">Verificando estado de cuenta...</div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-600 text-3xl">account_circle</span>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estudiante</p>
                                    <p className="font-black text-slate-800 text-sm md:text-base leading-tight">{estData?.nombres} {estData?.apellidos}</p>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-10 bg-slate-200"></div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-600 text-3xl">school</span>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Docente(s)</p>
                                    <p className="font-bold text-slate-700 text-sm md:text-base leading-tight">{docentes}</p>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-10 bg-slate-200"></div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-violet-600 text-3xl">calendar_month</span>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Periodo</p>
                                    <p className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                                        {{ 'P1': 'Primer Periodo', 'P2': 'Segundo Periodo', 'P3': 'Tercer Periodo', 'P4': 'Cuarto Periodo' }[periodo] || periodo}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Dimensión</th>
                                        <th>Escala</th>
                                        <th>Logro</th>
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
                                                    <td><span className={`badge ${getScaleBadgeClass(n.escala_valorativa)}`}>{n.escala_valorativa || 'Pendiente'}</span></td>
                                                    <td className="text-sm text-slate-600 font-medium max-w-xs">{n.logro_calculado || n.descripcion || 'Sin observaciones.'}</td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/50">
                                                        <td colSpan="3" className="p-6">
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
                                        <tr><td colSpan="3" className="text-center py-20 text-slate-400">No hay calificaciones para este periodo.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
