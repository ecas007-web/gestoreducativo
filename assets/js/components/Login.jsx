import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, ADMIN_CREATOR_EMAIL, SCHOOL_NAME } from '../config.jsx';
import { mostrarToast } from '../utils.jsx';

export const LoginPage = () => {
    const navigate = useNavigate();
    const [rol, setRol] = useState('admin');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('login'); // 'login', 'student_register', 'admin_register'

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
        address: '',
        phone: '',
        blood: '',
        padre: '',
        madre: ''
    });
    const [verifiedStudent, setVerifiedStudent] = useState(null);

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

            const { error: updErr } = await supabase.from('estudiantes').update({
                correo: regData.email,
                direccion: regData.address,
                telefono: regData.phone,
                tipo_sangre: regData.blood,
                padre_nombre: regData.padre,
                madre_nombre: regData.madre,
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
                            <img src="/images/escudo.png" alt="Logo" className="w-80 h-80 object-contain" />
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
                                    <input
                                        type="password" required className="form-input"
                                        placeholder="••••••••"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                    />
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
                                        className="text-blue-600 font-bold hover:underline transition-all text-sm"
                                    >
                                        Completar Registro Estudiante
                                    </button>
                                    <button
                                        onClick={() => setView('admin_register')}
                                        className="text-slate-500 hover:text-slate-800 font-bold transition-all text-xs uppercase tracking-widest"
                                    >
                                        Registrar como Administrador
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'student_register' && (
                        <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto pr-2">
                            <button onClick={() => setView('login')} className="btn btn-ghost btn-sm mb-4 px-0">
                                <span className="material-symbols-outlined">arrow_back</span> Volver al login
                            </button>
                            <h2 className="text-2xl font-black text-slate-800 mb-1">Completar Registro Estudiante</h2>
                            <p className="text-slate-500 mb-6 text-sm">Ingresa los datos del pre-registro del jardín.</p>

                            {!verifiedStudent ? (
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
                                        Verificar Datos
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleStudentRegister} className="space-y-4 animate-fadeIn">
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-4">
                                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Estudiante Encontrado</p>
                                        <p className="font-bold text-slate-800">{verifiedStudent.nombres} {verifiedStudent.apellidos}</p>
                                        <p className="text-xs text-slate-500">Curso: {verifiedStudent.cursos?.nombre}</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Correo para notificaciones</label>
                                        <input type="email" required className="form-input" value={regData.email} onChange={e => setRegData({ ...regData, email: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="form-group">
                                            <label className="form-label">Contraseña</label>
                                            <input type="password" required className="form-input" value={regData.pass} onChange={e => setRegData({ ...regData, pass: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Confirmar</label>
                                            <input type="password" required className="form-input" value={regData.confirmPass} onChange={e => setRegData({ ...regData, confirmPass: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Dirección de Residencia</label>
                                        <input type="text" required className="form-input" value={regData.address} onChange={e => setRegData({ ...regData, address: e.target.value })} />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-block pt-3" disabled={loading}>
                                        Finalizar Registro
                                    </button>
                                </form>
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
                                        type="text" required className="form-input" placeholder="Nombre y Apelliido"
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
                                    <input
                                        type="password" required className="form-input" placeholder="••••••••"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-block pt-3" disabled={loading}>
                                    {loading ? 'Procesando...' : 'Crear Administrador'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
