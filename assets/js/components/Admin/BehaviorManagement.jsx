import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const BehaviorManagement = () => {
    const { profile } = useAuth();
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [behaviors, setBehaviors] = useState({});
    const [activeYear, setActiveYear] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});

    // Filters
    const [filterGrade, setFilterGrade] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('P1');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (filterGrade && filterPeriod && activeYear) {
            loadStudentsAndBehaviors();
        } else {
            setStudents([]);
            setBehaviors({});
        }
    }, [filterGrade, filterPeriod, activeYear]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Load active academic year
            const { data: yData } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            setActiveYear(yData);

            // 2. Load Courses based on role
            if (profile.rol === 'admin') {
                const { data: cData } = await supabase.from('cursos').select('*').order('nombre');
                setCourses(cData || []);
            } else {
                if (profile.assignedCourses) {
                    setCourses(profile.assignedCourses);
                } else {
                    const { data: doc } = await supabase.from('docentes').select('id').eq('user_id', profile.id).single();
                    if (doc) {
                        const { data: assigned } = await supabase
                            .from('docente_cursos')
                            .select('curso_id, cursos(id, nombre)')
                            .eq('docente_id', doc.id);
                        setCourses(assigned?.map(a => a.cursos) || []);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al cargar datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadStudentsAndBehaviors = async () => {
        setLoading(true);
        try {
            // 1. Get students for this grade
            const { data: sData } = await supabase
                .from('estudiantes')
                .select('id, nombres, apellidos')
                .eq('curso_id', filterGrade)
                .order('apellidos');

            setStudents(sData || []);

            // 2. Get existing behaviors for these students in this period/year
            if (sData?.length > 0) {
                const { data: bData } = await supabase
                    .from('comportamientos')
                    .select('*')
                    .eq('periodo', filterPeriod)
                    .eq('anio_academico_id', activeYear.id)
                    .in('estudiante_id', sData.map(s => s.id));

                const behaviorMap = {};
                // Initialize map with student IDs
                sData.forEach(s => {
                    behaviorMap[s.id] = { escala: 'Alto', descripcion: '' };
                });
                // Merge with existing data
                bData?.forEach(b => {
                    behaviorMap[b.estudiante_id] = {
                        id: b.id,
                        escala: b.escala,
                        descripcion: b.descripcion || ''
                    };
                });
                setBehaviors(behaviorMap);
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al cargar comportamientos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBehaviorChange = (studentId, field, value) => {
        setBehaviors(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async (studentId) => {
        if (!activeYear) return;

        setSaving(prev => ({ ...prev, [studentId]: true }));
        const data = behaviors[studentId];

        const payload = {
            estudiante_id: studentId,
            periodo: filterPeriod,
            anio_academico_id: activeYear.id,
            escala: data.escala,
            descripcion: data.descripcion
        };

        try {
            let error;
            if (data.id) {
                // Update
                const { error: err } = await supabase
                    .from('comportamientos')
                    .update({ escala: data.escala, descripcion: data.descripcion })
                    .eq('id', data.id);
                error = err;
            } else {
                // Insert
                const { data: inserted, error: err } = await supabase
                    .from('comportamientos')
                    .insert([payload])
                    .select()
                    .single();
                error = err;
                if (inserted) {
                    handleBehaviorChange(studentId, 'id', inserted.id);
                }
            }

            if (error) throw error;
            mostrarToast('Guardado correctamente', 'success');
        } catch (error) {
            console.error(error);
            mostrarToast('Error al guardar', 'error');
        } finally {
            setSaving(prev => ({ ...prev, [studentId]: false }));
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Módulo de Comportamiento</h2>
                    <p className="text-slate-500">Gestiona la escala valorativa y descripción conductual por periodo.</p>
                </div>
                {activeYear && (
                    <div className="badge badge-primary py-3 px-4 h-auto flex flex-col items-end">
                        <span className="text-[10px] opacity-75 uppercase tracking-wider font-bold">Año Activo</span>
                        <span className="text-lg leading-none">{activeYear.anio}</span>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card bg-white p-4 shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                        <label className="form-label">Grado / Curso</label>
                        <select
                            className="form-input"
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                        >
                            <option value="">Seleccionar Grado...</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Periodo</label>
                        <select
                            className="form-input"
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                        >
                            <option value="P1">Primer Periodo</option>
                            <option value="P2">Segundo Periodo</option>
                            <option value="P3">Tercer Periodo</option>
                            <option value="P4">Cuarto Periodo</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Students List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : filterGrade ? (
                <div className="card bg-white shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold">
                                <tr>
                                    <th className="py-4 px-6">Estudiante</th>
                                    <th className="py-4 px-6">Escala</th>
                                    <th className="py-4 px-6">Descripción Conductual</th>
                                    <th className="py-4 px-6 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length > 0 ? (
                                    students.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6 font-medium text-slate-800">
                                                {student.apellidos} {student.nombres}
                                            </td>
                                            <td className="py-4 px-6 min-w-[150px]">
                                                <select
                                                    className="form-input text-sm"
                                                    value={behaviors[student.id]?.escala || 'Alto'}
                                                    onChange={(e) => handleBehaviorChange(student.id, 'escala', e.target.value)}
                                                >
                                                    <option value="Bajo">Bajo</option>
                                                    <option value="Básico">Básico</option>
                                                    <option value="Alto">Alto</option>
                                                    <option value="Superior">Superior</option>
                                                </select>
                                            </td>
                                            <td className="py-4 px-6 min-w-[300px]">
                                                <textarea
                                                    className="form-input text-sm min-h-[80px] resize-y"
                                                    placeholder="Ej: El estudiante demuestra un comportamiento ejemplar..."
                                                    value={behaviors[student.id]?.descripcion || ''}
                                                    onChange={(e) => handleBehaviorChange(student.id, 'descripcion', e.target.value)}
                                                ></textarea>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => handleSave(student.id)}
                                                    disabled={saving[student.id]}
                                                    className="btn btn-primary btn-sm min-w-[100px]"
                                                >
                                                    {saving[student.id] ? (
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-[18px]">save</span>
                                                            Guardar
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-12 text-slate-400 italic">
                                            No hay estudiantes registrados en este grado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
                    <p className="text-lg">Selecciona un grado para comenzar a gestionar los comportamientos.</p>
                </div>
            )}
        </div>
    );
};
