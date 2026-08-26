import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';

export const ConfirmarCupo = () => {
    const [step, setStep] = useState(1); // 1: Login, 2: Pregunta Cupo, 3: Formulario Datos, 4: Fin / Éxito
    const [loginData, setLoginData] = useState({ documento: '', fecha_nac: '' });
    const [student, setStudent] = useState(null);
    const [nextGrade, setNextGrade] = useState('');
    const [activeYear, setActiveYear] = useState(null);
    const [loading, setLoading] = useState(false);
    const [noCupoMessage, setNoCupoMessage] = useState(false);

    const [formData, setFormData] = useState({
        fecha_nac: '', sexo: '', lugar_nacimiento: '',
        direccion: '', correo: '', telefono: '', celular: '', eps: '', tipo_sangre: '',
        documento_padre: '', nombre_padre: '', ocupacion_padre: '', telefono_padre: '',
        nombre_madre: '', documento_madre: '', ocupacion_madre: '', telefono_madre: '',
        religion: '', debilidades: '', fortalezas: ''
    });

    useEffect(() => {
        loadActiveYear();
    }, []);

    const loadActiveYear = async () => {
        try {
            const { data } = await supabase
                .from('anios_academicos')
                .select('*')
                .eq('estado', true)
                .maybeSingle();
            if (data) {
                setActiveYear(data);
            }
        } catch (e) {
            console.error('Error al cargar año activo:', e);
        }
    };

    const getNextGradeName = (currentName) => {
        if (!currentName) return '';
        const clean = currentName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (clean.includes("parvulo")) return "Prejardín";
        if (clean.includes("pre jardin") || clean.includes("prejardin")) return "Jardín";
        if (clean.includes("jardin")) return "Transición";
        return "Transición (Último grado)";
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('estudiantes')
                .select('*, cursos(*)')
                .eq('numero_documento', loginData.documento.trim())
                .eq('fecha_nac', loginData.fecha_nac)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                mostrarToast('No se encontró ningún estudiante con esos datos', 'error');
                return;
            }

            if (data.estado === 'retirado') {
                mostrarToast('El estudiante se encuentra en estado retirado', 'error');
                return;
            }

            // Validar si ya tiene un registro de cupo (confirmado o desistido) para el año entrante
            const nextYearVal = activeYear ? activeYear.anio + 1 : new Date().getFullYear() + 1;
            const { data: cupoExistente, error: cupoError } = await supabase
                .from('estudiante_confirmacion_cupo')
                .select('*')
                .eq('estudiante_id', data.id)
                .eq('anio', nextYearVal)
                .maybeSingle();

            if (cupoError) throw cupoError;

            if (cupoExistente) {
                if (cupoExistente.estado === 'confirmado') {
                    mostrarToast('Usted ya tiene el cupo confirmado para el año entrante', 'warning');
                    return;
                } else if (cupoExistente.estado === 'no confirmado') {
                    mostrarToast('Usted ya había desistido del cupo para el año entrante, por favor comuníquese con la institución si desea continuar', 'error');
                    return;
                }
            }

            setStudent(data);
            const nextG = getNextGradeName(data.cursos?.nombre || '');
            setNextGrade(nextG);

            // Pre-fill form
            setFormData({
                fecha_nac: data.fecha_nac || '',
                sexo: data.sexo || '',
                lugar_nacimiento: data.lugar_nacimiento || '',
                direccion: data.direccion || '',
                correo: data.correo || '',
                telefono: data.telefono || '',
                celular: data.celular || '',
                eps: data.eps || '',
                tipo_sangre: data.tipo_sangre || '',
                documento_padre: data.documento_padre || '',
                nombre_padre: data.nombre_padre || '',
                ocupacion_padre: data.ocupacion_padre || '',
                telefono_padre: data.telefono_padre || '',
                nombre_madre: data.nombre_madre || '',
                documento_madre: data.documento_madre || '',
                ocupacion_madre: data.ocupacion_madre || '',
                telefono_madre: data.telefono_madre || '',
                religion: data.religion || '',
                debilidades: data.debilidades || '',
                fortalezas: data.fortalezas || ''
            });

            setStep(2);
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleNoConfirmar = async () => {
        setLoading(true);
        try {
            const nextYearVal = activeYear ? activeYear.anio + 1 : new Date().getFullYear() + 1;
            const { error } = await supabase
                .from('estudiante_confirmacion_cupo')
                .insert([{
                    estudiante_id: student.id,
                    documento_estudiante: student.numero_documento,
                    anio: nextYearVal,
                    grado: nextGrade,
                    estado: 'no confirmado'
                }]);

            if (error) throw error;

            setNoCupoMessage(true);
            setStep(4);
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmarDatosSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Todos los campos obligatorios
            const keys = Object.keys(formData);
            for (let key of keys) {
                if (!formData[key]) {
                    mostrarToast('Todos los campos son obligatorios', 'error');
                    setLoading(false);
                    return;
                }
            }

            // 1. Actualizar datos en estudiantes
            const { error: updateError } = await supabase
                .from('estudiantes')
                .update({
                    ...formData,
                    registro_completo: true
                })
                .eq('id', student.id);

            if (updateError) throw updateError;

            // 2. Registrar confirmación de cupo en la tabla
            const nextYearVal = activeYear ? activeYear.anio + 1 : new Date().getFullYear() + 1;
            const { error: insertError } = await supabase
                .from('estudiante_confirmacion_cupo')
                .insert([{
                    estudiante_id: student.id,
                    documento_estudiante: student.numero_documento,
                    anio: nextYearVal,
                    grado: nextGrade,
                    estado: 'confirmado'
                }]);

            if (insertError) throw insertError;

            setNoCupoMessage(false);
            setStep(4);
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto w-full">
                {/* Cabecera común */}
                <div className="text-center mb-8">
                    <img className="mx-auto h-24 w-auto" src="/images/escudo.webp" alt="Escudo" onError={(e) => { e.target.src = 'https://placehold.co/100' }} />
                    <h2 className="mt-4 text-3xl font-black text-slate-800 tracking-tight">
                        Jardín Infantil Mis Pequeños Genios
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
                        Proceso de Confirmación de Cupo y Actualización de Datos {activeYear ? activeYear.anio + 1 : ''}
                    </p>
                </div>

                {step === 1 && (
                    <div className="card max-w-md mx-auto shadow-xl p-8 border border-slate-100">
                        <div className="mb-6 text-center">
                            <span className="material-symbols-outlined text-4xl text-blue-600">how_to_reg</span>
                            <h3 className="text-xl font-black text-slate-800 mt-2">Identificación del Estudiante</h3>
                            <p className="text-sm text-slate-500">Ingresa los datos para verificar el preregistro y continuar</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Documento del Estudiante</label>
                                <input
                                    type="text"
                                    required
                                    className="form-input"
                                    value={loginData.documento}
                                    onChange={(e) => setLoginData({ ...loginData, documento: e.target.value })}
                                    placeholder="Número de documento"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    required
                                    className="form-input"
                                    value={loginData.fecha_nac}
                                    onChange={(e) => setLoginData({ ...loginData, fecha_nac: e.target.value })}
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 mt-4 text-base font-bold">
                                {loading ? 'Verificando...' : 'Iniciar Proceso'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && student && (
                    <div className="card max-w-md mx-auto shadow-xl p-8 border border-slate-100 text-center space-y-6">
                        <span className="material-symbols-outlined text-6xl text-blue-600 animate-bounce">contact_support</span>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">¿Confirmar Cupo para {activeYear ? activeYear.anio + 1 : ''}?</h3>
                            <p className="text-slate-600 mt-3 text-base">
                                Hola, <strong className="text-blue-600">{student.nombres} {student.apellidos}</strong>.
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Actualmente cursando: <strong>{student.cursos?.nombre || 'Sin curso'}</strong>.
                            </p>
                            <p className="text-slate-600 mt-4 text-base">
                                ¿Deseas confirmar tu cupo para el grado entrante: <strong className="text-indigo-600">{nextGrade}</strong>?
                            </p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={handleNoConfirmar}
                                disabled={loading}
                                className="btn btn-ghost border border-slate-200 hover:bg-slate-50 text-slate-700 w-1/2 py-3"
                            >
                                No continuaré
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={loading}
                                className="btn btn-primary w-1/2 py-3"
                            >
                                Sí, confirmar
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && student && (
                    <form onSubmit={handleConfirmarDatosSubmit} className="space-y-6">
                        <div className="card shadow-xl p-8 border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 border-b pb-4">
                                <span className="material-symbols-outlined text-3xl text-blue-600">edit_square</span>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Actualización Obligatoria de Datos</h3>
                                    <p className="text-sm text-slate-500">Todos los campos son requeridos para finalizar la confirmación.</p>
                                </div>
                            </div>

                            {/* Datos Básicos (No Editables) */}
                            <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Nombres y Apellidos</label>
                                    <p className="text-sm font-semibold text-slate-800">{student.nombres} {student.apellidos}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Documento</label>
                                    <p className="text-sm font-semibold text-slate-800">{student.tipo_documento} - {student.numero_documento}</p>
                                </div>
                            </div>

                            {/* Datos Personales */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Datos Personales</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Fecha Nacimiento</label>
                                        <input type="date" disabled className="form-input bg-slate-100" value={formData.fecha_nac} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Lugar Nacimiento</label>
                                        <input type="text" required className="form-input" value={formData.lugar_nacimiento} onChange={e => setFormData({ ...formData, lugar_nacimiento: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sexo</label>
                                        <select required className="form-input" value={formData.sexo} onChange={e => setFormData({ ...formData, sexo: e.target.value })}>
                                            <option value="">Seleccione</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Femenino</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tipo Sangre</label>
                                        <select required className="form-input" value={formData.tipo_sangre} onChange={e => setFormData({ ...formData, tipo_sangre: e.target.value })}>
                                            <option value="">Seleccione</option>
                                            <option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Contacto */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Contacto y Salud</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Dirección</label>
                                        <input type="text" required className="form-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Correo Electrónico</label>
                                        <input type="email" required className="form-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input type="text" required className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Celular</label>
                                        <input type="text" required className="form-input" value={formData.celular} onChange={e => setFormData({ ...formData, celular: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">EPS</label>
                                        <input type="text" required className="form-input" value={formData.eps} onChange={e => setFormData({ ...formData, eps: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Religión</label>
                                        <input type="text" required className="form-input" value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Datos del Padre */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Datos del Padre</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">Nombre Completo</label>
                                        <input type="text" required className="form-input" value={formData.nombre_padre} onChange={e => setFormData({ ...formData, nombre_padre: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Identificación</label>
                                        <input type="text" required className="form-input" value={formData.documento_padre} onChange={e => setFormData({ ...formData, documento_padre: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input type="text" required className="form-input" value={formData.telefono_padre} onChange={e => setFormData({ ...formData, telefono_padre: e.target.value })} />
                                    </div>
                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">Ocupación</label>
                                        <input type="text" required className="form-input" value={formData.ocupacion_padre} onChange={e => setFormData({ ...formData, ocupacion_padre: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Datos de la Madre */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Datos de la Madre</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">Nombre Completo</label>
                                        <input type="text" required className="form-input" value={formData.nombre_madre} onChange={e => setFormData({ ...formData, nombre_madre: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Identificación</label>
                                        <input type="text" required className="form-input" value={formData.documento_madre} onChange={e => setFormData({ ...formData, documento_madre: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Teléfono</label>
                                        <input type="text" required className="form-input" value={formData.telefono_madre} onChange={e => setFormData({ ...formData, telefono_madre: e.target.value })} />
                                    </div>
                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">Ocupación</label>
                                        <input type="text" required className="form-input" value={formData.ocupacion_madre} onChange={e => setFormData({ ...formData, ocupacion_madre: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* Fortalezas/Debilidades */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Observaciones adicionales</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Debilidades</label>
                                        <textarea required className="form-input h-20" value={formData.debilidades} onChange={e => setFormData({ ...formData, debilidades: e.target.value })} placeholder="Aspectos a mejorar..."></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Fortalezas</label>
                                        <textarea required className="form-input h-20" value={formData.fortalezas} onChange={e => setFormData({ ...formData, fortalezas: e.target.value })} placeholder="Habilidades y capacidades..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-4 bg-white rounded-2xl border shadow-md">
                            <button type="button" onClick={() => setStep(2)} className="btn btn-ghost">Atrás</button>
                            <button type="submit" className="btn btn-primary px-10" disabled={loading}>
                                {loading ? 'Confirmando...' : 'Confirmar Cupo y Guardar'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 4 && (
                    <div className="card max-w-md mx-auto shadow-xl p-8 border border-slate-100 text-center space-y-6">
                        {noCupoMessage ? (
                            <>
                                <span className="material-symbols-outlined text-6xl text-amber-500 animate-pulse">cancel</span>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">Proceso Finalizado</h3>
                                    <p className="text-slate-600 mt-3 text-base">
                                        Has indicado que <strong>No</strong> continuarás con el cupo para el grado entrante.
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Tu respuesta ha sido registrada exitosamente. Agradecemos tu confirmación.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-6xl text-emerald-500 animate-bounce">check_circle</span>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">Cupo Confirmado Exitosamente</h3>
                                    <p className="text-slate-600 mt-3 text-base">
                                        ¡Excelente! Se ha confirmado el cupo para el grado <strong className="text-indigo-600">{nextGrade}</strong>.
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">
                                        Los datos del estudiante han sido actualizados en nuestra base de datos.
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="pt-4">
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setLoginData({ documento: '', fecha_nac: '' });
                                    setStudent(null);
                                    setNextGrade('');
                                }}
                                className="btn btn-primary w-full py-3"
                            >
                                Volver al Inicio
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 mt-8 font-medium">
                © {new Date().getFullYear()} Jardín Infantil Mis Pequeños Genios. Todos los derechos reservados.
            </div>
        </div>
    );
};
