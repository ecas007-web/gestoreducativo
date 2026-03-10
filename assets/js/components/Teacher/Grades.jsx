import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useNavigationGuard } from '../../context/NavigationContext.jsx';

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
    const [notas, setNotas] = useState([]); // Mantener para compatibilidad si se usa
    const [activeYear, setActiveYear] = useState(null);
    const [scales, setScales] = useState([]);
    const [achievement, setAchievement] = useState(null);
    const [activities, setActivities] = useState([]);
    const [periodosEstado, setPeriodosEstado] = useState([]);
    const [loading, setLoading] = useState(true);

    const [localNotas, setLocalNotas] = useState({});
    const [originalNotas, setOriginalNotas] = useState({});
    const [savingBulk, setSavingBulk] = useState(false);
    const { setIsDirty, setSaveHandler, attemptNavigation } = useNavigationGuard();

    const hasChanges = JSON.stringify(localNotas) !== JSON.stringify(originalNotas);

    const filteredStudents = useMemo(() => {
        const queryLower = query.toLowerCase();
        return students.filter(s => {
            const name1 = `${s.apellidos} ${s.nombres}`.toLowerCase();
            const name2 = `${s.nombres} ${s.apellidos}`.toLowerCase();
            return name1.includes(queryLower) || name2.includes(queryLower);
        });
    }, [students, query]);

    const calculateValues = (row) => {
        const tcKeys = ['tc1', 'tc2', 'tc3', 'tc4'];
        const thKeys = ['th1', 'th2', 'th3', 'th4'];
        const tcVals = tcKeys.map(k => row[k]).filter(v => v !== '' && v !== null && v !== undefined);
        const thVals = thKeys.map(k => row[k]).filter(v => v !== '' && v !== null && v !== undefined);
        const tcAvgVal = tcVals.length > 0 ? tcVals.reduce((acc, v) => acc + parseFloat(v), 0) / tcVals.length : 0;
        const thAvgVal = thVals.length > 0 ? thVals.reduce((acc, v) => acc + parseFloat(v), 0) / thVals.length : 0;
        const allKeys = [...tcKeys, ...thKeys, 'cuaderno', 'examen'];
        const allSet = allKeys.every(k => row[k] !== '' && row[k] !== null && row[k] !== undefined);
        if (!allSet) return { final: null, escala: '', logro: '' };
        const cuad = parseFloat(row.cuaderno);
        const exam = parseFloat(row.examen);
        const final = (tcAvgVal * 0.3) + (thAvgVal * 0.3) + (cuad * 0.1) + (exam * 0.3);
        const finalFixed = parseFloat(final.toFixed(1));
        const scaleMatch = scales.find(s => finalFixed >= s.rango_minimo && finalFixed <= s.rango_maximo);
        const escalaTexto = scaleMatch ? scaleMatch.escala : '';
        const achievementText = scaleMatch && achievement ? `${scaleMatch.verbo} ${achievement}` : '';
        return { final: finalFixed, escala: escalaTexto, logro: achievementText };
    };

    const loadGrades = async () => {
        if (!activeYear) return;
        const [gRes, aRes, actRes] = await Promise.all([
            supabase.from('calificaciones')
                .select('*')
                .match({ materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id }),
            supabase.from('logros_generales')
                .select('logro')
                .match({ curso_id: cursoId, materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id })
                .maybeSingle(),
            supabase.from('actividades')
                .select('actividad, descripcion')
                .match({ curso_id: cursoId, materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id })
        ]);

        const gradesMap = {};
        (gRes.data || []).forEach(n => {
            gradesMap[n.estudiante_id] = n;
        });
        setLocalNotas(gradesMap);
        setOriginalNotas(JSON.parse(JSON.stringify(gradesMap)));
        setAchievement(aRes.data?.logro || null);
        setActivities(actRes.data || []);
    };

    const saveGrade = async (estId, data, silent = false) => {
        if (!activeYear) return mostrarToast('No hay año académico activo', 'error');

        const isPeriodoAbierto = periodosEstado.find(p => p.periodo === periodo)?.estado !== false;
        if (!isPeriodoAbierto) {
            if (!silent) mostrarToast(`El periodo ${periodo} se encuentra CERRADO. No se pueden realizar cambios.`, 'error');
            return false;
        }

        try {
            const { data: existe } = await supabase.from('calificaciones').select('id')
                .match({ estudiante_id: estId, materia_id: selectedMateria, periodo, anio_academico_id: activeYear.id })
                .maybeSingle();
            const calc = calculateValues(data);
            const payload = {
                estudiante_id: estId, materia_id: selectedMateria, curso_id: cursoId, periodo, anio_academico_id: activeYear.id,
                tc1: data.tc1 || 0, tc2: data.tc2 || 0, tc3: data.tc3 || 0, tc4: data.tc4 || 0,
                th1: data.th1 || 0, th2: data.th2 || 0, th3: data.th3 || 0, th4: data.th4 || 0,
                cuaderno: data.cuaderno || 0, examen: data.examen || 0,
                nota: calc.final || 0, nota_final: calc.final,
                escala_valorativa: calc.escala, logro_calculado: calc.logro,
                updated_at: new Date()
            };
            if (existe) await supabase.from('calificaciones').update(payload).eq('id', existe.id);
            else await supabase.from('calificaciones').insert([payload]);
            if (!silent) mostrarToast('Registro actualizado', 'success');
        } catch (err) {
            if (!silent) mostrarToast(err.message, 'error');
            throw err;
        }
    };

    const handleSaveAll = useCallback(async () => {
        setSavingBulk(true);
        let successCount = 0;
        let errorCount = 0;
        try {
            for (const student of filteredStudents) {
                const data = localNotas[student.id];
                if (data) {
                    try {
                        await saveGrade(student.id, data, true);
                        successCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }
            }
            mostrarToast(`Proceso completado: ${successCount} guardados, ${errorCount} errores`, successCount > 0 ? 'success' : 'error');
            await loadGrades();
        } catch (err) {
            mostrarToast('Error en el proceso masivo', 'error');
        } finally {
            setSavingBulk(false);
        }
    }, [filteredStudents, localNotas, selectedMateria, periodo, activeYear, cursoId]);

    // Sync dirty state with global guard
    useEffect(() => {
        setIsDirty(hasChanges);
        return () => setIsDirty(false);
    }, [hasChanges, setIsDirty]);

    // Register save handler for navigation guard
    useEffect(() => {
        setSaveHandler(() => handleSaveAll);
        return () => setSaveHandler(null);
    }, [handleSaveAll, setSaveHandler]);

    // Prevent tab close/reload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges]);

    useEffect(() => {
        loadData();
    }, [cursoId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, mRes, sRes, yRes, scalesRes] = await Promise.all([
                supabase.from('cursos').select('*').eq('id', cursoId).single(),
                supabase.from('curso_materias').select('materias(id, nombre)').eq('curso_id', cursoId),
                supabase.from('estudiantes').select('*').eq('curso_id', cursoId).order('apellidos'),
                supabase.from('anios_academicos').select('*').eq('estado', true).maybeSingle(),
                supabase.from('escalas_valorativas').select('*').order('rango_minimo', { ascending: true }),
                supabase.from('periodos_estado').select('*').order('periodo', { ascending: true })
            ]);
            setCurso(cRes.data);
            setSubjects(mRes.data?.map(m => m.materias) || []);
            setStudents(sRes.data || []);
            setActiveYear(yRes.data);
            setScales(scalesRes.data || []);

            // Filtrar estados de periodos para el año activo si existe
            if (yRes.data) {
                const { data: pData } = await supabase.from('periodos_estado').select('*').eq('anio_academico_id', yRes.data.id);
                setPeriodosEstado(pData || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedMateria) loadGrades();
    }, [selectedMateria, periodo]);

    const handleFilterChange = (type, value) => {
        if (hasChanges) {
            attemptNavigation(() => {
                if (type === 'materia') setSelectedMateria(value);
                if (type === 'periodo') setPeriodo(value);
            });
        } else {
            if (type === 'materia') setSelectedMateria(value);
            if (type === 'periodo') setPeriodo(value);
        }
    };




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

            <div className="card grid grid-cols-1 md:grid-cols-4 gap-6 w-full">
                <div className="form-group">
                    <label className="form-label">Asignatura</label>
                    <select className="form-input" value={selectedMateria} onChange={e => handleFilterChange('materia', e.target.value)}>
                        <option value="">Seleccionar Materia...</option>
                        {subjects.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Periodo Académico</label>
                    <select className="form-input" value={periodo} onChange={e => handleFilterChange('periodo', e.target.value)}>
                        <option value="P1">Primer Periodo</option>
                        <option value="P2">Segundo Periodo</option>
                        <option value="P3">Tercer Periodo</option>
                        <option value="P4">Cuarto Periodo</option>
                    </select>
                </div>
                <div className="md:col-span-1 form-group relative">
                    <label className="form-label">Filtrar Estudiante</label>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            className="form-input flex-1"
                            placeholder="Buscar o seleccionar..."
                            value={query}
                            onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        />
                        {selectedMateria && filteredStudents.length > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={savingBulk || !hasChanges || periodosEstado.find(p => p.periodo === periodo)?.estado === false}
                                className={`btn h-12 px-6 flex items-center gap-2 shadow-lg transition-all ${!hasChanges || periodosEstado.find(p => p.periodo === periodo)?.estado === false ? 'bg-slate-100 text-slate-400 border-slate-200' : 'btn-primary shadow-blue-200 animate-fadeIn'}`}
                            >
                                <span className={`material-symbols-outlined ${savingBulk ? 'animate-spin' : ''}`}>
                                    {savingBulk ? 'sync' : 'done_all'}
                                </span>
                                <span className="font-bold">
                                    {savingBulk ? 'guardando...' : (periodosEstado.find(p => p.periodo === periodo)?.estado === false ? 'periodo cerrado' : 'guardar todo')}
                                </span>
                            </button>
                        )}
                    </div>
                    {showDropdown && filteredStudents.length > 0 && (
                        <ul className="absolute z-50 w-full left-0 top-[100%] bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-left">
                            {filteredStudents.map(s => (
                                <li
                                    key={s.id}
                                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-slate-900 text-2xl transition-colors border-b border-slate-100 last:border-0"
                                    onMouseDown={(e) => {
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
                <div className="overflow-x-auto">
                    <table className="data-table border-collapse min-w-[1600px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="sticky left-0 bg-slate-50 z-10 w-64 border-r">Estudiante</th>
                                <th colSpan="5" className="text-center bg-blue-50/30 border-r">Tareas Clase (30%)</th>
                                <th colSpan="5" className="text-center bg-emerald-50/30 border-r">Tareas Casa (30%)</th>
                                <th className="text-center bg-amber-50/30 border-r">Cuaderno (10%)</th>
                                <th className="text-center bg-violet-50/30 border-r">Examen (30%)</th>
                                <th className="text-center bg-slate-100 border-r">Final</th>
                                <th className="text-center bg-slate-50 border-r">Escala</th>
                                <th className="text-center bg-slate-50 border-r w-96">Logro Concatenado</th>
                                <th className="text-center">Acción</th>
                            </tr>
                            <tr className="text-[10px] uppercase tracking-tighter text-slate-400">
                                <th className="sticky left-0 bg-slate-50 z-10 border-r"></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TC_1 <span className="text-[8px] text-blue-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TC_2 <span className="text-[8px] text-blue-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TC_3 <span className="text-[8px] text-blue-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TC_4 <span className="text-[8px] text-blue-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center bg-blue-100/50 text-blue-700 font-bold">Prom</th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TH_1 <span className="text-[8px] text-emerald-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TH_2 <span className="text-[8px] text-emerald-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TH_3 <span className="text-[8px] text-emerald-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center" title="Pasar el mouse por las notas para ver la actividad correspondiente">TH_4 <span className="text-[8px] text-emerald-300">ⓘ</span></th>
                                <th className="border-r w-20 p-1 text-center bg-emerald-100/50 text-emerald-700 font-bold">Prom</th>
                                <th className="border-r w-24 p-1 text-center">Cuaderno</th>
                                <th className="border-r w-24 p-1 text-center">Examen</th>
                                <th className="border-r w-24 p-1 font-bold text-center">Def</th>
                                <th className="border-r"></th>
                                <th className="border-r"></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedMateria ? filteredStudents.map(s => (
                                <GradeRow
                                    key={s.id}
                                    student={s}
                                    data={localNotas[s.id] || {}}
                                    scales={scales}
                                    globalAchievement={achievement}
                                    onChange={(newData) => {
                                        setLocalNotas(prev => ({
                                            ...prev,
                                            [s.id]: { ...(prev[s.id] || {}), ...newData }
                                        }));
                                    }}
                                    onSave={() => saveGrade(s.id, localNotas[s.id])}
                                    activities={activities}
                                    isClosed={periodosEstado.find(p => p.periodo === periodo)?.estado === false}
                                />
                            )) : (
                                <tr><td colSpan="16" className="text-center py-20 text-slate-400 font-medium">Selecciona una materia para cargar el listado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const GradeRow = ({ student, data, scales, globalAchievement, onChange, onSave, activities, isClosed }) => {
    const defaultData = {
        tc1: '', tc2: '', tc3: '', tc4: '',
        th1: '', th2: '', th3: '', th4: '',
        cuaderno: '', examen: ''
    };

    const row = { ...defaultData, ...data };

    const calculateFinal = () => {
        const tcKeys = ['tc1', 'tc2', 'tc3', 'tc4'];
        const thKeys = ['th1', 'th2', 'th3', 'th4'];

        const tcVals = tcKeys.map(k => row[k]).filter(v => v !== '' && v !== null && v !== undefined);
        const thVals = thKeys.map(k => row[k]).filter(v => v !== '' && v !== null && v !== undefined);

        const tcAvgVal = tcVals.length > 0 ? tcVals.reduce((acc, v) => acc + parseFloat(v), 0) / tcVals.length : 0;
        const thAvgVal = thVals.length > 0 ? thVals.reduce((acc, v) => acc + parseFloat(v), 0) / thVals.length : 0;

        const allKeys = [...tcKeys, ...thKeys, 'cuaderno', 'examen'];
        const allSet = allKeys.every(k => row[k] !== '' && row[k] !== null && row[k] !== undefined);

        const tcAvg = tcAvgVal.toFixed(1);
        const thAvg = thAvgVal.toFixed(1);

        if (!allSet) return { final: null, escala: '', logro: '', tcAvg, thAvg, partial: true };

        const cuad = parseFloat(row.cuaderno);
        const exam = parseFloat(row.examen);

        const final = (tcAvgVal * 0.3) + (thAvgVal * 0.3) + (cuad * 0.1) + (exam * 0.3);
        const finalFixed = parseFloat(final.toFixed(1));

        const scaleMatch = scales.find(s => finalFixed >= s.rango_minimo && finalFixed <= s.rango_maximo);
        const escalaTexto = scaleMatch ? scaleMatch.escala : '';
        const achievementText = scaleMatch && globalAchievement ? `${scaleMatch.verbo} ${globalAchievement}` : '';

        return {
            final: finalFixed,
            escala: escalaTexto,
            logro: achievementText,
            tcAvg,
            thAvg,
            partial: false
        };
    };

    const calc = calculateFinal();

    const handleInput = (field, val) => {
        const num = val === '' ? '' : parseFloat(val);
        if (num !== '' && (num < 0 || num > 5)) return;
        onChange({ [field]: val });
    };

    const getActDesc = (actCode) => {
        return activities.find(a => a.actividad === actCode)?.descripcion || '';
    };

    return (
        <tr className="hover:bg-slate-50 transition-colors group">
            <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r py-4 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 leading-tight">{student.apellidos}</span>
                    <span className="text-slate-500 text-[11px] font-medium">{student.nombres}</span>
                </div>
            </td>

            {/* Tareas Clase */}
            <GradeCell value={row.tc1} onChange={v => handleInput('tc1', v)} className="bg-blue-50/10" title={getActDesc('TC1')} disabled={isClosed} />
            <GradeCell value={row.tc2} onChange={v => handleInput('tc2', v)} className="bg-blue-50/10" title={getActDesc('TC2')} disabled={isClosed} />
            <GradeCell value={row.tc3} onChange={v => handleInput('tc3', v)} className="bg-blue-50/10" title={getActDesc('TC3')} disabled={isClosed} />
            <GradeCell value={row.tc4} onChange={v => handleInput('tc4', v)} className="bg-blue-50/10" title={getActDesc('TC4')} disabled={isClosed} />
            <td className="text-center bg-blue-100/30 font-black text-slate-900 border-r">{calc.tcAvg}</td>

            {/* Tareas Casa */}
            <GradeCell value={row.th1} onChange={v => handleInput('th1', v)} className="bg-emerald-50/10" title={getActDesc('TH1')} disabled={isClosed} />
            <GradeCell value={row.th2} onChange={v => handleInput('th2', v)} className="bg-emerald-50/10" title={getActDesc('TH2')} disabled={isClosed} />
            <GradeCell value={row.th3} onChange={v => handleInput('th3', v)} className="bg-emerald-50/10" title={getActDesc('TH3')} disabled={isClosed} />
            <GradeCell value={row.th4} onChange={v => handleInput('th4', v)} className="bg-emerald-50/10" title={getActDesc('TH4')} disabled={isClosed} />
            <td className="text-center bg-slate-100 font-black text-slate-900 border-r">{calc.thAvg}</td>

            {/* Cuaderno y Examen */}
            <GradeCell value={row.cuaderno} onChange={v => handleInput('cuaderno', v)} className="bg-amber-50/10 border-r" disabled={isClosed} />
            <GradeCell value={row.examen} onChange={v => handleInput('examen', v)} className="bg-violet-50/10 border-r" disabled={isClosed} />

            {/* Nota Final */}
            <td className="text-center bg-slate-100 font-black text-xl text-slate-900 border-r">
                {calc.final !== null ? calc.final : '--'}
            </td>

            {/* Escala */}
            <td className="text-center border-r px-2 min-w-[100px]">
                {calc.escala ? (
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm whitespace-nowrap ${calc.escala === 'Superior' ? 'bg-emerald-500 text-white' :
                        calc.escala === 'Alto' ? 'bg-blue-500 text-white' :
                            calc.escala === 'Básico' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                        {calc.escala}
                    </span>
                ) : '--'}
            </td>

            {/* Logro */}
            <td className="px-4 border-r min-w-[384px]">
                <p className="text-slate-600 text-[11px] italic font-medium leading-tight">
                    {calc.logro ? `"${calc.logro}"` : <span className="text-slate-300">Completa las notas...</span>}
                </p>
            </td>

            <td className="text-center p-2">
                <button
                    onClick={onSave}
                    disabled={isClosed}
                    className={`btn btn-sm w-full h-10 flex items-center justify-center p-0 rounded-xl ${isClosed ? 'bg-slate-100 text-slate-300 pointer-events-none' : 'btn-primary'}`}
                >
                    <span className="material-symbols-outlined text-lg">{isClosed ? 'lock' : 'save'}</span>
                </button>
            </td>
        </tr>
    );
};

const GradeCell = ({ value, onChange, className = '', title = '', disabled }) => (
    <td className={`p-0 border-r relative ${className} ${disabled ? 'bg-slate-50' : ''}`} title={title}>
        <input
            type="number" step="0.1"
            className={`w-full h-10 text-center bg-transparent border-none focus:ring-2 focus:ring-blue-400 rounded-lg font-bold text-slate-700 p-0 ${disabled ? 'cursor-not-allowed text-slate-400' : ''}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder="-"
            title={title}
        />
        {title && (
            <div className="absolute top-0 right-1 pointer-events-none">
                <span className="text-[8px] text-blue-400 font-black">ⓘ</span>
            </div>
        )}
    </td>
);
