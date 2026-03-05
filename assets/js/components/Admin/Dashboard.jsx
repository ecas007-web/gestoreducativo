import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config.jsx';

export const AdminDashboard = () => {
    const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, pendingPayments: 0 });
    const [recentStudents, setRecentStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [sts, tch, cur, pay] = await Promise.all([
                supabase.from('estudiantes').select('id', { count: 'exact', head: true }),
                supabase.from('docentes').select('id', { count: 'exact', head: true }),
                supabase.from('cursos').select('id', { count: 'exact', head: true }),
                supabase.from('pagos').select('id', { count: 'exact', head: true }).eq('estado', 'Pendiente')
            ]);

            setStats({
                students: sts.count || 0,
                teachers: tch.count || 0,
                courses: cur.count || 0,
                pendingPayments: pay.count || 0
            });

            const { data: recent } = await supabase
                .from('estudiantes')
                .select('*, cursos(nombre)')
                .order('id', { ascending: false })
                .limit(5);

            setRecentStudents(recent || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-slate-400">Cargando estadísticas...</div>;

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Estudiantes" value={stats.students} icon="groups" color="blue" />
                <StatCard title="Docentes" value={stats.teachers} icon="person_apron" color="emerald" />
                <StatCard title="Cursos" value={stats.courses} icon="room_preferences" color="amber" />
                <StatCard title="Pagos Pendientes" value={stats.pendingPayments} icon="payments" color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Students Table */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Estudiantes Recientes</h3>
                        <button onClick={fetchStats} className="btn btn-ghost btn-sm">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Curso</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentStudents.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="font-bold text-slate-900">{s.nombres} {s.apellidos}</div>
                                            <div className="text-xs text-slate-400">{s.numero_documento}</div>
                                        </td>
                                        <td><span className="badge badge-primary">{s.cursos?.nombre || 'Sin asignar'}</span></td>
                                        <td>
                                            <span className={`badge ${s.registro_completo ? 'badge-success' : 'badge-warning'}`}>
                                                {s.registro_completo ? 'Completo' : 'Pre-registro'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="card bg-slate-900 border-none">
                    <h3 className="text-xl font-bold text-white mb-6">Acceso Rápido</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <QuickLink icon="person_add" label="Pre-registrar Estudiante" path="/admin/estudiantes" />
                        <QuickLink icon="verified_user" label="Asignar Materias" path="/admin/materias" />
                        <QuickLink icon="description" label="Generar Boletines" path="/admin/boletines" />
                        <QuickLink icon="payments" label="Registrar Pago" path="/admin/pagos" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600'
    };
    return (
        <div className="card card-hover flex flex-row items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
                <span className="material-symbols-outlined text-3xl font-light">{icon}</span>
            </div>
            <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
};

const QuickLink = ({ icon, label, path }) => {
    const navigate = useNavigate();
    return (
        <button onClick={() => navigate(path)} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group">
            <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-blue-50 font-medium">{label}</span>
            <span className="material-symbols-outlined ml-auto text-white/20 text-sm">chevron_right</span>
        </button>
    );
};
