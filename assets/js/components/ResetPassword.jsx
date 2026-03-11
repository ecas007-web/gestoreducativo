import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, SCHOOL_NAME } from '../config.jsx';
import { mostrarToast } from '../utils.jsx';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pass, setPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        if (pass !== confirmPass) return mostrarToast('Las contraseñas no coinciden', 'error');
        if (pass.length < 6) return mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pass });
            if (error) throw error;

            mostrarToast('Contraseña actualizada con éxito. ¡Ya puedes ingresar!', 'success');
            navigate('/');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container animate-scaleIn max-w-md min-h-0 py-10">
                <div className="w-full px-10">
                    <div className="mb-6 flex justify-center flex-col items-center">
                        <img src="/images/escudo.webp" alt="Logo" className="w-32 h-32 object-contain mb-4" />
                        <h1 className="text-2xl font-black text-slate-800 text-center">{SCHOOL_NAME}</h1>
                    </div>

                    <h2 className="text-3xl font-black text-slate-800 mb-2">Nueva Contraseña</h2>
                    <p className="text-slate-500 mb-8 font-medium">Define tu nueva clave de acceso de forma segura.</p>

                    <form onSubmit={handleReset} className="space-y-5">
                        <div className="form-group">
                            <label className="form-label">Nueva Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    required className="form-input pr-10"
                                    placeholder="••••••••"
                                    value={pass} onChange={e => setPass(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined !text-xl">
                                        {showPass ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmar Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    required className="form-input pr-10"
                                    placeholder="••••••••"
                                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined !text-xl">
                                        {showConfirm ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block py-3 mt-4" disabled={loading}>
                            {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
