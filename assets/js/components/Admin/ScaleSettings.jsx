import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ScaleSettings = () => {
    const [scales, setScales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadScales();
    }, []);

    const loadScales = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('escalas_valorativas')
            .select('*')
            .order('rango_minimo', { ascending: true });

        if (error) mostrarToast('Error al cargar escalas', 'error');
        else setScales(data || []);
        setLoading(false);
    };

    const handleUpdate = async (id, field, value) => {
        const updatedScales = scales.map(s => s.id === id ? { ...s, [field]: value } : s);
        setScales(updatedScales);
    };

    const saveScales = async () => {
        setSaving(true);
        try {
            for (const scale of scales) {
                const { error } = await supabase
                    .from('escalas_valorativas')
                    .update({
                        rango_minimo: parseFloat(scale.rango_minimo),
                        rango_maximo: parseFloat(scale.rango_maximo),
                        verbo: scale.verbo
                    })
                    .eq('id', scale.id);
                if (error) throw error;
            }
            mostrarToast('Escalas actualizadas correctamente', 'success');
        } catch (error) {
            mostrarToast(error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando configuración de escalas...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Escala Valorativa</h2>
                    <p className="text-slate-500 font-medium">Define los rangos de calificación y los verbos para los logros.</p>
                </div>
                <button
                    onClick={saveScales}
                    disabled={saving}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">save</span>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {scales.map((scale) => (
                    <div key={scale.id} className="card p-6 border-l-4" style={{ borderColor: getScaleColor(scale.escala) }}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="form-group">
                                <label className="form-label">Escala</label>
                                <div className="font-black text-xl text-slate-800">{scale.escala}</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rango Mínimo</label>
                                <input
                                    type="number" step="0.1" className="form-input"
                                    value={scale.rango_minimo}
                                    onChange={(e) => handleUpdate(scale.id, 'rango_minimo', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rango Máximo</label>
                                <input
                                    type="number" step="0.1" className="form-input"
                                    value={scale.rango_maximo}
                                    onChange={(e) => handleUpdate(scale.id, 'rango_maximo', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Verbo / Frase de Inicio</label>
                                <input
                                    type="text" className="form-input"
                                    placeholder="Ej: Logra de forma básica..."
                                    value={scale.verbo}
                                    onChange={(e) => handleUpdate(scale.id, 'verbo', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800">
                <span className="material-symbols-outlined">info</span>
                <p className="text-sm font-medium">
                    El <strong>Verbo</strong> se concatenará automáticamente al inicio del logro detallado cuando el estudiante alcance el rango de notas definido.
                </p>
            </div>
        </div>
    );
};

const getScaleColor = (escala) => {
    switch (escala) {
        case 'Bajo': return '#ef4444';
        case 'Básico': return '#f59e0b';
        case 'Alto': return '#3b82f6';
        case 'Superior': return '#10b981';
        default: return '#cbd5e1';
    }
}
