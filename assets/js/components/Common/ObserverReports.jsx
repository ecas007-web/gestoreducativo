import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useAuth } from '../../AuthContext.jsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export const ObserverReports = () => {
    const { profile } = useAuth();
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [periodo, setPeriodo] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [observations, setObservations] = useState([]);
    const [previewData, setPreviewData] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, [profile]);

    useEffect(() => {
        if (selectedCourse) {
            loadStudents();
        } else {
            setStudents([]);
            setSelectedStudent('');
        }
    }, [selectedCourse]);

    useEffect(() => {
        if (selectedCourse && periodo) {
            loadObservations();
        }
    }, [selectedCourse, periodo, selectedStudent]);

    const loadInitialData = async () => {
        if (!profile) return;
        try {
            const { data: year } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            setActiveYear(year);

            if (profile.rol === 'admin') {
                const { data } = await supabase.from('cursos').select('*').order('nombre');
                setCourses(data || []);
            } else {
                const { data: teacher } = await supabase.from('docentes').select('id').eq('user_id', profile.id).single();
                if (teacher) {
                    const { data: asig } = await supabase.from('docente_cursos').select('cursos(*)').eq('docente_id', teacher.id);
                    setCourses(asig?.map(a => a.cursos).filter(Boolean) || []);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadStudents = async () => {
        const { data } = await supabase.from('estudiantes').select('*').eq('curso_id', selectedCourse).order('apellidos');
        setStudents(data || []);
    };

    const loadObservations = async () => {
        setLoading(true);
        try {
            // Using aliases to ensure predictable property names
            let query = supabase.from('estudiante_observador')
                .select('*, estudiante:estudiantes(*, curso:cursos(*))')
                .eq('anio_academico_id', activeYear.id)
                .eq('periodo', periodo);

            if (selectedStudent) {
                query = query.eq('estudiante_id', selectedStudent);
            } else if (students.length > 0) {
                query = query.in('estudiante_id', students.map(s => s.id));
            }

            const { data, error } = await query;
            if (error) throw error;

            setObservations(data || []);

            if (selectedStudent) {
                setPreviewData(data?.find(o => o.estudiante_id === selectedStudent));
            } else {
                setPreviewData(null);
            }
        } catch (err) {
            console.error(err);
            mostrarToast("Error al cargar observaciones: " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSingle = async (obs) => {
        if (!obs) return;
        setGenerating(true);
        try {
            const response = await fetch('/plantillas/plantilla_observador.docx');
            if (!response.ok) throw new Error("No se pudo cargar la plantilla");
            const content = await response.arrayBuffer();

            // Obtener TODO el historial de observaciones del estudiante para el año activo
            const { data: historial } = await supabase
                .from('estudiante_observador')
                .select('*')
                .eq('estudiante_id', obs.estudiante_id)
                .eq('anio_academico_id', activeYear.id)
                .order('periodo');

            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '%', end: '%' }
            });

            // Fallback strategy for joined tables
            const student = obs.estudiante || obs.estudiantes;
            const curso = student?.curso || student?.cursos;

            const periodNames = {
                'P1': 'Primer Periodo',
                'P2': 'Segundo Periodo',
                'P3': 'Tercer Periodo',
                'P4': 'Cuarto Periodo'
            };

            // Date formatting: lunes 9 de marzo de 2026
            const fechaActualLong = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const data = {
                'nombres': student?.nombres?.toUpperCase() || '',
                'apellidos': student?.apellidos?.toUpperCase() || '',
                'apellidos y nombres': `${student?.apellidos || ''} ${student?.nombres || ''}`.toUpperCase(),
                'numero_documento': student?.numero_documento || '',
                'tipo_documento': student?.tipo_documento || '',
                'curso': (curso?.nombre || 'N/A').toUpperCase(),
                'grado': (curso?.nombre || 'N/A').toUpperCase(),
                'periodo': periodNames[obs.periodo] || obs.periodo,
                'fortalezas': obs.fortalezas || '',
                'debilidades': obs.debilidades || '',
                'estrategias': obs.estrategias || '',
                'observaciones': obs.observaciones || '',
                'anio': activeYear?.anio || '',
                'año': activeYear?.anio || '',
                'fecha actual': fechaActualLong,
                'fecha': new Date().toLocaleDateString(),
                // Extended student fields as requested
                'fecha_nac': student?.fecha_nac || '',
                'lugar_nacimiento': student?.lugar_nacimiento || '',
                'direccion': student?.direccion || '',
                'correo': student?.correo || '',
                'telefono': student?.telefono || '',
                'celular': student?.celular || '',
                'eps': student?.eps || '',
                'tipo_sangre': student?.tipo_sangre || '',
                // Datos Familiares
                'nombre_padre': student?.nombre_padre?.toUpperCase() || '',
                'documento_padre': student?.documento_padre || '',
                'ocupacion_padre': student?.ocupacion_padre || '',
                'telefono_padre': student?.telefono_padre || '',
                'nombre_madre': student?.nombre_madre?.toUpperCase() || '',
                'documento_madre': student?.documento_madre || '',
                'ocupacion_madre': student?.ocupacion_madre || '',
                'telefono_madre': student?.telefono_madre || '',
                // Detalle del Observador (Bucle)
                'observadores': (historial || []).map(h => ({
                    periodo: periodNames[h.periodo] || h.periodo,
                    fortalezas: h.fortalezas || '',
                    debilidades: h.debilidades || '',
                    estrategias: h.estrategias || '',
                    observaciones: h.observaciones || ''
                }))
            };

            doc.render(data);
            const out = doc.getZip().generate({ type: 'blob' });
            saveAs(out, `Observador_${student?.apellidos || 'Reporte'}_${student?.nombres || ''}.docx`);
            mostrarToast('Reporte generado correctamente', 'success');
        } catch (err) {
            console.error(err);
            mostrarToast('Error: ' + err.message, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateBulk = async (mode = 'single_doc') => {
        if (observations.length === 0) return mostrarToast('No hay datos para generar', 'warning');
        setGenerating(true);
        try {
            const response = await fetch('/plantillas/plantilla_observador.docx');
            const templateBuffer = await response.arrayBuffer();

            // Date formatting: lunes 9 de marzo de 2026
            const fechaActualLong = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const periodNames = {
                'P1': 'Primer Periodo',
                'P2': 'Segundo Periodo',
                'P3': 'Tercer Periodo',
                'P4': 'Cuarto Periodo'
            };

            if (mode === 'zip') {
                const zip = new JSZip();
                for (const obs of observations) {
                    const student = obs.estudiante || obs.estudiantes;
                    const curso = student?.curso || student?.cursos;

                    // Obtener historial individual para cada estudiante en el ZIP
                    const { data: historial } = await supabase
                        .from('estudiante_observador')
                        .select('*')
                        .eq('estudiante_id', obs.estudiante_id)
                        .eq('anio_academico_id', activeYear.id)
                        .order('periodo');

                    const docZip = new PizZip(templateBuffer);
                    const doc = new Docxtemplater(docZip, { delimiters: { start: '%', end: '%' } });
                    doc.render({
                        'nombres': student?.nombres?.toUpperCase() || '',
                        'apellidos': student?.apellidos?.toUpperCase() || '',
                        'apellidos y nombres': `${student?.apellidos || ''} ${student?.nombres || ''}`.toUpperCase(),
                        'numero_documento': student?.numero_documento || '',
                        'tipo_documento': student?.tipo_documento || '',
                        'periodo': periodNames[obs.periodo] || obs.periodo,
                        'fortalezas': obs.fortalezas || '',
                        'debilidades': obs.debilidades || '',
                        'estrategias': obs.estrategias || '',
                        'observaciones': obs.observaciones || '',
                        'anio': activeYear?.anio || '',
                        'año': activeYear?.anio || '',
                        'curso': (curso?.nombre || 'N/A').toUpperCase(),
                        'grado': (curso?.nombre || 'N/A').toUpperCase(),
                        'fecha actual': fechaActualLong,
                        'fecha_nac': student?.fecha_nac || '',
                        'lugar_nacimiento': student?.lugar_nacimiento || '',
                        'direccion': student?.direccion || '',
                        'correo': student?.correo || '',
                        'telefono': student?.telefono || '',
                        'celular': student?.celular || '',
                        'eps': student?.eps || '',
                        'tipo_sangre': student?.tipo_sangre || '',
                        // Datos Familiares
                        'nombre_padre': student?.nombre_padre?.toUpperCase() || '',
                        'documento_padre': student?.documento_padre || '',
                        'ocupacion_padre': student?.ocupacion_padre || '',
                        'telefono_padre': student?.telefono_padre || '',
                        'nombre_madre': student?.nombre_madre?.toUpperCase() || '',
                        'documento_madre': student?.documento_madre || '',
                        'ocupacion_madre': student?.ocupacion_madre || '',
                        'telefono_madre': student?.telefono_madre || '',
                        // Historial
                        'observadores': (historial || []).map(h => ({
                            periodo: periodNames[h.periodo] || h.periodo,
                            fortalezas: h.fortalezas || '',
                            debilidades: h.debilidades || '',
                            estrategias: h.estrategias || '',
                            observaciones: h.observaciones || ''
                        }))
                    });
                    const out = doc.getZip().generate({ type: 'uint8array' });
                    zip.file(`Observador_${student?.apellidos || 'Reporte'}_${student?.nombres || ''}.docx`, out);
                }
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `Observadores_${periodo}.zip`);
            } else {
                mostrarToast('Generando documento único...', 'info');
                const docZip = new PizZip(templateBuffer);
                const doc = new Docxtemplater(docZip, { delimiters: { start: '%', end: '%' } });

                // Para el documento único, necesitamos traer los historiales de todos los estudiantes filtrados
                const studentIds = observations.map(o => o.estudiante_id);
                const { data: todosLosHistoriales } = await supabase
                    .from('estudiante_observador')
                    .select('*')
                    .in('estudiante_id', studentIds)
                    .eq('anio_academico_id', activeYear.id)
                    .order('periodo');

                const data = {
                    estudiantes_lista: observations.map(obs => {
                        const student = obs.estudiante || obs.estudiantes;
                        const curso = student?.curso || student?.cursos;
                        const historialEstudiante = (todosLosHistoriales || []).filter(h => h.estudiante_id === obs.estudiante_id);

                        return {
                            'nombres': student?.nombres?.toUpperCase() || '',
                            'apellidos': student?.apellidos?.toUpperCase() || '',
                            'apellidos y nombres': `${student?.apellidos || ''} ${student?.nombres || ''}`.toUpperCase(),
                            'numero_documento': student?.numero_documento || '',
                            'tipo_documento': student?.tipo_documento || '',
                            'periodo': periodNames[obs.periodo] || obs.periodo,
                            'fortalezas': obs.fortalezas || '',
                            'debilidades': obs.debilidades || '',
                            'estrategias': obs.estrategias || '',
                            'observaciones': obs.observaciones || '',
                            'anio': activeYear?.anio || '',
                            'año': activeYear?.anio || '',
                            'curso': (curso?.nombre || 'N/A').toUpperCase(),
                            'grado': (curso?.nombre || 'N/A').toUpperCase(),
                            'fecha actual': fechaActualLong,
                            // Familiares
                            'nombre_padre': student?.nombre_padre?.toUpperCase() || '',
                            'documento_padre': student?.documento_padre || '',
                            'ocupacion_padre': student?.ocupacion_padre || '',
                            'telefono_padre': student?.telefono_padre || '',
                            'nombre_madre': student?.nombre_madre?.toUpperCase() || '',
                            'documento_madre': student?.documento_madre || '',
                            'ocupacion_madre': student?.ocupacion_madre || '',
                            'telefono_madre': student?.telefono_madre || '',
                            // Otros datos
                            'fecha_nac': student?.fecha_nac || '',
                            'lugar_nacimiento': student?.lugar_nacimiento || '',
                            'direccion': student?.direccion || '',
                            'correo': student?.correo || '',
                            'telefono': student?.telefono || '',
                            'celular': student?.celular || '',
                            'eps': student?.eps || '',
                            'tipo_sangre': student?.tipo_sangre || '',
                            'observadores': historialEstudiante.map(h => ({
                                periodo: periodNames[h.periodo] || h.periodo,
                                fortalezas: h.fortalezas || '',
                                debilidades: h.debilidades || '',
                                estrategias: h.estrategias || '',
                                observaciones: h.observaciones || ''
                            }))
                        };
                    })
                };

                try {
                    doc.render(data);
                } catch (error) {
                    if (error.properties && error.properties.errors instanceof Array) {
                        const errorMessages = error.properties.errors.map(function (error) {
                            return error.properties.explanation;
                        }).join("\n");
                        console.error("Errores de plantilla:", errorMessages);
                        throw new Error("Errores en la plantilla Word: " + errorMessages);
                    }
                    throw error;
                }

                const out = doc.getZip().generate({ type: 'blob' });
                saveAs(out, `Observadores_Consolidado_${periodo}.docx`);
            }
            mostrarToast('Proceso completado', 'success');
        } catch (err) {
            console.error("Error detallado:", err);
            mostrarToast(err.message, 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Reporte de Observador</h2>
                    <p className="text-slate-500 font-medium">Genera informes detallados del seguimiento estudiantil.</p>
                </div>
            </div>

            <div className="card bg-slate-900 border-none text-white p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="form-group">
                        <label className="form-label text-blue-200">Curso</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                            <option value="" className="text-slate-800">Seleccionar...</option>
                            {courses.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200">Estudiante (Opcional)</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedCourse}>
                            <option value="" className="text-slate-800">Todos los estudiantes</option>
                            {students.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.apellidos}, {s.nombres}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200">Periodo</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                            <option value="" className="text-slate-800">Seleccionar...</option>
                            <option value="P1" className="text-slate-800">Periodo 1</option>
                            <option value="P2" className="text-slate-800">Periodo 2</option>
                            <option value="P3" className="text-slate-800">Periodo 3</option>
                            <option value="P4" className="text-slate-800">Periodo 4</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleGenerateBulk('single_doc')}
                            className="btn btn-primary flex-1"
                            disabled={generating || !selectedCourse || !periodo}
                        >
                            <span className="material-symbols-outlined">description</span>
                            DOCX Único
                        </button>
                        <button
                            onClick={() => handleGenerateBulk('zip')}
                            className="btn btn-secondary flex-1"
                            disabled={generating || !selectedCourse || !periodo}
                        >
                            <span className="material-symbols-outlined">folder_zip</span>
                            ZIP (Individuales)
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-slate-400 font-bold">Cargando datos del reporte...</div>
            ) : previewData ? (
                <div className="animate-fadeIn">
                    <div className="flex justify-end mb-4 gap-2">
                        <button onClick={() => window.print()} className="btn btn-ghost border-slate-200">
                            <span className="material-symbols-outlined">print</span> Imprimir
                        </button>
                        <button onClick={() => handleGenerateSingle(previewData)} className="btn btn-primary" disabled={generating}>
                            <span className="material-symbols-outlined">download</span> Descargar DOCX
                        </button>
                    </div>

                    {/* Paper Preview */}
                    <div className="preview-paper bg-white shadow-2xl mx-auto p-[2cm] min-h-[27.9cm] w-[21.6cm] text-slate-900 border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0">
                        <div className="border-b-4 border-blue-600 pb-4 mb-6 flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black text-blue-600 uppercase">Observador del Alumno</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{activeYear?.anio || ''} - {periodo}</p>
                            </div>
                            <div className="text-right text-[10px] font-bold uppercase text-slate-500">
                                <p>Fecha de Generación: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Nombre Completo</label>
                                <p className="font-bold text-slate-800 uppercase">
                                    {(previewData.estudiante || previewData.estudiantes)?.nombres} {(previewData.estudiante || previewData.estudiantes)?.apellidos}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    {(previewData.estudiante || previewData.estudiantes)?.tipo_documento}: {(previewData.estudiante || previewData.estudiantes)?.numero_documento}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Curso / Grado</label>
                                <p className="font-bold text-slate-800 uppercase">
                                    {((previewData.estudiante || previewData.estudiantes)?.curso || (previewData.estudiante || previewData.estudiantes)?.cursos)?.nombre || 'N/A'}
                                </p>
                                <p className="text-[10px] text-slate-500">Año Académico: {activeYear?.anio || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="section">
                                <h3 className="text-xs font-black text-blue-600 uppercase border-b pb-1 mb-2">1. Fortalezas</h3>
                                <p className="text-sm leading-relaxed text-justify whitespace-pre-wrap min-h-[100px]">{previewData.fortalezas || 'No se registraron fortalezas para este periodo.'}</p>
                            </div>
                            <div className="section">
                                <h3 className="text-xs font-black text-rose-600 uppercase border-b pb-1 mb-2">2. Debilidades</h3>
                                <p className="text-sm leading-relaxed text-justify whitespace-pre-wrap min-h-[100px]">{previewData.debilidades || 'No se registraron debilidades para este periodo.'}</p>
                            </div>
                            <div className="section">
                                <h3 className="text-xs font-black text-amber-600 uppercase border-b pb-1 mb-2">3. Estrategias Implementadas</h3>
                                <p className="text-sm leading-relaxed text-justify whitespace-pre-wrap min-h-[100px]">{previewData.estrategias || 'No se registraron estrategias para este periodo.'}</p>
                            </div>
                            <div className="section">
                                <h3 className="text-xs font-black text-slate-500 uppercase border-b pb-1 mb-2">4. Observaciones Generales</h3>
                                <p className="text-sm leading-relaxed text-justify whitespace-pre-wrap min-h-[100px]">{previewData.observaciones || 'Sin observaciones adicionales.'}</p>
                            </div>
                        </div>

                        <div className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 gap-10">
                            <div className="text-center">
                                <div className="h-0.5 bg-slate-200 mb-2 mx-10"></div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Firma del Docente / Director</p>
                            </div>
                            <div className="text-center">
                                <div className="h-0.5 bg-slate-200 mb-2 mx-10"></div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Firma Padre de Familia / Tutor</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedCourse && periodo ? (
                <div className="card text-center p-20 border-dashed border-2">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">person_search</span>
                    <p className="text-slate-500 font-medium whitespace-pre-line">
                        {selectedStudent
                            ? "No se encontraron registros del observador para este estudiante en el periodo seleccionado."
                            : `Lista cargada (${observations.length} registros).\nSelecciona un estudiante para previsualizar o descarga el reporte global.`}
                    </p>
                </div>
            ) : (
                <div className="card text-center p-20 border-dashed border-2">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">clinical_notes</span>
                    <p className="text-slate-500 font-medium">Selecciona un curso y periodo para generar los reportes.</p>
                </div>
            )}
        </div>
    );
};
