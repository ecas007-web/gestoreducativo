import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useAuth } from '../../AuthContext.jsx';

export const StudentObserver = () => {
    const { profile } = useAuth();

    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [periodo, setPeriodo] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [studentFilter, setStudentFilter] = useState('');

    const [observations, setObservations] = useState({}); // { studentId: { id, fortalezas, ... } }

    // Estados para el Modal de Edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [modalData, setModalData] = useState({
        fortalezas: '',
        debilidades: '',
        estrategias: '',
        observaciones: ''
    });

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
                if (profile.assignedCourses) {
                    setCourses(profile.assignedCourses);
                } else {
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
                supabase.from('estudiantes').select('*').eq('curso_id', selectedCourse).eq('estado', 'activo').order('apellidos'),
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

            // Garantizar que todos los estudiantes tengan un registro en el mapa de observaciones
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
        } catch (err) {
            console.error("Error loading course data:", err);
            mostrarToast("Error al cargar datos", "error");
        }
    };

    // Filtrar estudiantes dinámicamente según la búsqueda
    const filteredStudents = useMemo(() => {
        if (!studentFilter.trim()) return students;
        const query = studentFilter.toLowerCase().trim();
        return students.filter(s =>
            `${s.nombres} ${s.apellidos}`.toLowerCase().includes(query) ||
            `${s.apellidos} ${s.nombres}`.toLowerCase().includes(query)
        );
    }, [students, studentFilter]);

    // Abrir el modal de edición
    const openEditModal = (student) => {
        setSelectedStudent(student);
        const obs = observations[student.id] || {
            fortalezas: '',
            debilidades: '',
            estrategias: '',
            observaciones: ''
        };
        setModalData({
            fortalezas: obs.fortalezas || '',
            debilidades: obs.debilidades || '',
            estrategias: obs.estrategias || '',
            observaciones: obs.observaciones || ''
        });
        setIsModalOpen(true);
    };

    // Guardar la observación individual desde el modal
    const handleSaveSingle = async () => {
        if (!selectedStudent || !activeYear || !periodo) return;
        setSaving(true);
        try {
            const payload = {
                fortalezas: modalData.fortalezas,
                debilidades: modalData.debilidades,
                estrategias: modalData.estrategias,
                observaciones: modalData.observaciones,
                estudiante_id: selectedStudent.id,
                docente_id: profile.id,
                anio_academico_id: activeYear.id,
                periodo: periodo,
                updated_at: new Date()
            };

            const existingRecord = observations[selectedStudent.id];
            let error;

            if (existingRecord?.id) {
                const res = await supabase.from('estudiante_observador').update(payload).eq('id', existingRecord.id);
                error = res.error;
            } else {
                const res = await supabase.from('estudiante_observador').insert([payload]);
                error = res.error;
            }

            if (error) throw error;

            mostrarToast('Observador guardado correctamente', 'success');
            setIsModalOpen(false);
            await loadCourseData();
        } catch (err) {
            console.error("Error saving observation:", err);
            mostrarToast(err.message || 'Error al guardar los datos', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleFilterChange = (type, value) => {
        if (type === 'curso') setSelectedCourse(value);
        if (type === 'periodo') setPeriodo(value);
    };

    if (loading) return (
        <div className="p-10 text-center font-bold text-lg text-slate-500">
            Cargando módulo de observador...
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl md:text-4xl font-black text-slate-800">Observador del Alumno</h2>
                <p className="text-base md:text-lg font-bold text-slate-500">Gestión de la hoja de vida y comportamiento de los estudiantes.</p>
            </div>

            {/* Panel de Filtros */}
            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm bg-white p-6">
                <div className="form-group">
                    <label className="form-label text-sm md:text-base font-black text-blue-600 uppercase tracking-wider mb-2">Curso</label>
                    <select
                        className="form-input text-base md:text-lg py-2.5"
                        value={selectedCourse}
                        onChange={e => handleFilterChange('curso', e.target.value)}
                    >
                        <option value="">Seleccionar curso...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label text-sm md:text-base font-black text-blue-600 uppercase tracking-wider mb-2">Periodo</label>
                    <select
                        className="form-input text-base md:text-lg py-2.5"
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
                <div className="form-group">
                    <label className="form-label text-sm md:text-base font-black text-blue-600 uppercase tracking-wider mb-2">Buscar Estudiante</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="form-input text-base md:text-lg pl-10 py-2.5"
                            placeholder="Buscar por apellidos o nombres..."
                            value={studentFilter}
                            onChange={e => setStudentFilter(e.target.value)}
                            disabled={!selectedCourse || !periodo}
                        />
                        <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-xl">search</span>
                    </div>
                </div>
            </div>

            {selectedCourse && periodo ? (
                <div className="space-y-4">
                    {filteredStudents.length === 0 ? (
                        <div className="card text-center p-12 font-bold text-lg text-slate-500 bg-white">
                            No se encontraron estudiantes registrados con los criterios seleccionados.
                        </div>
                    ) : (
                        filteredStudents.map((student, index) => (
                            <div key={student.id} className="card shadow-md bg-white p-6 border-l-[6px] border-blue-500 hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between mb-5 p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-base md:text-lg shadow-sm">
                                            {index + 1}
                                        </span>
                                        <h3 className="font-black text-slate-800 uppercase text-base md:text-lg tracking-tight">
                                            {student.apellidos} {student.nombres}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(student)}
                                        className="btn bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl flex items-center gap-2 border-none text-sm md:text-base font-black cursor-pointer shadow-sm hover:shadow-md transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg md:text-xl">edit_note</span>
                                        <span>Editar Observador</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <div className="form-group">
                                        <label className="text-xs md:text-sm font-black text-slate-400 uppercase mb-2 block tracking-wider">Fortalezas</label>
                                        <textarea
                                            className="form-input text-sm md:text-base min-h-[100px] resize-none bg-slate-50 border-slate-100 cursor-not-allowed select-none text-slate-500 leading-relaxed font-semibold"
                                            value={observations[student.id]?.fortalezas || ''}
                                            readOnly
                                            placeholder="Sin fortaleza registrada..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-xs md:text-sm font-black text-slate-400 uppercase mb-2 block tracking-wider">Debilidades</label>
                                        <textarea
                                            className="form-input text-sm md:text-base min-h-[100px] resize-none bg-slate-50 border-slate-100 cursor-not-allowed select-none text-slate-500 leading-relaxed font-semibold"
                                            value={observations[student.id]?.debilidades || ''}
                                            readOnly
                                            placeholder="Sin debilidad registrada..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-xs md:text-sm font-black text-slate-400 uppercase mb-2 block tracking-wider">Estrategias</label>
                                        <textarea
                                            className="form-input text-sm md:text-base min-h-[100px] resize-none bg-slate-50 border-slate-100 cursor-not-allowed select-none text-slate-500 leading-relaxed font-semibold"
                                            value={observations[student.id]?.estrategias || ''}
                                            readOnly
                                            placeholder="Sin estrategia registrada..."
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="text-xs md:text-sm font-black text-slate-400 uppercase mb-2 block tracking-wider">Observaciones</label>
                                        <textarea
                                            className="form-input text-sm md:text-base min-h-[100px] resize-none bg-slate-50 border-slate-100 cursor-not-allowed select-none text-slate-500 leading-relaxed font-semibold"
                                            value={observations[student.id]?.observaciones || ''}
                                            readOnly
                                            placeholder="Sin observaciones registradas..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="card text-center p-20 border-dashed border-2 bg-slate-50/50">
                    <span className="material-symbols-outlined text-7xl text-slate-300 mb-4">groups</span>
                    <p className="text-lg md:text-xl font-black text-slate-500">Selecciona un curso y periodo para visualizar las hojas de observador.</p>
                </div>
            )}

            {/* Modal de Edición del Observador (Ampliado 50% a max-w-4xl) */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col">
                        {/* Cabecera del Modal */}
                        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                            <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-600 text-2xl md:text-3xl animate-pulse">visibility</span>
                                Hoja de Observador del Alumno
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-200/50 flex transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        {/* Contenido del Modal (Fuentes aumentadas de tamaño) */}
                        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                            {/* Sesión: Datos de Estudiante */}
                            <div className="bg-blue-50/70 border border-blue-100/50 rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
                                <h4 className="text-sm md:text-base font-black text-blue-700 uppercase tracking-wider">Datos del Estudiante</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm md:text-base font-bold">
                                    <div>
                                        <p className="text-slate-400 text-xs md:text-sm font-black uppercase mb-1">Nombre Completo</p>
                                        <p className="text-slate-800 font-black text-base md:text-lg uppercase tracking-tight">{selectedStudent.apellidos}, {selectedStudent.nombres}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs md:text-sm font-black uppercase mb-1">Grado</p>
                                        <p className="text-slate-800 font-black text-base md:text-lg uppercase tracking-tight">
                                            {courses.find(c => c.id === selectedCourse)?.nombre || 'Grado no encontrado'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-xs md:text-sm font-black uppercase mb-1">Periodo</p>
                                        <p className="text-slate-800 font-black text-base md:text-lg uppercase tracking-tight">
                                            {periodo === 'P1' && 'Primer Periodo'}
                                            {periodo === 'P2' && 'Segundo Periodo'}
                                            {periodo === 'P3' && 'Tercer Periodo'}
                                            {periodo === 'P4' && 'Cuarto Periodo'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Campos de texto completo */}
                            <div className="space-y-6">
                                <div className="form-group w-full">
                                    <label className="form-label text-sm md:text-base font-black text-slate-600 uppercase tracking-wider mb-2 block">Fortalezas</label>
                                    <textarea
                                        className="form-input w-full min-h-[80px] text-base md:text-lg p-4 border-slate-200 rounded-xl focus:border-blue-500 leading-relaxed font-semibold"
                                        value={modalData.fortalezas}
                                        onChange={e => setModalData(prev => ({ ...prev, fortalezas: e.target.value }))}
                                        placeholder="Ingrese la descripción de las fortalezas pedagógicas del estudiante..."
                                    />
                                </div>

                                <div className="form-group w-full">
                                    <label className="form-label text-sm md:text-base font-black text-slate-600 uppercase tracking-wider mb-2 block">Debilidades</label>
                                    <textarea
                                        className="form-input w-full min-h-[80px] text-base md:text-lg p-4 border-slate-200 rounded-xl focus:border-blue-500 leading-relaxed font-semibold"
                                        value={modalData.debilidades}
                                        onChange={e => setModalData(prev => ({ ...prev, debilidades: e.target.value }))}
                                        placeholder="Ingrese los aspectos pedagógicos a mejorar..."
                                    />
                                </div>

                                <div className="form-group w-full">
                                    <label className="form-label text-sm md:text-base font-black text-slate-600 uppercase tracking-wider mb-2 block">Estrategias</label>
                                    <textarea
                                        className="form-input w-full min-h-[80px] text-base md:text-lg p-4 border-slate-200 rounded-xl focus:border-blue-500 leading-relaxed font-semibold"
                                        value={modalData.estrategias}
                                        onChange={e => setModalData(prev => ({ ...prev, estrategias: e.target.value }))}
                                        placeholder="Ingrese las estrategias del plan de mejoramiento implementadas..."
                                    />
                                </div>

                                <div className="form-group w-full">
                                    <label className="form-label text-sm md:text-base font-black text-slate-600 uppercase tracking-wider mb-2 block">Observaciones</label>
                                    <textarea
                                        className="form-input w-full min-h-[80px] text-base md:text-lg p-4 border-slate-200 rounded-xl focus:border-blue-500 leading-relaxed font-semibold"
                                        value={modalData.observaciones}
                                        onChange={e => setModalData(prev => ({ ...prev, observaciones: e.target.value }))}
                                        placeholder="Ingrese observaciones, recomendaciones o anotaciones del docente..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="p-6 md:p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="btn bg-slate-200 hover:bg-slate-300 text-slate-700 px-8 py-3.5 font-black rounded-xl border-none cursor-pointer transition-colors text-base md:text-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSingle}
                                disabled={saving}
                                className="btn btn-primary px-10 py-3.5 font-black rounded-xl border-none cursor-pointer transition-colors text-base md:text-lg flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                {saving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg md:text-xl">sync</span>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg md:text-xl">save</span>
                                        <span>Guardar Cambios</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
