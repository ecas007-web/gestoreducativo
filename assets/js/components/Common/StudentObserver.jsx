import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigationGuard } from '../../context/NavigationContext.jsx';

export const StudentObserver = () => {
    const { profile } = useAuth();
    const { setIsDirty, setSaveHandler, attemptNavigation } = useNavigationGuard();

    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [periodo, setPeriodo] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeYear, setActiveYear] = useState(null);

    const [observations, setObservations] = useState({}); // { studentId: { id, fortalezas, ... } }
    const [originalObservations, setOriginalObservations] = useState({});

    const hasChanges = useMemo(() => {
        return JSON.stringify(observations) !== JSON.stringify(originalObservations);
    }, [observations, originalObservations]);

    // Sync isDirty with global guard
    useEffect(() => {
        setIsDirty(hasChanges);
        return () => setIsDirty(false);
    }, [hasChanges, setIsDirty]);

    useEffect(() => {
        if (profile) {
            loadInitialData();
        }
    }, [profile]);

    useEffect(() => {
        if (selectedCourse && activeYear && periodo) {
            loadCourseData();
        } else if (!periodo || !selectedCourse) {
            setStudents([]);
            setObservations({});
            setOriginalObservations({});
        }
    }, [selectedCourse, periodo, activeYear]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [yRes] = await Promise.all([
                supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle()
            ]);
            setActiveYear(yRes.data);

            if (profile?.rol === 'admin') {
                const { data } = await supabase.from('cursos').select('*').order('nombre');
                setCourses(data || []);
            } else if (profile?.rol === 'docente') {
                // Priorizar el uso de cursos pre-cargados en el perfil (AuthContext)
                if (profile.assignedCourses) {
                    setCourses(profile.assignedCourses);
                } else {
                    // Fallback en caso de que aún no estén cargados o haya un error en la pre-carga
                    const { data: teacher } = await supabase.from('docentes').select('id').eq('user_id', profile.id).single();
                    if (teacher) {
                        const { data: asig } = await supabase.from('docente_cursos')
                            .select('cursos(*)')
                            .eq('docente_id', teacher.id);
                        setCourses(asig?.map(a => a.cursos).filter(Boolean) || []);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadCourseData = async () => {
        if (!periodo) return;
        try {
            const [stdRes, obsRes] = await Promise.all([
                supabase.from('estudiantes').select('*').eq('curso_id', selectedCourse).order('apellidos'),
                supabase.from('estudiante_observador').select('*').match({
                    periodo: periodo,
                    anio_academico_id: activeYear.id
                })
            ]);

            const stds = stdRes.data || [];
            const obsMap = {};
            (obsRes.data || []).forEach(o => {
                obsMap[o.estudiante_id] = {
                    id: o.id,
                    fortalezas: o.fortalezas || '',
                    debilidades: o.debilidades || '',
                    estrategias: o.estrategias || '',
                    observaciones: o.observaciones || ''
                };
            });

            // Ensure all students have an entry in the map for controlled inputs
            stds.forEach(s => {
                if (!obsMap[s.id]) {
                    obsMap[s.id] = {
                        fortalezas: '',
                        debilidades: '',
                        estrategias: '',
                        observaciones: ''
                    };
                }
            });

            setStudents(stds);
            setObservations(obsMap);
            setOriginalObservations(JSON.parse(JSON.stringify(obsMap)));
        } catch (err) {
            console.error("Error loading course data:", err);
            mostrarToast("Error al cargar datos", "error");
        }
    };

    const handleInputChange = (studentId, field, value) => {
        setObservations(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSaveAll = useCallback(async () => {
        if (!selectedCourse || !activeYear || !periodo) {
            return mostrarToast('Selecciona curso y periodo', 'warning');
        }
        setSaving(true);
        try {
            const promises = [];

            for (const studentId in observations) {
                const data = observations[studentId];
                const original = originalObservations[studentId];

                // Only save if it changed
                if (JSON.stringify(data) !== JSON.stringify(original)) {
                    const payload = {
                        fortalezas: data.fortalezas,
                        debilidades: data.debilidades,
                        estrategias: data.estrategias,
                        observaciones: data.observaciones,
                        estudiante_id: studentId,
                        docente_id: profile.id,
                        anio_academico_id: activeYear.id,
                        periodo: periodo,
                        updated_at: new Date()
                    };

                    if (data.id) {
                        promises.push(supabase.from('estudiante_observador').update(payload).eq('id', data.id));
                    } else {
                        promises.push(supabase.from('estudiante_observador').insert([payload]));
                    }
                }
            }

            if (promises.length === 0) {
                setSaving(false);
                return mostrarToast('No hay cambios para guardar', 'info');
            }

            const results = await Promise.all(promises);
            const firstError = results.find(r => r.error)?.error;

            if (firstError) throw firstError;

            mostrarToast('Cambios guardados correctamente', 'success');
            await loadCourseData();
        } catch (err) {
            console.error("Error saving observations:", err);
            mostrarToast(err.message || 'Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    }, [observations, originalObservations, selectedCourse, activeYear, periodo, profile.id]);

    // Register save handler for navigation guard
    useEffect(() => {
        setSaveHandler(() => handleSaveAll);
        return () => setSaveHandler(null);
    }, [handleSaveAll, setSaveHandler]);

    const handleFilterChange = (type, value) => {
        if (hasChanges) {
            attemptNavigation(() => {
                if (type === 'curso') setSelectedCourse(value);
                if (type === 'periodo') setPeriodo(value);
            });
        } else {
            if (type === 'curso') setSelectedCourse(value);
            if (type === 'periodo') setPeriodo(value);
        }
    };

    if (loading) return (
        <div className="p-10 text-center font-medium text-slate-500">
            Cargando módulo de observador...
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Observador del Alumno</h2>
                    <p className="text-slate-500 font-medium text-sm">Registro masivo de fortalezas, debilidades y estrategias.</p>
                </div>
                {selectedCourse && (
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || !hasChanges}
                        className={`btn px-8 py-3 flex items-center gap-2 shadow-lg transition-all ${!hasChanges ? 'bg-slate-100 text-slate-400' : 'btn-primary animate-fadeIn'}`}
                    >
                        <span className={`material-symbols-outlined ${saving ? 'animate-spin' : ''}`}>
                            {saving ? 'sync' : 'save'}
                        </span>
                        <span className="font-bold">{saving ? 'Guardando...' : 'Guardar Todo'}</span>
                    </button>
                )}
            </div>

            <div className="card grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                    <label className="form-label text-xs uppercase tracking-wider opacity-60">Curso</label>
                    <select
                        className="form-input"
                        value={selectedCourse}
                        onChange={e => handleFilterChange('curso', e.target.value)}
                    >
                        <option value="">Seleccionar curso...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label text-xs uppercase tracking-wider opacity-60">Periodo</label>
                    <select
                        className="form-input"
                        value={periodo}
                        onChange={e => handleFilterChange('periodo', e.target.value)}
                    >
                        <option value="">Seleccionar periodo...</option>
                        <option value="P1">Primer Periodo</option>
                        <option value="P2">Segundo Periodo</option>
                        <option value="P3">Tercer Periodo</option>
                        <option value="P4">Cuarto Periodo</option>
                    </select>
                </div>
            </div>

            {selectedCourse && periodo ? (
                <div className="space-y-4">
                    {students.length === 0 ? (
                        <div className="card text-center p-10 font-medium text-slate-500">
                            No hay estudiantes registrados en este curso.
                        </div>
                    ) : (
                        students.map((student, index) => (
                            <div key={student.id} className="card shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-3 mb-4 p-2 bg-slate-50 rounded-lg">
                                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-bold text-slate-800 uppercase text-sm">
                                        {student.apellidos} {student.nombres}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fortalezas</label>
                                        <textarea
                                            className="form-input text-2xl min-h-[80px] resize-none"
                                            value={observations[student.id]?.fortalezas || ''}
                                            onChange={e => handleInputChange(student.id, 'fortalezas', e.target.value)}
                                            placeholder="Describa fortalezas..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Debilidades</label>
                                        <textarea
                                            className="form-input text-2xl min-h-[80px] resize-none"
                                            value={observations[student.id]?.debilidades || ''}
                                            onChange={e => handleInputChange(student.id, 'debilidades', e.target.value)}
                                            placeholder="Describa debilidades..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Estrategias</label>
                                        <textarea
                                            className="form-input text-2xl min-h-[80px] resize-none"
                                            value={observations[student.id]?.estrategias || ''}
                                            onChange={e => handleInputChange(student.id, 'estrategias', e.target.value)}
                                            placeholder="Describa estrategias..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Observaciones</label>
                                        <textarea
                                            className="form-input text-2xl min-h-[80px] resize-none"
                                            value={observations[student.id]?.observaciones || ''}
                                            onChange={e => handleInputChange(student.id, 'observaciones', e.target.value)}
                                            placeholder="Observaciones generales..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="card text-center p-20 border-dashed border-2 bg-slate-50/50">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">groups</span>
                    <p className="text-slate-500 font-medium">Selecciona un curso para comenzar el registro del observador.</p>
                </div>
            )}
        </div>
    );
};
