import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const TeacherGrades = () => {
    const { cursoId } = useParams();
    const navigate = useNavigate();
    const [curso, setCurso] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedMateria, setSelectedMateria] = useState('');
    const [periodo, setPeriodo] = useState('P1');
    const [query, setQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [notas, setNotas] = useState([]);
    const [activeYear, setActiveYear] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [cursoId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, mRes, sRes, yRes] = await Promise.all([
                supabase.from('cursos').select('*').eq('id', cursoId).single(),
                supabase.from('curso_materias').select('materias(id, nombre)').eq('curso_id', cursoId),
                supabase.from('estudiantes').select('*').eq('curso_id', cursoId).order('apellidos'),
                supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle()
            ]);
            setCurso(cRes.data);
            setSubjects(mRes.data?.map(m => m.materias) || []);
            setStudents(sRes.data || []);
            setActiveYear(yRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedMateria) loadGrades();
    }, [selectedMateria, periodo]);

    const loadGrades = async () => {
        if (!activeYear) return;
        const { data } = await supabase.from('calificaciones')
            .select('*')
            .match({ materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id });
        setNotas(data || []);
    };

    const saveGrade = async (estId, notaValue, obs) => {
        const notaNum = parseFloat(notaValue);
        if (isNaN(notaNum) || notaNum < 0 || notaNum > 5) return mostrarToast('Nota inválida (0-5)', 'warning');
        if (!activeYear) return mostrarToast('No hay año académico activo', 'error');

        try {
            const { data: existe } = await supabase.from('calificaciones').select('id')
                .match({ estudiante_id: estId, materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id })
                .maybeSingle();

            const payload = { estudiante_id: estId, materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id, nota: notaNum, descripcion: obs };

            if (existe) await supabase.from('calificaciones').update(payload).eq('id', existe.id);
            else await supabase.from('calificaciones').insert([payload]);

            mostrarToast('Calificación guardada', 'success');
            loadGrades();
        } catch (err) {
            mostrarToast(err.message, 'error');
        }
    };

    const filteredStudents = students.filter(s => {
        const queryLower = query.toLowerCase();
        const name1 = `${s.apellidos} ${s.nombres}`.toLowerCase();
        const name2 = `${s.nombres} ${s.apellidos}`.toLowerCase();
        return name1.includes(queryLower) || name2.includes(queryLower);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm px-1">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Cargar Notas: {curso?.nombre} {activeYear && <span className="text-blue-600">({activeYear.anio})</span>}</h2>
                    <p className="text-slate-500 font-medium text-sm">Ingresa las calificaciones y logros institucionales.</p>
                </div>
            </div>

            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="form-group">
                    <label className="form-label">Asignatura</label>
                    <select className="form-input" value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)}>
                        <option value="">Seleccionar Materia...</option>
                        {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Periodo Académico</label>
                    <select className="form-input" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                        <option value="P1">Primer Periodo</option>
                        <option value="P2">Segundo Periodo</option>
                        <option value="P3">Tercer Periodo</option>
                        <option value="P4">Cuarto Periodo</option>
                    </select>
                </div>
                <div className="form-group relative">
                    <label className="form-label">Filtrar Estudiante</label>
                    <input
                        type="text"
                        className="form-input w-full"
                        placeholder="Buscar o seleccionar..."
                        value={query}
                        onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {showDropdown && filteredStudents.length > 0 && (
                        <ul className="absolute z-50 w-full left-0 top-[100%] bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-left">
                            {filteredStudents.map(s => (
                                <li
                                    key={s.id}
                                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-slate-900 text-2xl transition-colors border-b border-slate-100 last:border-0"
                                    onMouseDown={(e) => {
                                        // Use onMouseDown instead of onClick to prevent blur from firing before selection
                                        e.preventDefault();
                                        setQuery(`${s.apellidos} ${s.nombres}`);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <span className="font-bold text-slate-800">{s.apellidos}</span> {s.nombres}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-1/3">Estudiante</th>
                                <th className="w-24">Nota (0-5)</th>
                                <th>Observaciones / Logros</th>
                                <th className="text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedMateria ? filteredStudents.map(s => {
                                const notaObj = notas.find(n => n.estudiante_id === s.id);
                                return <GradeRow key={s.id} student={s} initialNota={notaObj?.nota} initialObs={notaObj?.descripcion} onSave={saveGrade} />;
                            }) : (
                                <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-medium">Selecciona una materia para cargar el listado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const GradeRow = ({ student, initialNota, initialObs, onSave }) => {
    const [nota, setNota] = useState(initialNota || '');
    const [obs, setObs] = useState(initialObs || '');

    useEffect(() => { setNota(initialNota || ''); setObs(initialObs || ''); }, [initialNota, initialObs]);

    return (
        <tr>
            <td className="font-bold text-slate-800">{student.apellidos}, {student.nombres}</td>
            <td>
                <input
                    type="number" step="0.1" className="form-input text-center font-black"
                    value={nota} onChange={e => setNota(e.target.value)} placeholder="0.0"
                />
            </td>
            <td>
                <textarea
                    className="form-input h-10 py-2 resize-none text-sm"
                    value={obs} onChange={e => setObs(e.target.value)} placeholder="Logros..."
                ></textarea>
            </td>
            <td className="text-right">
                <button onClick={() => onSave(student.id, nota, obs)} className="btn btn-primary btn-sm flex items-center justify-center w-10 h-10 p-0 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-lg">save</span>
                </button>
            </td>
        </tr>
    );
};
