import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const PeriodManager = () => {
    const [periods, setPeriods] = useState([]);
    const [activeYear, setActiveYear] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Obtener el año académico activo
            const { data: yearData, error: yearError } = await supabase
                .from('anios_academicos')
                .select('*')
                .eq('estado', true)
                .maybeSingle();

            if (yearError) throw yearError;
            if (!yearData) {
                mostrarToast('No hay un año académico activo.', 'warning');
                return;
            }
            setActiveYear(yearData);

            // 2. Obtener los estados de los periodos para ese año
            const { data: periodData, error: periodError } = await supabase
                .from('periodos_estado')
                .select('*')
                .eq('anio_academico_id', yearData.id)
                .order('periodo', { ascending: true });

            if (periodError) throw periodError;
            setPeriods(periodData || []);
        } catch (err) {
            mostrarToast('Error al cargar datos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const togglePeriod = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('periodos_estado')
                .update({ estado: !currentStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setPeriods(periods.map(p => p.id === id ? { ...p, estado: !currentStatus } : p));
            mostrarToast(`Periodo ${!currentStatus ? 'activado' : 'cerrado'} correctamente`, 'success');
        } catch (err) {
            mostrarToast('Error al actualizar periodo: ' + err.message, 'error');
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400 text-lg font-bold">Cargando estados de periodos...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-3xl font-black text-slate-800">Cierre de Periodos Académicos</h2>
                <p className="text-slate-500 font-medium">Controla qué periodos están disponibles para el registro de calificaciones y logros.</p>
                {activeYear && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        Año Activo: {activeYear.anio}
                    </div>
                )}
            </div>

            {!activeYear ? (
                <div className="card text-center p-20 border-dashed border-2 border-slate-200 bg-slate-50">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">event_busy</span>
                    <p className="text-slate-500 font-medium">Debe activar un año académico primero para gestionar sus periodos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {periods.map((p) => (
                        <div key={p.id} className={`card p-6 border-t-4 transition-all hover:shadow-lg ${p.estado ? 'border-emerald-500 bg-emerald-50/10' : 'border-rose-500 bg-rose-50/10 grayscale-[0.5]'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-4xl font-black text-slate-800">{p.periodo}</h3>
                                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${p.estado ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {p.estado ? 'Periodo Abierto' : 'Periodo Cerrado'}
                                    </p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.estado ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    <span className="material-symbols-outlined text-3xl">
                                        {p.estado ? 'lock_open' : 'lock'}
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
                                {p.estado
                                    ? 'Los docentes pueden subir calificaciones y editar logros para este periodo.'
                                    : 'El registro de calificaciones y edición de logros está bloqueado para este periodo.'}
                            </p>

                            <button
                                onClick={() => togglePeriod(p.id, p.estado)}
                                className={`btn w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all shadow-md active:scale-95 ${p.estado ? '!bg-rose-600 hover:!bg-rose-700 text-white' : 'btn-primary'}`}
                            >
                                <span className="material-symbols-outlined">
                                    {p.estado ? 'close' : 'check_circle'}
                                </span>
                                {p.estado ? 'Cerrar Periodo' : 'Abrir Periodo'}
                            </button>

                            {p.updated_at && (
                                <div className="mt-4 text-[10px] text-slate-400 text-center font-medium italic">
                                    Último cambio: {new Date(p.updated_at).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="card bg-amber-50 border-amber-200 flex gap-4 p-6">
                <span className="material-symbols-outlined text-amber-600 text-3xl shrink-0">info</span>
                <div className="text-sm text-amber-800 leading-relaxed font-medium">
                    <p className="font-bold text-base mb-1">Impacto del Cierre</p>
                    Al cerrar un periodo, se inhabilita el guardado en los módulos de <strong>Calificaciones</strong>, <strong>Logros Generales</strong> y <strong>Comportamiento</strong> para dicho periodo. Los docentes recibirán una notificación si intentan realizar cambios.
                </div>
            </div>
        </div>
    );
};
