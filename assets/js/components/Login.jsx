import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, ADMIN_CREATOR_EMAIL, SCHOOL_NAME } from '../config.jsx';
import { useAuth } from '../AuthContext.jsx';
import { mostrarToast } from '../utils.jsx';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { setProfile } = useAuth();
    const [rol, setRol] = useState('admin');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('login'); // 'login', 'student_register', 'admin_register', 'forgot_password'
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [showRegPass, setShowRegPass] = useState(false);
    const [showAdminPass, setShowAdminPass] = useState(false);

    // States comunes
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [docType, setDocType] = useState('CC');
    const [docNum, setNumDoc] = useState('');
    const [fullName, setFullName] = useState('');

    // States para Registro Estudiante
    const [regData, setRegData] = useState({
        docType: 'RC',
        docNum: '',
        email: '',
        pass: '',
        confirmPass: '',
        fecha_nac: '',
        sexo: '',
        lugar_nacimiento: '',
        address: '',
        phone: '',
        celular: '',
        eps: '',
        blood: '',
        docPadre: '',
        padre: '',
        ocupPadre: '',
        telPadre: '',
        docMadre: '',
        madre: '',
        ocupMadre: '',
        telMadre: '',
        religion: '',
        debilidades: '',
        fortalezas: ''
    });
    const [verifiedStudent, setVerifiedStudent] = useState(null);
    const [recoverySent, setRecoverySent] = useState(false);

    const handleResetRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setRecoverySent(true);
            mostrarToast('Enlace de recuperación enviado a tu correo.', 'success');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user }, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            const { data: profile, error: profErr } = await supabase
                .from('profiles')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (profErr || profile.rol !== rol) {
                await supabase.auth.signOut();
                throw new Error('El usuario no tiene el rol seleccionado.');
            }

            // Actualizar el perfil manualmente para evitar carrera de estados con el router
            setProfile(profile);

            mostrarToast(`Bienvenido, acceso como ${rol}`, 'success');
            navigate(`/${rol}/dashboard`);
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const verifyPreRegistro = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('estudiantes')
                .select('*, cursos(nombre)')
                .eq('tipo_documento', regData.docType)
                .eq('numero_documento', regData.docNum)
                .single();

            if (error || !data) throw new Error('No se encontró un pre-registro para estos datos.');
            if (data.registro_completo) throw new Error('El registro de este estudiante ya fue completado.');

            setVerifiedStudent(data);
            mostrarToast('Estudiante verificado. Por favor completa tus datos.', 'success');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentRegister = async (e) => {
        e.preventDefault();
        if (regData.pass !== regData.confirmPass) return mostrarToast('Las contraseñas no coinciden', 'error');

        setLoading(true);
        try {
            // First, create the user in Auth
            const { data: { user }, error: authErr } = await supabase.auth.signUp({
                email: regData.email,
                password: regData.pass,
                options: {
                    data: {
                        rol: 'estudiante',
                        nombres: verifiedStudent.nombres,
                        apellidos: verifiedStudent.apellidos,
                        tipo_documento: verifiedStudent.tipo_documento,
                        numero_documento: verifiedStudent.numero_documento
                    }
                }
            });

            if (authErr) throw authErr;

            // Then update the student record
            const { error: updErr } = await supabase.from('estudiantes').update({
                user_id: user.id,
                correo: regData.email,
                fecha_nac: regData.fecha_nac,
                sexo: regData.sexo,
                lugar_nacimiento: regData.lugar_nacimiento,
                direccion: regData.address,
                telefono: regData.phone,
                celular: regData.celular,
                eps: regData.eps,
                tipo_sangre: regData.blood,
                documento_padre: regData.docPadre,
                nombre_padre: regData.padre,
                ocupacion_padre: regData.ocupPadre,
                telefono_padre: regData.telPadre,
                documento_madre: regData.docMadre,
                nombre_madre: regData.madre,
                ocupacion_madre: regData.ocupMadre,
                telefono_madre: regData.telMadre,
                religion: regData.religion,
                debilidades: regData.debilidades,
                fortalezas: regData.fortalezas,
                registro_completo: true
            }).eq('id', verifiedStudent.id);

            if (updErr) throw updErr;

            mostrarToast('Registro exitoso. Revisa tu correo.', 'success');
            setView('login');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminRegister = async (e) => {
        e.preventDefault();

        // Validar contra la variable de entorno
        if (email.toLowerCase() !== ADMIN_CREATOR_EMAIL?.toLowerCase()) {
            return mostrarToast('Este correo no está autorizado para crear administradores.', 'error');
        }

        setLoading(true);
        try {
            const nombres = fullName.split(' ')[0] || '';
            const apellidos = fullName.split(' ').slice(1).join(' ') || '';

            const { error: authErr } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        rol: 'admin',
                        nombres,
                        apellidos,
                        tipo_documento: docType,
                        numero_documento: docNum
                    }
                }
            });

            if (authErr) throw authErr;

            mostrarToast('Registro de administrador iniciado. Por favor verifica tu correo.', 'success');
            setView('login');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container animate-scaleIn">
                {/* Panel Izquierdo: Branding */}
                <div className="login-branding">
                    <div className="login-branding-content">
                        <div className="mb-6 flex justify-center">
                            <img src="/images/escudo.webp" alt="Logo" className="w-80 h-80 object-contain" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-white mb-2 leading-tight">{SCHOOL_NAME || 'Gestor Educativo'}</h1>
                        <p className="text-blue-100 text-lg opacity-90">Jardín Infantil & Preescolar</p>
                        <div className="mt-auto pt-10">
                            <p className="text-sm text-blue-200">© 2026 Todos los derechos reservados</p>
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Formulario */}
                <div className="login-form-panel">
                    {view === 'login' && (
                        <div className="w-full max-w-sm">
                            <h2 className="text-3xl font-black text-slate-800 mb-2">¡Hola de nuevo!</h2>
                            <p className="text-slate-500 mb-8 font-medium">Por favor elige tu rol para ingresar.</p>

                            <div className="role-selector mb-8">
                                <button
                                    onClick={() => setRol('admin')}
                                    className={`role-btn ${rol === 'admin' ? 'active' : ''}`}
                                >
                                    <span className="material-symbols-outlined">admin_panel_settings</span>
                                    <span>Admin</span>
                                </button>
                                <button
                                    onClick={() => setRol('docente')}
                                    className={`role-btn ${rol === 'docente' ? 'active' : ''}`}
                                >
                                    <span className="material-symbols-outlined">person_apron</span>
                                    <span>Docente</span>
                                </button>
                                <button
                                    onClick={() => setRol('estudiante')}
                                    className={`role-btn ${rol === 'estudiante' ? 'active' : ''}`}
                                >
                                    <span className="material-symbols-outlined">child_care</span>
                                    <span>Estudiante</span>
                                </button>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="form-group">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input
                                        type="email" required className="form-input"
                                        placeholder="ejemplo@correo.com"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showLoginPass ? "text" : "password"}
                                            required className="form-input pr-10"
                                            placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginPass(!showLoginPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined !text-xl">
                                                {showLoginPass ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => { setView('forgot_password'); setRecoverySent(false); }}
                                            className="text-xl font-bold text-blue-600 hover:underline"
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary btn-block py-3 mt-4" disabled={loading}>
                                    {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                                </button>
                            </form>

                            <div className="mt-8 text-center space-y-3">
                                <p className="text-sm text-slate-500 font-medium">¿Necesitas una cuenta?</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setView('student_register')}
                                        className="text-blue-600 font-bold hover:underline transition-all text-xl"
                                    >
                                        Completar Registro Estudiante
                                    </button>
                                    <button
                                        onClick={() => setView('admin_register')}
                                        className="text-slate-900 hover:text-slate-800 font-bold transition-all text-xs uppercase tracking-widest"
                                    >
                                        Registrar como Administrador
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'student_register' && (
                        <div className="w-full max-w-sm">
                            <button onClick={() => setView('login')} className="btn btn-ghost btn-sm mb-4 px-0">
                                <span className="material-symbols-outlined">arrow_back</span> Volver al login
                            </button>
                            <h2 className="text-2xl font-black text-slate-800 mb-1">Completar Registro Estudiante</h2>
                            <p className="text-slate-500 mb-6 text-sm">Ingresa los datos del pre-registro del jardín.</p>

                            {!verifiedStudent && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="form-group">
                                        <label className="form-label">Tipo de Documento</label>
                                        <select
                                            className="form-input"
                                            value={regData.docType}
                                            onChange={e => setRegData({ ...regData, docType: e.target.value })}
                                        >
                                            <option value="RC">Registro Civil (RC)</option>
                                            <option value="TI">Tarjeta de Identidad (TI)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Número de Documento</label>
                                        <input
                                            type="text" className="form-input" placeholder="Ingresa el documento..."
                                            value={regData.docNum} onChange={e => setRegData({ ...regData, docNum: e.target.value })}
                                        />
                                    </div>
                                    <button onClick={verifyPreRegistro} className="btn btn-primary btn-block pt-3" disabled={loading}>
                                        {loading ? 'Verificando...' : 'Verificar Datos'}
                                    </button>
                                </div>
                            )}

                            {verifiedStudent && (
                                <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-fadeIn">
                                    <span className="material-symbols-outlined text-blue-600 text-5xl mb-3">verified_user</span>
                                    <h3 className="text-lg font-black text-slate-800 mb-1">¡Estudiante Verificado!</h3>
                                    <p className="text-sm text-slate-600 mb-4">Hemos encontrado tu pre-registro. Por favor abre el formulario para completar tus datos.</p>
                                    <button onClick={() => {/* El modal se abre solo por el estado verifiedStudent */ }} className="btn btn-primary btn-block">
                                        Continuar con el Registro
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'admin_register' && (
                        <div className="w-full max-w-sm">
                            <button onClick={() => setView('login')} className="btn btn-ghost btn-sm mb-4 px-0">
                                <span className="material-symbols-outlined">arrow_back</span> Volver al login
                            </button>
                            <h2 className="text-2xl font-black text-slate-800 mb-1">Registro de Administrador</h2>
                            <p className="text-slate-500 mb-6 text-sm">Crea una cuenta de administración autorizada.</p>

                            <form onSubmit={handleAdminRegister} className="space-y-4 animate-fadeIn">
                                <div className="form-group">
                                    <label className="form-label">Nombre Completo</label>
                                    <input
                                        type="text" required className="form-input" placeholder="Nombre y Apellido"
                                        value={fullName} onChange={e => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Correo Autorizado</label>
                                    <input
                                        type="email" required className="form-input" placeholder="ejemplo@correo.com"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="form-group">
                                        <label className="form-label">Tipo Doc.</label>
                                        <select className="form-input" value={docType} onChange={e => setDocType(e.target.value)}>
                                            <option value="CC">CC</option>
                                            <option value="CE">CE</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Documento</label>
                                        <input
                                            type="text" required className="form-input" placeholder="3798..."
                                            value={docNum} onChange={e => setNumDoc(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showAdminPass ? "text" : "password"}
                                            required className="form-input pr-10"
                                            placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminPass(!showAdminPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined !text-xl">
                                                {showAdminPass ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary btn-block pt-3" disabled={loading}>
                                    {loading ? 'Procesando...' : 'Crear Administrador'}
                                </button>
                            </form>
                        </div>
                    )}

                    {view === 'forgot_password' && (
                        <div className="w-full max-w-sm animate-fadeIn">
                            <button onClick={() => setView('login')} className="btn btn-ghost btn-sm mb-4 px-0">
                                <span className="material-symbols-outlined">arrow_back</span> Volver al login
                            </button>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Recuperar Acceso</h2>
                            <p className="text-slate-500 mb-8 font-medium">Ingresa tu correo para recibir un enlace de restablecimiento.</p>

                            {!recoverySent ? (
                                <form onSubmit={handleResetRequest} className="space-y-5">
                                    <div className="form-group">
                                        <label className="form-label">Correo Electrónico</label>
                                        <input
                                            type="email" required className="form-input"
                                            placeholder="ejemplo@correo.com"
                                            value={email} onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-block py-3" disabled={loading}>
                                        {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center p-8 bg-blue-50 rounded-2xl border border-blue-100">
                                    <span className="material-symbols-outlined text-blue-600 text-5xl mb-4">mail</span>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">¡Correo Enviado!</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        Hemos enviado un enlace a <strong>{email}</strong>. Por favor revisa tu bandeja de entrada y sigue las instrucciones.
                                    </p>
                                    <button onClick={() => setView('login')} className="btn btn-secondary btn-block mt-6">
                                        Entendido
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Registro de Estudiante (Fuera del container para evitar clipping) */}
            {verifiedStudent && view === 'student_register' && (
                <div className="modal-backdrop">
                    <div className="modal !max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="modal-header shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">Completar Registro Estudiantil</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className="badge badge-primary">{verifiedStudent.nombres} {verifiedStudent.apellidos}</span>
                                    <span className="badge badge-ghost">Curso: {verifiedStudent.cursos?.nombre}</span>
                                </div>
                            </div>
                            <button onClick={() => setVerifiedStudent(null)} className="btn btn-ghost btn-sm p-1 rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleStudentRegister} className="modal-body overflow-y-auto custom-scrollbar p-6 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* SECCION ACCESO */}
                                <div className="col-span-full">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2 mb-4">
                                        <span className="material-symbols-outlined !text-sm">lock</span> Cuenta de Acceso
                                    </h4>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Correo Electrónico</label>
                                    <input type="email" required className="form-input" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} placeholder="ejemplo@correo.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showRegPass ? "text" : "password"}
                                            required className="form-input pr-10"
                                            value={regData.pass}
                                            onChange={e => setRegData({ ...regData, pass: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPass(!showRegPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined !text-xl">
                                                {showRegPass ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showRegPass ? "text" : "password"}
                                            required className="form-input pr-10"
                                            value={regData.confirmPass}
                                            onChange={e => setRegData({ ...regData, confirmPass: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* SECCION PERSONALES */}
                                <div className="col-span-full mt-2">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2 mb-4">
                                        <span className="material-symbols-outlined !text-sm">person</span> Datos Personales
                                    </h4>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha de Nacimiento</label>
                                    <input type="date" required className="form-input" value={regData.fecha_nac} onChange={e => setRegData({ ...regData, fecha_nac: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sexo</label>
                                    <select required className="form-input" value={regData.sexo} onChange={e => setRegData({ ...regData, sexo: e.target.value })}>
                                        <option value="">Seleccione</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Femenino</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tipo de Sangre</label>
                                    <select required className="form-input" value={regData.blood} onChange={e => setRegData({ ...regData, blood: e.target.value })}>
                                        <option value="">Seleccione RH</option>
                                        <option value="O+">O+</option><option value="O-">O-</option>
                                        <option value="A+">A+</option><option value="A-">A-</option>
                                        <option value="B+">B+</option><option value="B-">B-</option>
                                        <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div className="form-group md:col-span-2 lg:col-span-1">
                                    <label className="form-label">Lugar de Nacimiento</label>
                                    <input type="text" required className="form-input" value={regData.lugar_nacimiento} onChange={e => setRegData({ ...regData, lugar_nacimiento: e.target.value })} placeholder="Ciudad, Departamento" />
                                </div>
                                <div className="form-group md:col-span-2">
                                    <label className="form-label">Dirección de Residencia</label>
                                    <input type="text" required className="form-input" value={regData.address} onChange={e => setRegData({ ...regData, address: e.target.value })} placeholder="Dirección completa" />
                                </div>

                                {/* SECCION CONTACTO Y SALUD */}
                                <div className="col-span-full mt-2">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2 mb-4">
                                        <span className="material-symbols-outlined !text-sm">contact_phone</span> Contacto y Salud
                                    </h4>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono Fijo</label>
                                    <input type="text" required className="form-input" value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Celular</label>
                                    <input type="text" required className="form-input" value={regData.celular} onChange={e => setRegData({ ...regData, celular: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">EPS</label>
                                    <input type="text" required className="form-input" value={regData.eps} onChange={e => setRegData({ ...regData, eps: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Religión</label>
                                    <input type="text" required className="form-input" value={regData.religion} onChange={e => setRegData({ ...regData, religion: e.target.value })} />
                                </div>

                                {/* SECCION PADRES */}
                                <div className="col-span-full mt-2">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2 mb-4">
                                        <span className="material-symbols-outlined !text-sm">family_restroom</span> Información de los Padres
                                    </h4>
                                </div>
                                {/* Padre */}
                                <div className="form-group">
                                    <label className="form-label font-bold text-slate-900 border-l-2 border-blue-200 pl-2 mb-2">Nombre del Padre</label>
                                    <input type="text" required className="form-input" value={regData.padre} onChange={e => setRegData({ ...regData, padre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Documento Padre</label>
                                    <input type="text" required className="form-input" value={regData.docPadre} onChange={e => setRegData({ ...regData, docPadre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tel. Padre / Ocupación</label>
                                    <div className="flex gap-2">
                                        <input type="text" required className="form-input" value={regData.telPadre} onChange={e => setRegData({ ...regData, telPadre: e.target.value })} placeholder="Tel." />
                                        <input type="text" required className="form-input" value={regData.ocupPadre} onChange={e => setRegData({ ...regData, ocupPadre: e.target.value })} placeholder="Ocup." />
                                    </div>
                                </div>
                                {/* Madre */}
                                <div className="form-group">
                                    <label className="form-label font-bold text-slate-900 border-l-2 border-rose-200 pl-2 mb-2">Nombre de la Madre</label>
                                    <input type="text" required className="form-input" value={regData.madre} onChange={e => setRegData({ ...regData, madre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Documento Madre</label>
                                    <input type="text" required className="form-input" value={regData.docMadre} onChange={e => setRegData({ ...regData, docMadre: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tel. Madre / Ocupación</label>
                                    <div className="flex gap-2">
                                        <input type="text" required className="form-input" value={regData.telMadre} onChange={e => setRegData({ ...regData, telMadre: e.target.value })} placeholder="Tel." />
                                        <input type="text" required className="form-input" value={regData.ocupMadre} onChange={e => setRegData({ ...regData, ocupMadre: e.target.value })} placeholder="Ocup." />
                                    </div>
                                </div>

                                {/* OTROS */}
                                <div className="col-span-full mt-2">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-2 mb-4">
                                        <span className="material-symbols-outlined !text-sm">psychology</span> Observaciones Adicionales
                                    </h4>
                                </div>
                                <div className="form-group lg:col-span-2">
                                    <label className="form-label">Fortalezas</label>
                                    <textarea required className="form-input h-20 resize-none" value={regData.fortalezas} onChange={e => setRegData({ ...regData, fortalezas: e.target.value })} placeholder="Describa las principales fortalezas del estudiante..."></textarea>
                                </div>
                                <div className="form-group lg:col-span-1">
                                    <label className="form-label">Debilidades</label>
                                    <textarea required className="form-input h-20 resize-none" value={regData.debilidades} onChange={e => setRegData({ ...regData, debilidades: e.target.value })} placeholder="Aspectos a mejorar..."></textarea>
                                </div>
                            </div>

                            <button type="submit" className="hidden" id="submit-hidden"></button>
                        </form>

                        <div className="modal-footer shrink-0 flex justify-between items-center bg-slate-50 border-t p-6">
                            <p className="text-xs text-slate-500 max-w-[50%]">Al finalizar, tu usuario será creado y podrás acceder a la plataforma.</p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setVerifiedStudent(null)} className="btn btn-ghost px-6 h-12">Cancelar</button>
                                <button onClick={() => document.getElementById('submit-hidden').click()} className="btn btn-primary px-10 h-12 font-black shadow-lg shadow-blue-200" disabled={loading}>
                                    {loading ? 'Procesando...' : 'Finalizar Registro'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
