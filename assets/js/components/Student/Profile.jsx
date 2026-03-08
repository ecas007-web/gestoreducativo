import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const StudentProfile = () => {
    const { profile } = useAuth();
    const [estData, setEstData] = useState(null);
    const [formData, setFormData] = useState({
        fecha_nac: '', sexo: '', lugar_nacimiento: '',
        direccion: '', correo: '', telefono: '', celular: '', eps: '', tipo_sangre: '',
        documento_padre: '', nombre_padre: '', ocupacion_padre: '', telefono_padre: '',
        nombre_madre: '', documento_madre: '', ocupacion_madre: '', telefono_madre: '',
        religion: '', debilidades: '', fortalezas: ''
    });
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) loadProfile();
    }, [profile]);

    const loadProfile = async () => {
        setLoading(true);
        const { data } = await supabase.from('estudiantes')
            .select('*')
            .eq('numero_documento', profile.numero_documento)
            .single();

        if (data) {
            setEstData(data);
            const newFormData = {
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
            };
            setFormData(newFormData);

            // Check if registration is incomplete
            if (!data.registro_completo) {
                setShowCompleteModal(true);
            }
        }
        setLoading(false);
    };

    const handleUpdate = async (e, isCompletion = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            if (isCompletion) {
                payload.registro_completo = true;
            }

            const { error } = await supabase.from('estudiantes').update(payload).eq('id', estData.id);
            if (error) throw error;

            mostrarToast('Información actualizada correctamente', 'success');
            if (isCompletion) setShowCompleteModal(false);
            loadProfile();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !estData) return <div className="py-20 text-center text-slate-400">Cargando perfil...</div>;

    const renderFormFields = (isMandatory = false) => (
        <div className="space-y-8">
            <section>
                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Datos Personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group"><label className="form-label">Fecha Nacimiento</label><input type="date" required={isMandatory} className="form-input" value={formData.fecha_nac} onChange={e => setFormData({ ...formData, fecha_nac: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Lugar Nacimiento</label><input type="text" required={isMandatory} className="form-input" value={formData.lugar_nacimiento} onChange={e => setFormData({ ...formData, lugar_nacimiento: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="form-group">
                            <label className="form-label">Sexo</label>
                            <select required={isMandatory} className="form-input" value={formData.sexo} onChange={e => setFormData({ ...formData, sexo: e.target.value })}>
                                <option value="">Seleccione</option><option value="M">Masculino</option><option value="F">Femenino</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">T. Sangre</label>
                            <select required={isMandatory} className="form-input" value={formData.tipo_sangre} onChange={e => setFormData({ ...formData, tipo_sangre: e.target.value })}>
                                <option value="">Seleccione</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Contacto y Salud</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group"><label className="form-label">Dirección</label><input type="text" required={isMandatory} className="form-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Correo Electrónico</label><input type="email" required={isMandatory} className="form-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div className="form-group"><label className="form-label">Teléfono</label><input type="text" required={isMandatory} className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Celular</label><input type="text" required={isMandatory} className="form-input" value={formData.celular} onChange={e => setFormData({ ...formData, celular: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">EPS</label><input type="text" required={isMandatory} className="form-input" value={formData.eps} onChange={e => setFormData({ ...formData, eps: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Religión</label><input type="text" required={isMandatory} className="form-input" value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} /></div>
                </div>
            </section>

            <section>
                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Información de los Padres</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase">Datos del Padre</p>
                        <div className="form-group"><label className="form-label">Nombre Completo</label><input type="text" required={isMandatory} className="form-input" value={formData.nombre_padre} onChange={e => setFormData({ ...formData, nombre_padre: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="form-group"><label className="form-label">Identificación</label><input type="text" required={isMandatory} className="form-input" value={formData.documento_padre} onChange={e => setFormData({ ...formData, documento_padre: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Teléfono</label><input type="text" required={isMandatory} className="form-input" value={formData.telefono_padre} onChange={e => setFormData({ ...formData, telefono_padre: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Ocupación</label><input type="text" required={isMandatory} className="form-input" value={formData.ocupacion_padre} onChange={e => setFormData({ ...formData, ocupacion_padre: e.target.value })} /></div>
                    </div>
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs font-bold text-slate-400 uppercase">Datos de la Madre</p>
                        <div className="form-group"><label className="form-label">Nombre Completo</label><input type="text" required={isMandatory} className="form-input" value={formData.nombre_madre} onChange={e => setFormData({ ...formData, nombre_madre: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="form-group"><label className="form-label">Identificación</label><input type="text" required={isMandatory} className="form-input" value={formData.documento_madre} onChange={e => setFormData({ ...formData, documento_madre: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Teléfono</label><input type="text" required={isMandatory} className="form-input" value={formData.telefono_madre} onChange={e => setFormData({ ...formData, telefono_madre: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label className="form-label">Ocupación</label><input type="text" required={isMandatory} className="form-input" value={formData.ocupacion_madre} onChange={e => setFormData({ ...formData, ocupacion_madre: e.target.value })} /></div>
                    </div>
                </div>
            </section>

            <section>
                <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Observaciones</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group"><label className="form-label">Debilidades</label><textarea required={isMandatory} className="form-input h-20" value={formData.debilidades} onChange={e => setFormData({ ...formData, debilidades: e.target.value })} placeholder="Aspectos a mejorar..."></textarea></div>
                    <div className="form-group"><label className="form-label">Fortalezas</label><textarea required={isMandatory} className="form-input h-20" value={formData.fortalezas} onChange={e => setFormData({ ...formData, fortalezas: e.target.value })} placeholder="Habilidades y capacidades..."></textarea></div>
                </div>
            </section>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="card bg-gradient-to-br from-blue-600 to-blue-800 border-none text-white p-10 relative overflow-hidden">
                <div className="relative z-10 flex items-center gap-8">
                    <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-5xl font-black">
                        {profile?.nombres?.[0]}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black">{profile?.nombres} {profile?.apellidos}</h2>
                        <p className="text-blue-100 font-bold opacity-80 uppercase tracking-widest text-sm">Estudiante Registrado • {profile?.numero_documento}</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="card">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">person</span> Mi Perfil Completo
                    </h3>
                    {renderFormFields(false)}
                </div>

                <div className="flex justify-end gap-3 p-4 bg-slate-50 rounded-2xl border">
                    <button type="submit" className="btn btn-primary px-10" disabled={loading}>
                        {loading ? 'Actualizando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            {showCompleteModal && (
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp !max-w-4xl">
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title text-blue-600">Completar Registro</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase">Por favor, completa todos los campos para continuar</p>
                            </div>
                        </div>
                        <div className="modal-body max-h-[60vh] overflow-y-auto">
                            <form id="completeForm" onSubmit={(e) => handleUpdate(e, true)}>
                                {renderFormFields(true)}
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="submit" form="completeForm" className="btn btn-primary w-full py-4 text-lg" disabled={loading}>
                                {loading ? 'Enviando...' : 'Finalizar Registro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
