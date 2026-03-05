import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast, formatearMoneda } from '../../utils.jsx';

export const PaymentsManager = () => {
    const [payments, setPayments] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ studentId: '', month: '', status: '' });

    const [formData, setFormData] = useState({ estudiante_id: '', mes: new Date().getMonth() + 1, anio: new Date().getFullYear(), valor: 150000, estado: 'Pagado', observacion: '' });

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [pRes, sRes] = await Promise.all([
            supabase.from('pagos').select('*, estudiantes(nombres, apellidos, numero_documento)').order('created_at', { ascending: false }),
            supabase.from('estudiantes').select('id, nombres, apellidos, numero_documento').order('apellidos')
        ]);
        setPayments(pRes.data || []);
        setStudents(sRes.data || []);
        setLoading(false);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: existe } = await supabase.from('pagos')
                .select('id')
                .match({ estudiante_id: formData.estudiante_id, mes: formData.mes, anio: formData.anio })
                .maybeSingle();

            if (existe) throw new Error('Ya existe un registro de pago para este estudiante en el mes/año seleccionado.');

            const { error } = await supabase.from('pagos').insert([formData]);
            if (error) throw error;

            mostrarToast('Pago registrado correctamente', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(p => {
        const matchesStudent = !filters.studentId || p.estudiante_id == filters.studentId;
        const matchesMonth = !filters.month || p.mes == filters.month;
        const matchesStatus = !filters.status || p.estado === filters.status;
        return matchesStudent && matchesMonth && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Control de Pagos</h2>
                    <p className="text-slate-500">Registra y supervisa las pensiones mensuales de los estudiantes.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    <span className="material-symbols-outlined">add_card</span> Registrar Nuevo Pago
                </button>
            </div>

            <div className="card flex flex-wrap gap-4 items-end">
                <div className="form-group flex-1 min-w-[200px]">
                    <label className="form-label text-[10px] uppercase font-bold text-slate-400">Estudiante</label>
                    <select className="form-input" value={filters.studentId} onChange={e => setFilters({ ...filters, studentId: e.target.value })}>
                        <option value="">Todos los Estudiantes</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.apellidos}, {s.nombres}</option>)}
                    </select>
                </div>
                <div className="form-group w-40">
                    <label className="form-label text-[10px] uppercase font-bold text-slate-400">Mes</label>
                    <select className="form-input" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })}>
                        <option value="">Todos</option>
                        {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div className="form-group w-40">
                    <label className="form-label text-[10px] uppercase font-bold text-slate-400">Estado</label>
                    <select className="form-input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">Todos</option>
                        <option value="Pagado">Pagado</option>
                        <option value="Pendiente">Pendiente</option>
                    </select>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Concepto / Mes</th>
                                <th>Valor</th>
                                <th>Estado</th>
                                <th className="text-right">Fecha Registro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div className="font-bold text-slate-900">{p.estudiantes?.apellidos}, {p.estudiantes?.nombres}</div>
                                        <div className="text-xs text-slate-400">{p.estudiantes?.numero_documento}</div>
                                    </td>
                                    <td><span className="font-medium text-slate-600">Pensión - {meses[p.mes - 1]} {p.anio}</span></td>
                                    <td><span className="font-black text-slate-800">{formatearMoneda(p.valor)}</span></td>
                                    <td><span className={`badge ${p.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}`}>{p.estado}</span></td>
                                    <td className="text-right text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {filteredPayments.length === 0 && (
                                <tr><td colSpan="5" className="text-center py-20 text-slate-400">No hay registros de pagos para estos filtros.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal open">
                    <div className="modal-content animate-zoomIn max-w-lg">
                        <h3 className="text-xl font-black text-slate-800 mb-6">Registrar Recibo de Pago</h3>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Seleccionar Estudiante</label>
                                <select required className="form-input" value={formData.estudiante_id} onChange={e => setFormData({ ...formData, estudiante_id: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.apellidos}, {s.nombres} ({s.numero_documento})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Mes</label>
                                    <select className="form-input" value={formData.mes} onChange={e => setFormData({ ...formData, mes: parseInt(e.target.value) })}>
                                        {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Valor</label>
                                    <input type="number" required className="form-input" value={formData.valor} onChange={e => setFormData({ ...formData, valor: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Observaciones</label>
                                <textarea className="form-input h-20" value={formData.observacion} onChange={e => setFormData({ ...formData, observacion: e.target.value })} placeholder="Ej. Pago en efectivo, transferencia bancaria..."></textarea>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t font-medium">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button type="submit" className="btn btn-primary px-8" disabled={loading}>Guardar Recibo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
