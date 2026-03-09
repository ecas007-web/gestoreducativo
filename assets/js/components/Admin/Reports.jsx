import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export const ReportsManager = () => {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generatingDocx, setGeneratingDocx] = useState(false);
    const [periodo, setPeriodo] = useState('P1');

    useEffect(() => {
        supabase.from('cursos').select('*').order('nombre').then(({ data }) => setCourses(data || []));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            supabase.from('estudiantes').select('*').eq('curso_id', selectedCourse).order('apellidos')
                .then(({ data }) => setStudents(data || []));
        } else {
            setStudents([]);
        }
    }, [selectedCourse]);

    const getQualitative = (nota) => {
        if (nota >= 4.5) return { text: 'Superior', className: 'text-emerald-600' };
        if (nota >= 4.0) return { text: 'Alto', className: 'text-blue-600' };
        if (nota >= 3.0) return { text: 'Básico', className: 'text-amber-600' };
        return { text: 'Bajo', className: 'text-rose-600' };
    };

    const periodLabels = {
        'P1': 'PRIMER PERIODO',
        'P2': 'SEGUNDO PERIODO',
        'P3': 'TERCER PERIODO',
        'P4': 'CUARTO PERIODO'
    };

    const generateReport = async () => {
        if (!selectedStudent) return;
        setLoading(true);
        try {
            const { data: notas } = await supabase.from('calificaciones')
                .select('*, materias(nombre)')
                .eq('estudiante_id', selectedStudent)
                .eq('periodo', periodo)
                .eq('anio', new Date().getFullYear());

            const student = students.find(s => s.id === selectedStudent);
            const curso = courses.find(c => c.id === selectedCourse);

            setReportData({
                student,
                curso,
                notas: notas || [],
                periodo,
                fecha: new Date().toLocaleDateString()
            });
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const generateAllBulletins = async (mode = 'zip') => {
        if (!selectedCourse) return mostrarToast('Selecciona un curso primero', 'warning');
        setGeneratingDocx(true);
        try {
            const response = await fetch('/plantillas/plantilla_boletin.docx');
            if (!response.ok) throw new Error('No se pudo cargar la plantilla del boletín');
            const templateBuffer = await response.arrayBuffer();

            const { data: activeYear } = await supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle();
            if (!activeYear) throw new Error('No hay un año académico activo configurado.');

            const { data: docenteRel } = await supabase
                .from('docente_cursos')
                .select('docentes(nombres, apellidos)')
                .eq('curso_id', selectedCourse)
                .limit(1)
                .maybeSingle();

            const teacherName = docenteRel?.docentes
                ? `${docenteRel.docentes.nombres} ${docenteRel.docentes.apellidos}`.toUpperCase()
                : 'POR ASIGNAR';

            const { data: allStudents } = await supabase
                .from('estudiantes')
                .select('*')
                .eq('curso_id', selectedCourse)
                .order('apellidos');

            if (!allStudents?.length) throw new Error('No hay estudiantes en este curso.');

            const [notasRes, compRes] = await Promise.all([
                supabase.from('calificaciones')
                    .select('*, materias(nombre)')
                    .eq('curso_id', selectedCourse)
                    .eq('periodo', periodo)
                    .eq('anio_academico_id', activeYear.id),
                supabase.from('comportamientos')
                    .select('*')
                    .eq('periodo', periodo)
                    .eq('anio_academico_id', activeYear.id)
            ]);

            const mapStudentData = (student) => {
                const studentGrades = (notasRes.data?.filter(n => n.estudiante_id === student.id) || [])
                    .sort((a, b) => (a.materias?.nombre || '').localeCompare(b.materias?.nombre || ''));

                const studentBehavior = compRes.data?.find(b => b.estudiante_id === student.id);
                const fullName = `${student.apellidos} ${student.nombres}`.toUpperCase();
                const gradesMapped = studentGrades.map(n => ({
                    'asignatura': (n.materias?.nombre || '').toUpperCase(),
                    'escala': n.escala_valorativa || 'N/A',
                    'logro_concatenado': n.logro_calculado || 'N/A',
                    'logro': n.logro_calculado || 'N/A'
                }));

                return {
                    'apellidos_y_nombres': fullName,
                    'apellidos y nombres': fullName,
                    'grado': courses.find(c => c.id === selectedCourse)?.nombre.toUpperCase() || 'N/A',
                    'ano': activeYear?.anio || '',
                    'año': activeYear?.anio || '',
                    'periodo': periodLabels[periodo] || periodo,
                    'docente': teacherName,
                    'asignaturas': gradesMapped,
                    'calificaciones': gradesMapped,
                    'escala_comportamiento': studentBehavior?.escala || 'N/A',
                    'descripcion_comportamiento': studentBehavior?.descripcion || 'Sin observaciones registradas.'
                };
            };

            if (mode === 'zip') {
                const zip = new JSZip();
                for (const student of allStudents) {
                    try {
                        const docZip = new PizZip(templateBuffer);
                        const doc = new Docxtemplater(docZip, {
                            paragraphLoop: true,
                            linebreaks: true,
                            delimiters: { start: '%', end: '%' }
                        });
                        doc.render(mapStudentData(student));
                        zip.file(`Boletin_${student.apellidos}_${student.nombres}.docx`, doc.getZip().generate({ type: 'uint8array' }));
                    } catch (e) {
                        console.error(`Error rendering student ${student.id}:`, e);
                    }
                }
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `Boletines_${courses.find(c => c.id === selectedCourse)?.nombre}_${periodo}.zip`);
            } else {
                mostrarToast('Generando documento consolidado...', 'info');
                try {
                    const docZip = new PizZip(templateBuffer);
                    const doc = new Docxtemplater(docZip, {
                        paragraphLoop: true,
                        linebreaks: true,
                        delimiters: { start: '%', end: '%' }
                    });

                    const data = {
                        estudiantes_lista: allStudents.map(student => mapStudentData(student))
                    };

                    doc.render(data);
                    const out = doc.getZip().generate({ type: 'blob' });
                    saveAs(out, `Boletines_Consolidado_${courses.find(c => c.id === selectedCourse)?.nombre}_${periodo}.docx`);
                } catch (error) {
                    console.error('Error rendering consolidated DOCX:', error);
                    if (error.properties && error.properties.errors instanceof Array) {
                        const errorMessages = error.properties.errors.map(err => err.message).join('\n');
                        console.error('Template errors:', errorMessages);
                        throw new Error(`Error en plantilla: ${errorMessages}`);
                    }
                    throw error;
                }
            }
            mostrarToast('Proceso completado', 'success');
        } catch (err) {
            console.error(err);
            mostrarToast(err.message || 'Error en generación', 'error');
        } finally {
            setGeneratingDocx(false);
        }
    };

    return (
        <div className="space-y-8 no-print animate-fadeIn">
            <div className="card bg-slate-900 border-none text-white p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-black">Generador de Boletines</h2>
                        <p className="text-blue-300 text-sm italic font-medium">Administra y descarga los informes académicos por curso.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="form-group">
                        <label className="form-label text-blue-200 text-xs uppercase font-bold tracking-wider mb-2 block">Curso</label>
                        <select className="form-input bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-blue-500 transition-all" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                            <option value="" className="text-slate-800">Seleccionar Curso...</option>
                            {courses.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200 text-xs uppercase font-bold tracking-wider mb-2 block">Estudiante (Opcional)</label>
                        <select className="form-input bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-blue-500 transition-all" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedCourse}>
                            <option value="" className="text-slate-800">Ver todos o seleccionar uno...</option>
                            {students.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.apellidos}, {s.nombres}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200 text-xs uppercase font-bold tracking-wider mb-2 block">Periodo</label>
                        <select className="form-input bg-white/10 border-white/20 text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                            {Object.entries(periodLabels).map(([val, label]) => (
                                <option key={val} value={val} className="text-slate-800">{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <button onClick={generateReport} className="btn bg-blue-600 hover:bg-blue-700 text-white h-[55px] font-black shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest" disabled={loading || !selectedStudent}>
                        <span className="material-symbols-outlined text-xl">visibility</span>
                        {loading ? 'Cargando...' : 'Ver Previa'}
                    </button>
                    <button onClick={() => generateAllBulletins('consolidated')} className="btn btn-primary h-[55px] font-black shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest" disabled={generatingDocx || !selectedCourse}>
                        <span className="material-symbols-outlined text-xl">description</span>
                        {generatingDocx ? 'Generando...' : 'DOCX Único'}
                    </button>
                    <button onClick={() => generateAllBulletins('zip')} className="btn btn-secondary h-[55px] font-black shadow-xl hover:shadow-slate-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest" disabled={generatingDocx || !selectedCourse}>
                        <span className="material-symbols-outlined text-xl">folder_zip</span>
                        {generatingDocx ? 'Empacando...' : 'ZIP (Individuales)'}
                    </button>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-[10px] text-blue-200 font-medium leading-tight">
                        <span className="font-black text-blue-400">INFO:</span> La opción "DOCX Único" requiere que la plantilla tenga el bucle
                        <code className="mx-1 px-1 bg-black/30 rounded text-amber-300 font-black tracking-widest">%#estudiantes_lista% ... %/estudiantes_lista%</code>
                    </p>
                </div>
            </div>

            {reportData && (
                <div className="animate-fadeIn">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => window.print()} className="btn btn-ghost border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm font-bold">
                            <span className="material-symbols-outlined mr-2">print</span> Imprimir / PDF
                        </button>
                    </div>

                    <div className="preview-paper card p-12 bg-white text-slate-900 border shadow-2xl max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
                        <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl">G</div>
                                <div>
                                    <h1 className="text-3xl font-black uppercase text-blue-600 leading-tight">Mis Pequeños Genios</h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Acuerdo N° 002 del 24 de Julio de 2024</p>
                                </div>
                            </div>
                            <div className="text-right text-xs font-bold uppercase text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                                <p>Fecha: {reportData.fecha}</p>
                                <p className="text-blue-600 underline">Periodo: {periodLabels[reportData.periodo]}</p>
                                <p>Año: {new Date().getFullYear()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
                            <div className="relative">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estudiante</p>
                                <p className="text-xl font-black text-slate-800 uppercase leading-none">{reportData.student.nombres} {reportData.student.apellidos}</p>
                                <p className="text-sm font-medium text-slate-500 mt-1">N° Documento: {reportData.student.numero_documento}</p>
                            </div>
                            <div className="text-right relative">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Curso / Grado</p>
                                <p className="text-xl font-black text-slate-800 uppercase leading-none">{reportData.curso.nombre}</p>
                                <p className="text-sm font-medium text-slate-500 mt-1">{reportData.curso.descripcion || 'Educación Básica e Inicial'}</p>
                            </div>
                        </div>

                        <table className="w-full mb-12 border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-4 px-6 text-left font-black uppercase text-[11px] tracking-widest rounded-tl-xl">Asignatura / Áreas de Desarrollo</th>
                                    <th className="py-4 px-4 text-center font-black uppercase text-[11px] tracking-widest">Nota</th>
                                    <th className="py-4 px-6 text-center font-black uppercase text-[11px] tracking-widest rounded-tr-xl">Desempeño</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.notas.map((n, idx) => {
                                    const qual = getQualitative(n.nota);
                                    return (
                                        <React.Fragment key={n.id}>
                                            <tr className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                <td className="py-5 px-6 font-black text-slate-800 text-sm uppercase tracking-tighter">{n.materias?.nombre}</td>
                                                <td className="py-5 px-4 text-center">
                                                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-black text-xl text-slate-800 border border-slate-200">
                                                        {n.nota.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className={`py-5 px-6 text-center`}>
                                                    <span className={`px-4 py-1.5 rounded-full font-black uppercase text-[9px] border-2 ${qual.className} border-current shadow-sm`}>
                                                        {qual.text}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                <td colSpan="3" className="py-4 px-10 text-slate-600 text-[11px] border-b border-slate-100 leading-relaxed text-justify relative">
                                                    <div className="absolute left-6 top-4 bottom-4 w-1 bg-blue-100 rounded-full"></div>
                                                    <span className="font-bold text-slate-400 uppercase text-[8px] block mb-1 tracking-widest">Evaluación de Desempeño:</span>
                                                    <span className="italic">{n.logro_calculado || 'Sin observaciones registradas para este periodo.'}</span>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="grid grid-cols-2 gap-20 pt-20 mt-20">
                            <div className="text-center">
                                <div className="border-t-2 border-slate-300 pt-4 px-10">
                                    <p className="font-black text-slate-800 uppercase text-[9px] tracking-widest">Firma Rectoría / Secretaría</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-t-2 border-slate-300 pt-4 px-10">
                                    <p className="font-black text-slate-800 uppercase text-[9px] tracking-widest">Firma Docente Director de Grupo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
