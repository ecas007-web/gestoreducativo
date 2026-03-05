import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { mostrarToast } from '../../utils.jsx';

export const StudentProfile = () => {
    const { profile } = useAuth();
    const [estId, setEstId] = useState(null);
    const [formData, setFormData] = useState({
        direccion: '', telefono: '', tipo_sangre: '',
        padre_nombre: '', padre_ocupacion: '', padre_telefono: '',
        madre_nombre: '', madre_ocupacion: '', madre_telefono: ''
    });
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
            setEstId(data.id);
            setFormData({
                direccion: data.direccion || '',
                telefono: data.telefono || '',
                tipo_sangre: data.tipo_sangre || '',
                padre_nombre: data.padre_nombre || '',
                padre_ocupacion: data.padre_ocupacion || '',
                padre_telefono: data.padre_telefono || '',
                madre_nombre: data.madre_nombre || '',
                madre_ocupacion: data.madre_ocupacion || '',
                madre_telefono: data.madre_telefono || ''
            });
        }
        setLoading(false);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('estudiantes').update(formData).eq('id', estId);
            if (error) throw error;
            mostrarToast('Información actualizada correctamente', 'success');
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando perfil...</div>;

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
                        <span className="material-symbols-outlined text-blue-600">contact_mail</span> Datos de Contacto y Salud
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="form-group"><label className="form-label">Dirección</label><input type="text" className="form-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} /></div>
                        <div className="form-group">
                            <label className="form-label">RH</label>
                            <select className="form-input" value={formData.tipo_sangre} onChange={e => setFormData({ ...formData, tipo_sangre: e.target.value })}>
                                <option value="">Seleccionar...</option>
                                <option value="O+">O+</option><option value="O-">O-</option>
                                <option value="A+">A+</option><option value="A-">A-</option>
                                <option value="B+">B+</option><option value="B-">B-</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="card border-l-4 border-l-blue-600">
                        <h4 className="font-black text-blue-600 uppercase text-xs mb-4">Información del Padre</h4>
                        <div className="space-y-4">
                            <div className="form-group"><label className="form-label">Nombre</label><input type="text" className="form-input" value={formData.padre_nombre} onChange={e => setFormData({ ...formData, padre_nombre: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Ocupación</label><input type="text" className="form-input" value={formData.padre_ocupacion} onChange={e => setFormData({ ...formData, padre_ocupacion: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.padre_telefono} onChange={e => setFormData({ ...formData, padre_telefono: e.target.value })} /></div>
                        </div>
                    </div>
                    <div className="card border-l-4 border-l-rose-600">
                        <h4 className="font-black text-rose-600 uppercase text-xs mb-4">Información de la Madre</h4>
                        <div className="space-y-4">
                            <div className="form-group"><label className="form-label">Nombre</label><input type="text" className="form-input" value={formData.madre_nombre} onChange={e => setFormData({ ...formData, madre_nombre: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Ocupación</label><input type="text" className="form-input" value={formData.madre_ocupacion} onChange={e => setFormData({ ...formData, madre_ocupacion: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.madre_telefono} onChange={e => setFormData({ ...formData, madre_telefono: e.target.value })} /></div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 bg-slate-50 rounded-2xl border">
                    <button type="submit" className="btn btn-primary px-10" disabled={loading}>
                        {loading ? 'Actualizando...' : 'Guardar Información'}
                    </button>
                </div>
            </form>
        </div>
    );
};
