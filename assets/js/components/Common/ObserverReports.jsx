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
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [observations, setObservations] = useState([]); // Students with their history
    const [previewData, setPreviewData] = useState(null); // Selected student data for preview

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
        if (selectedCourse) {
            loadObservations();
        } else {
            setObservations([]);
            setPreviewData(null);
        }
    }, [selectedCourse, selectedStudent, activeYear]);

    const loadInitialData = async () => {
        if (!profile) return;
        try {
            const { data: year } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            setActiveYear(year);

            if (profile.rol === 'admin') {
                const { data } = await supabase.from('cursos').select('*').order('nombre');
                setCourses(data || []);
            } else {
                if (profile.assignedCourses) {
                    setCourses(profile.assignedCourses);
                } else {
                    const { data: teacherData } = await supabase
                        .from('docentes')
                        .select('docente_cursos(cursos(*))')
                        .eq('user_id', profile.id)
                        .maybeSingle();

                    if (teacherData) {
                        const teacherCourses = teacherData.docente_cursos?.map(dc => dc.cursos).filter(Boolean) || [];
                        setCourses(teacherCourses);
                    }
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
        if (!activeYear || !selectedCourse) {
            setObservations([]);
            setPreviewData(null);
            return;
        }
        setLoading(true);
        try {
            let query = supabase.from('estudiantes')
                .select('*, curso:cursos(*), historial:estudiante_observador(*)')
                .order('apellidos');

            if (selectedCourse) query = query.eq('curso_id', selectedCourse);
            if (selectedStudent) query = query.eq('id', selectedStudent);

            const { data, error } = await query;
            if (error) throw error;

            const formattedData = (data || []).map(student => ({
                id: student.id,
                estudiante: student,
                historial: (student.historial || [])
                    .filter(h => h.anio_academico_id === activeYear?.id)
                    .sort((a, b) => a.periodo.localeCompare(b.periodo))
            }));

            setObservations(formattedData);
            if (selectedStudent && formattedData.length > 0) {
                setPreviewData(formattedData[0]);
            } else {
                setPreviewData(null);
            }
        } catch (err) {
            console.error(err);
            mostrarToast('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const periodNames = {
        'P1': 'Primer Periodo',
        'P2': 'Segundo Periodo',
        'P3': 'Tercer Periodo',
        'P4': 'Cuarto Periodo'
    };

    const getFullMappedData = (studentData) => {
        const student = studentData.estudiante;
        const curso = student.curso;
        const fechaActualLong = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        return {
            'nombres': (student.nombres || '').toUpperCase(),
            'apellidos': (student.apellidos || '').toUpperCase(),
            'apellidos y nombres': `${student.apellidos || ''} ${student.nombres || ''}`.toUpperCase(),
            'numero_documento': student.numero_documento || '',
            'tipo_documento': student.tipo_documento || '',
            'curso': (curso?.nombre || '').toUpperCase(),
            'grado': (curso?.nombre || '').toUpperCase(),
            'anio': activeYear?.anio || '',
            'año': activeYear?.anio || '',
            'fecha actual': fechaActualLong,
            'fecha': new Date().toLocaleDateString(),
            // Otros datos
            'fecha_nac': student.fecha_nac || '',
            'lugar_nacimiento': student.lugar_nacimiento || '',
            'direccion': student.direccion || '',
            'correo': student.correo || '',
            'telefono': student.telefono || '',
            'celular': student.celular || '',
            'eps': student.eps || '',
            'tipo_sangre': student.tipo_sangre || '',
            // Familiares
            'nombre_padre': (student.nombre_padre || '').toUpperCase(),
            'documento_padre': student.documento_padre || '',
            'ocupacion_padre': student.ocupacion_padre || '',
            'telefono_padre': student.telefono_padre || '',
            'nombre_madre': (student.nombre_madre || '').toUpperCase(),
            'documento_madre': student.documento_madre || '',
            'ocupacion_madre': student.ocupacion_madre || '',
            'telefono_madre': student.telefono_madre || '',
            // Bucle de periodos
            'observadores': studentData.historial.map(h => ({
                periodo: periodNames[h.periodo] || h.periodo,
                fortalezas: h.fortalezas || '',
                debilidades: h.debilidades || '',
                estrategias: h.estrategias || '',
                observaciones: h.observaciones || ''
            }))
        };
    };

    const handleGenerateSingle = async (studentData) => {
        if (!studentData?.historial?.length) {
            mostrarToast('No hay historial para este estudiante.', 'warning');
            return;
        }
        setGenerating(true);
        try {
            const resp = await fetch('/plantillas/plantilla_observador.docx');
            const content = await resp.arrayBuffer();
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '%', end: '%' } });

            const data = getFullMappedData(studentData);
            doc.render(data);

            const out = doc.getZip().generate({ type: 'blob' });
            saveAs(out, `Observador_${data.apellidos}_${data.nombres}.docx`);
        } catch (err) {
            console.error(err);
            mostrarToast('Error al generar DOCX', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateBulk = async (mode = 'single_doc') => {
        if (!observations.length) return mostrarToast('No hay datos', 'warning');
        setGenerating(true);
        try {
            const resp = await fetch('/plantillas/plantilla_observador.docx');
            const templateBuffer = await resp.arrayBuffer();

            if (mode === 'zip') {
                const zip = new JSZip();
                for (const studentData of observations) {
                    if (!studentData.historial.length) continue;
                    const docZip = new PizZip(templateBuffer);
                    const doc = new Docxtemplater(docZip, { delimiters: { start: '%', end: '%' } });
                    const data = getFullMappedData(studentData);
                    doc.render(data);
                    zip.file(`Observador_${data.apellidos}_${data.nombres}.docx`, doc.getZip().generate({ type: 'uint8array' }));
                }
                saveAs(await zip.generateAsync({ type: 'blob' }), `Observadores_${activeYear?.anio}.zip`);
            } else {
                const docZip = new PizZip(templateBuffer);
                const doc = new Docxtemplater(docZip, { delimiters: { start: '%', end: '%' } });
                doc.render({
                    estudiantes_lista: observations
                        .filter(s => s.historial.length > 0)
                        .map(s => getFullMappedData(s))
                });
                saveAs(doc.getZip().generate({ type: 'blob' }), `Observadores_Consolidado_${activeYear?.anio}.docx`);
            }
        } catch (err) {
            console.error(err);
            mostrarToast('Error en generación masiva', 'error');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Reporte de Observador</h2>
                    <p className="text-slate-500 font-medium">Informes detallados por estudiante (Historial Completo).</p>
                </div>
            </div>

            <div className="card p-0 overflow-hidden mb-6">
                <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border-b items-end">
                    <div className="form-group mb-0 min-w-[250px] flex-1">
                        <label className="text-[10px] md:text-xs uppercase font-bold text-blue-600 mb-1 block">Curso</label>
                        <select className="form-input !py-2 text-sm md:text-base" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                            <option value="">Seleccionar Curso...</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0 min-w-[250px] flex-1">
                        <label className="text-[10px] md:text-xs uppercase font-bold text-blue-600 mb-1 block">Estudiante (Opcional)</label>
                        <select className="form-input !py-2 text-sm md:text-base" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedCourse}>
                            <option value="">Todos los estudiantes</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.apellidos}, {s.nombres}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 p-4 bg-white">
                    <button onClick={() => handleGenerateBulk('single_doc')} className="btn btn-primary flex-1 py-3" disabled={generating || !selectedCourse}>
                        <span className="material-symbols-outlined">description</span> DOCX Consolidado
                    </button>
                    <button onClick={() => handleGenerateBulk('zip')} className="btn btn-secondary flex-1 py-3" disabled={generating || !selectedCourse}>
                        <span className="material-symbols-outlined">folder_zip</span> Descargar ZIP
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : previewData ? (
                <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => window.print()} className="btn btn-ghost border-slate-200">
                            <span className="material-symbols-outlined text-[20px]">print</span> Imprimir
                        </button>
                        <button onClick={() => handleGenerateSingle(previewData)} className="btn btn-primary" disabled={generating}>
                            <span className="material-symbols-outlined text-[20px]">download</span> Descargar DOCX
                        </button>
                    </div>

                    <div className="preview-paper bg-white shadow-2xl mx-auto p-[1.5cm] md:p-[2cm] min-h-[27.9cm] w-full max-w-[21.6cm] text-slate-900 border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0">
                        <div className="border-b-4 border-blue-600 pb-4 mb-6 flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black text-blue-600 uppercase">Observador del Alumno</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeYear?.anio} - HISTORIAL COMPLETO</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Estudiante</label>
                                <p className="font-bold text-slate-800 uppercase text-sm">{previewData.estudiante.apellidos} {previewData.estudiante.nombres}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{previewData.estudiante.tipo_documento}: {previewData.estudiante.numero_documento}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Curso</label>
                                <p className="font-bold text-slate-800 uppercase text-sm">{previewData.estudiante.curso?.nombre || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 font-medium">Año: {activeYear?.anio}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {previewData.historial.length > 0 ? previewData.historial.map((h, idx) => (
                                <div key={h.id} className="border-2 border-slate-100 rounded-xl p-5 bg-slate-50/50 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                    <h3 className="text-sm font-black text-blue-700 uppercase mb-4 flex items-center gap-2">
                                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{idx + 1}</span>
                                        {periodNames[h.periodo] || h.periodo}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-200">Fortalezas</h4>
                                            <p className="text-[11px] text-slate-700 text-justify leading-relaxed whitespace-pre-wrap">{h.fortalezas || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-200">Debilidades</h4>
                                            <p className="text-[11px] text-slate-700 text-justify leading-relaxed whitespace-pre-wrap">{h.debilidades || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-200">Estrategias</h4>
                                            <p className="text-[11px] text-slate-700 text-justify leading-relaxed whitespace-pre-wrap">{h.estrategias || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-200">Observaciones</h4>
                                            <p className="text-[11px] text-slate-700 text-justify leading-relaxed whitespace-pre-wrap">{h.observaciones || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-300 italic font-medium">No se registran seguimientos para este año.</div>
                            )}
                        </div>

                        <div className="mt-20 pt-10 border-t-2 border-slate-100 grid grid-cols-2 gap-10">
                            <div className="text-center">
                                <div className="h-0.5 bg-slate-200 mb-2 mx-10"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Firma del Docente / Director</p>
                            </div>
                            <div className="text-center">
                                <div className="h-0.5 bg-slate-200 mb-2 mx-10"></div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Firma Acudiente / Tutor</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedCourse ? (
                <div className="card text-center p-20 border-dashed border-2 bg-slate-50">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">group</span>
                    <p className="text-slate-500 font-medium">Selecciona un alumno para previsualizar su historial completo.</p>
                </div>
            ) : (
                <div className="card text-center p-20 border-dashed border-2 bg-slate-50">
                    <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">clinical_notes</span>
                    <p className="text-slate-500 font-medium">Selecciona un curso para comenzar a generar los reportes.</p>
                </div>
            )}
        </div>
    );
};
