import React, { useState } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const TeacherProfile = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            return mostrarToast('Las contraseñas nuevas no coinciden', 'error');
        }

        if (passwords.new.length < 6) {
            return mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
        }

        setLoading(true);
        try {
            // En Supabase, para actualizar la contraseña se usa el Session actual.
            // Primero verificamos intentando un sign in con la actual (opcional pero más seguro si se requiere old password)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.correo,
                password: passwords.current,
            });

            if (signInError) throw new Error('La contraseña actual es incorrecta');

            // Actualizar a la nueva contraseña
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwords.new
            });

            if (updateError) throw updateError;

            mostrarToast('Contraseña actualizada correctamente', 'success');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800">Mi Perfil</h2>
                <p className="text-slate-500">Gestiona tu información y seguridad de la cuenta.</p>
            </div>

            <div className="card">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">person</span>
                    Información Personal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Nombres y Apellidos</p>
                        <p className="font-medium text-slate-800">{profile?.nombres} {profile?.apellidos}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Documento</p>
                        <p className="font-medium text-slate-800">{profile?.tipo_documento} {profile?.numero_documento}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Correo Electrónico</p>
                        <p className="font-medium text-slate-800">{profile?.correo}</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">lock</span>
                    Cambiar Contraseña
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="form-group">
                        <label className="form-label">Contraseña Actual</label>
                        <input
                            type="password"
                            required
                            className="form-input"
                            value={passwords.current}
                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label">Nueva Contraseña</label>
                            <input
                                type="password"
                                required
                                className="form-input"
                                value={passwords.new}
                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirmar Contraseña</label>
                            <input
                                type="password"
                                required
                                className="form-input"
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
