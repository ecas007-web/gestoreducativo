import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ReportsManager = () => {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
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

    const getQualitative = (nota) => {
        if (nota >= 4.5) return { text: 'Superior', className: 'text-emerald-600' };
        if (nota >= 4.0) return { text: 'Alto', className: 'text-blue-600' };
        if (nota >= 3.0) return { text: 'Básico', className: 'text-amber-600' };
        return { text: 'Bajo', className: 'text-rose-600' };
    };

    return (
        <div className="space-y-8 no-print">
            <div className="card bg-slate-900 border-none text-white">
                <h2 className="text-2xl font-black mb-6">Generador de Boletines</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="form-group">
                        <label className="form-label text-blue-200">Curso</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                            <option value="" className="text-slate-800">Seleccionar...</option>
                            {courses.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200">Estudiante</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedCourse}>
                            <option value="" className="text-slate-800">Seleccionar...</option>
                            {students.map(s => <option key={s.id} value={s.id} className="text-slate-800">{s.apellidos}, {s.nombres}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label text-blue-200">Periodo</label>
                        <select className="form-input bg-white/10 border-white/20 text-white" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                            <option value="P1" className="text-slate-800">Periodo 1</option>
                            <option value="P2" className="text-slate-800">Periodo 2</option>
                            <option value="P3" className="text-slate-800">Periodo 3</option>
                            <option value="P4" className="text-slate-800">Periodo 4</option>
                        </select>
                    </div>
                    <button onClick={generateReport} className="btn btn-primary h-[45px]" disabled={loading || !selectedStudent}>
                        {loading ? 'Generando...' : 'Ver Boletín'}
                    </button>
                </div>
            </div>

            {reportData && (
                <div className="animate-fadeIn">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => window.print()} className="btn btn-secondary">
                            <span className="material-symbols-outlined">print</span> Imprimir / PDF
                        </button>
                    </div>

                    {/* Formato del Boletín */}
                    <div className="card p-12 bg-white text-slate-900 border shadow-2xl max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
                        <div className="flex justify-between items-start border-b-4 border-blue-600 pb-8 mb-8">
                            <div>
                                <h1 className="text-3xl font-black uppercase text-blue-600">Gestor Educativo</h1>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Informe Académico Institucional</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">Fecha: {reportData.fecha}</p>
                                <p className="font-bold">Periodo: {reportData.periodo}</p>
                                <p className="font-bold">Año: {new Date().getFullYear()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estudiante</p>
                                <p className="text-xl font-black text-slate-800 uppercase">{reportData.student.nombres} {reportData.student.apellidos}</p>
                                <p className="text-sm font-medium text-slate-500">Documento: {reportData.student.numero_documento}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Curso</p>
                                <p className="text-xl font-black text-slate-800 uppercase">{reportData.curso.nombre}</p>
                                <p className="text-sm font-medium text-slate-500">{reportData.curso.descripcion || 'Educación Inicial'}</p>
                            </div>
                        </div>

                        <table className="w-full mb-12 border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-3 px-4 text-left font-black uppercase text-xs">Asignatura / Áreas de Desarrollo</th>
                                    <th className="py-3 px-4 text-center font-black uppercase text-xs">Nota</th>
                                    <th className="py-3 px-4 text-center font-black uppercase text-xs">Desempeño</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.notas.map(n => {
                                    const qual = getQualitative(n.nota);
                                    return (
                                        <React.Fragment key={n.id}>
                                            <tr className="border-b-2 border-slate-100">
                                                <td className="py-4 px-4 font-black text-slate-800">{n.materias?.nombre}</td>
                                                <td className="py-4 px-4 text-center font-black text-xl">{n.nota.toFixed(1)}</td>
                                                <td className={`py-4 px-4 text-center font-black uppercase text-sm ${qual.className}`}>{qual.text}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="3" className="py-4 px-8 bg-slate-50/50 text-slate-600 italic text-sm border-b border-slate-100">
                                                    <span className="font-bold text-slate-400 not-italic uppercase text-[10px] block mb-1">Observaciones / Logros:</span>
                                                    {n.descripcion || 'Sin observaciones registradas.'}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div className="grid grid-cols-2 gap-20 pt-20 mt-20">
                            <div className="text-center">
                                <div className="border-t-2 border-slate-300 pt-3">
                                    <p className="font-black text-slate-800 uppercase text-xs">Firma Rectoría</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-t-2 border-slate-300 pt-3">
                                    <p className="font-black text-slate-800 uppercase text-xs">Firma Docente Director de Grupo</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
