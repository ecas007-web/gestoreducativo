import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useAuth } from '../../AuthContext.jsx';

const MESES = [
    { id: 1, label: 'Enero' }, { id: 2, label: 'Febrero' }, { id: 3, label: 'Marzo' },
    { id: 4, label: 'Abril' }, { id: 5, label: 'Mayo' }, { id: 6, label: 'Junio' },
    { id: 7, label: 'Julio' }, { id: 8, label: 'Agosto' }, { id: 9, label: 'Septiembre' },
    { id: 10, label: 'Octubre' }, { id: 11, label: 'Noviembre' }, { id: 12, label: 'Diciembre' }
];

export const PaymentsManager = () => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('al_dia');
    const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); // mes actual por defecto
    const [anioActivo, setAnioActivo] = useState(null);

    // Data lists
    const [pagosRecientes, setPagosRecientes] = useState([]);
    const [reporteAlDia, setReporteAlDia] = useState([]);
    const [reporteEnMora, setReporteEnMora] = useState([]);
    const [totalIngresos, setTotalIngresos] = useState(0);
    const [totalTransferencia, setTotalTransferencia] = useState(0);
    const [totalEfectivo, setTotalEfectivo] = useState(0);
    const [listaAnios, setListaAnios] = useState([]);

    // Modal de registro
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchHistorial, setSearchHistorial] = useState('');
    const [mesHistorial, setMesHistorial] = useState(''); // '' es Todos
    const [anioHistorial, setAnioHistorial] = useState('');
    const [estudiantesBuscados, setEstudiantesBuscados] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Valor total pensión normal
    const [valorPensionNormal, setValorPensionNormal] = useState(0);

    const initialFormState = {
        id: null,
        estudiante_id: '',
        estudiante_nombre: '',
        descuento_aplicado: 0,
        mes: '',
        monto_maximo_permitido: 0,
        monto: '',
        metodo_pago: 'transferencia',
        fecha_pago: new Date().toISOString().split('T')[0],
        observacion: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        loadBaseData();
    }, []);

    useEffect(() => {
        if (anioActivo && mesFiltro) {
            generarReportes();
        }
    }, [mesFiltro, anioActivo, anioHistorial, mesHistorial, activeTab]);

    const loadBaseData = async () => {
        setLoading(true);
        try {
            const { data: anioData } = await supabase.from('anios_academicos').select('*').eq('estado', true).single();
            const { data: todosAnios } = await supabase.from('anios_academicos').select('*').order('anio', { ascending: false });

            if (anioData) {
                setAnioActivo(anioData);
                setAnioHistorial(anioData.id);
                setValorPensionNormal(Number(anioData.valor_pension || 0));
            }
            if (todosAnios) {
                setListaAnios(todosAnios);
            }
        } catch (err) {
            mostrarToast('Error al cargar datos: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const generarReportes = async () => {
        if (!anioActivo) return;
        setLoading(true);
        try {
            // 1. Obtener todos los estudiantes activos (con su curso)
            const { data: estudiantes, error: estError } = await supabase
                .from('estudiantes')
                .select('id, nombres, apellidos, numero_documento, cursos(nombre)');
            if (estError) throw estError;

            // 2. Obtener todos los descuentos para el año activo
            const { data: descuentos } = await supabase
                .from('descuentos_pensiones')
                .select('estudiante_id, monto_descuento')
                .eq('anio_academico_id', anioActivo.id);
            const descuentosMap = (descuentos || []).reduce((acc, current) => {
                acc[current.estudiante_id] = Number(current.monto_descuento);
                return acc;
            }, {});

            // 3. Obtener pagos del mes y año seleccionados
            const { data: pagosDelMes, error: pagosError } = await supabase
                .from('pagos')
                .select('estudiante_id, monto, fecha_pago, metodo_pago, id')
                .eq('anio_academico_id', anioActivo.id)
                .eq('mes', mesFiltro);
            if (pagosError) throw pagosError;

            // Mapeo pago total e información de método por estudiante en ese mes
            const pagosTotalesMap = (pagosDelMes || []).reduce((acc, current) => {
                if (!acc[current.estudiante_id]) {
                    acc[current.estudiante_id] = { total: 0, metodos: new Set() };
                }
                acc[current.estudiante_id].total += Number(current.monto);
                if (current.metodo_pago) acc[current.estudiante_id].metodos.add(current.metodo_pago);
                return acc;
            }, {});

            // 4. Clasificar Al día vs En mora
            let alDiaList = [];
            let enMoraList = [];
            let ingresosTotales = 0;
            let iTransferencia = 0;
            let iEfectivo = 0;

            // Pre-calcular ingresos por método basados en estudiantes activos
            const estudiantesIds = new Set(estudiantes.map(e => e.id));
            (pagosDelMes || []).forEach(pago => {
                if (estudiantesIds.has(pago.estudiante_id)) {
                    const monto = Number(pago.monto);
                    if (pago.metodo_pago === 'transferencia') iTransferencia += monto;
                    else if (pago.metodo_pago === 'efectivo') iEfectivo += monto;
                }
            });

            estudiantes.forEach(est => {
                const pensionEstudiante = valorPensionNormal - (descuentosMap[est.id] || 0);
                const infoPago = pagosTotalesMap[est.id] || { total: 0, metodos: new Set() };
                const pagoTotalMes = infoPago.total;
                const metodosPago = Array.from(infoPago.metodos).join(', ') || '-';

                // Añadir al total de ingresos (solo sumar los recaudos reales)
                ingresosTotales += pagoTotalMes;

                const estRecord = {
                    ...est,
                    pensionEsperada: pensionEstudiante,
                    pagoRealizado: pagoTotalMes,
                    saldoPendiente: Math.max(0, pensionEstudiante - pagoTotalMes),
                    metodoPago: metodosPago
                };

                // Si pagó igual o más de su pensión esperada, está al día (tolera pequeñas variaciones si es flotante, pero supongamos >=)
                if (pagoTotalMes >= pensionEstudiante) {
                    alDiaList.push(estRecord);
                } else {
                    enMoraList.push(estRecord);
                }
            });

            setReporteAlDia(alDiaList);
            setReporteEnMora(enMoraList);
            setTotalIngresos(ingresosTotales);
            setTotalTransferencia(iTransferencia);
            setTotalEfectivo(iEfectivo);

            // También cargamos el historial de pagos con filtros
            let query = supabase
                .from('pagos')
                .select('id, monto, fecha_pago, metodo_pago, mes, observacion, estudiante_id, estudiantes(nombres, apellidos)')
                .order('created_at', { ascending: false });

            if (anioHistorial) {
                query = query.eq('anio_academico_id', anioHistorial);
            }
            if (mesHistorial !== '') {
                query = query.eq('mes', mesHistorial);
            }

            const { data: todosPagos } = await query;
            setPagosRecientes(todosPagos || []);
        } catch (err) {
            mostrarToast('Error al generar reportes: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPago = (pago) => {
        const estNombre = `${pago.estudiantes?.nombres} ${pago.estudiantes?.apellidos}`;
        setFormData({
            id: pago.id,
            estudiante_id: pago.estudiante_id,
            estudiante_nombre: estNombre,
            descuento_aplicado: 0,
            mes: pago.mes,
            monto_maximo_permitido: 9999999,
            monto: pago.monto,
            metodo_pago: pago.metodo_pago,
            fecha_pago: pago.fecha_pago,
            observacion: pago.observacion || ''
        });
        setShowModal(true);
    };

    const handleDeletePago = async (id) => {
        if (!confirm('¿Está seguro de eliminar este registro de pago? Esta acción no se puede deshacer.')) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('pagos').delete().eq('id', id);
            if (error) throw error;

            mostrarToast('Pago eliminado correctamente', 'success');
            generarReportes();
        } catch (err) {
            mostrarToast('Error al eliminar pago: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const verHistorialEstudiante = (est) => {
        setSearchHistorial(`${est.nombres || ''} ${est.apellidos || ''}`.trim());
        setMesHistorial('');
        setAnioHistorial('');
        setActiveTab('recientes');
    };

    // Autocomplete para el formulario de pago
    useEffect(() => {
        if (searchTerm.length < 3) {
            setEstudiantesBuscados([]);
            return;
        }

        const searchTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Se busca por nombre, apellido o documento, y además traemos el curso para mostrar 'grado'
                const { data, error } = await supabase
                    .from('estudiantes')
                    .select('id, nombres, apellidos, numero_documento, cursos(nombre)')
                    .or(`nombres.ilike.%${searchTerm}%,apellidos.ilike.%${searchTerm}%,numero_documento.ilike.%${searchTerm}%`)
                    .limit(8);

                if (error) throw error;
                // Para traer su descuento inmediatamente, buscarlo también
                if (data && data.length > 0 && anioActivo) {
                    const ids = data.map(d => d.id);
                    const { data: descData } = await supabase.from('descuentos_pensiones').select('estudiante_id, monto_descuento').eq('anio_academico_id', anioActivo.id).in('estudiante_id', ids);
                    const descMap = (descData || []).reduce((acc, cur) => { acc[cur.estudiante_id] = cur.monto_descuento; return acc; }, {});

                    const enrichedData = data.map(est => ({
                        ...est,
                        descuento: Number(descMap[est.id] || 0)
                    }));
                    setEstudiantesBuscados(enrichedData);
                } else {
                    setEstudiantesBuscados(data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [searchTerm, anioActivo]);

    // Recalcular saldo pendiente si cambia el estudiante o el mes
    useEffect(() => {
        const fetchPagosMes = async () => {
            if (!formData.estudiante_id || !formData.mes || !anioActivo) return;
            try {
                // Query pagos para el estudiante en el mes actual
                const { data, error } = await supabase
                    .from('pagos')
                    .select('monto')
                    .eq('estudiante_id', formData.estudiante_id)
                    .eq('anio_academico_id', anioActivo.id)
                    .eq('mes', formData.mes);

                if (error) throw error;
                const totalPagado = (data || []).reduce((sum, p) => sum + Number(p.monto), 0);

                // Si estamos editando, el monto actual NO debe contar contra el máximo
                const montoActualSiEditamos = formData.id ? (pagosRecientes.find(p => p.id === formData.id)?.monto || 0) : 0;
                const totalPagadoSinActual = totalPagado - Number(montoActualSiEditamos);

                const pEsperada = valorPensionNormal - (formData.descuento_aplicado || 0);
                const maxPermitido = Math.max(0, pEsperada - totalPagadoSinActual);

                setFormData(prev => {
                    const debeActualizarMonto = !prev.monto || Number(prev.monto) <= 0;
                    if (prev.monto_maximo_permitido !== maxPermitido || debeActualizarMonto) {
                        return {
                            ...prev,
                            monto_maximo_permitido: maxPermitido,
                            monto: debeActualizarMonto ? maxPermitido : prev.monto
                        };
                    }
                    return prev;
                });
            } catch (err) {
                console.error('Error fetching student payments for month:', err);
            }
        };
        fetchPagosMes();
    }, [formData.estudiante_id, formData.mes, anioActivo, valorPensionNormal, formData.descuento_aplicado]);

    const handleSelectEstudianteParaPago = (est) => {
        const pEsperada = valorPensionNormal - (est.descuento || 0);
        setFormData({
            ...formData,
            estudiante_id: est.id,
            estudiante_nombre: `${est.nombres} ${est.apellidos} - ${est.cursos?.nombre || 'Sin curso'}`,
            descuento_aplicado: est.descuento || 0,
            monto_maximo_permitido: pEsperada,
            monto: '', // Limpiar monto para forzar a que elijan mes y vean el saldo real
            mes: '' // Asegurar que el mes permanezca en blanco al seleccionar estudiante
        });
        setSearchTerm('');
        setEstudiantesBuscados([]);
    };

    const handleRegistrarPago = async (e) => {
        e.preventDefault();
        if (!formData.estudiante_id) return mostrarToast('Seleccione un estudiante', 'warning');
        if (!anioActivo) return mostrarToast('No hay año académico activo', 'warning');
        if (Number(formData.monto) > formData.monto_maximo_permitido) {
            return mostrarToast(`El valor a cancelar no puede ser mayor a la pensión parametrizada (${formData.monto_maximo_permitido})`, 'error');
        }

        setLoading(true);
        try {
            const payload = {
                estudiante_id: formData.estudiante_id,
                anio_academico_id: anioActivo.id,
                mes: parseInt(formData.mes),
                anio: anioActivo.anio,
                monto: parseFloat(formData.monto),
                metodo_pago: formData.metodo_pago,
                fecha_pago: formData.fecha_pago,
                estado: 'pagado',
                observacion: formData.observacion,
                registrado_por: profile.id
            };

            if (formData.id) {
                const { error } = await supabase.from('pagos').update(payload).eq('id', formData.id);
                if (error) throw error;
                mostrarToast('Pago actualizado correctamente', 'success');
            } else {
                const { error } = await supabase.from('pagos').insert([payload]);
                if (error) throw error;
                mostrarToast('Pago registrado correctamente', 'success');
            }

            setShowModal(false);
            generarReportes();
        } catch (err) {
            mostrarToast('Error al procesar pago: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportarMoraExcel = () => {
        if (reporteEnMora.length === 0) return mostrarToast('No hay datos para exportar', 'warning');

        const mesNombre = MESES.find(m => m.id === mesFiltro)?.label || 'Mes';
        const anioNom = anioActivo?.anio || 'Año';

        // Encabezados
        let csvContent = "Grado;Nombre y Apellido;Saldo en Mora;Mes;Año\n";

        // Datos
        reporteEnMora.forEach(est => {
            const nombreCompleto = `${est.nombres} ${est.apellidos}`;
            const grado = est.cursos?.nombre || 'Sin Grado';
            const saldo = est.saldoPendiente;
            csvContent += `${grado};${nombreCompleto};${saldo};${mesNombre};${anioNom}\n`;
        });

        // Crear blob con BOM para Excel (UTF-8)
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `estudiantes_en_mora_${mesNombre}_${anioNom}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Pagos de Pensiones</h2>
                    <p className="text-slate-500">Registra y consulta el estado de cuentas de los estudiantes.</p>
                </div>
                <button onClick={() => {
                    setFormData(initialFormState);
                    setSearchTerm('');
                    setShowModal(true);
                }} className="btn btn-primary">
                    <span className="material-symbols-outlined">payments</span> Registrar Pago
                </button>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-4">
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('al_dia')} className={`px-4 py-2 font-medium text-sm transition-all rounded-md ${activeTab === 'al_dia' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Estudiantes Al Día
                        </button>
                        <button onClick={() => setActiveTab('en_mora')} className={`px-4 py-2 font-medium text-sm transition-all rounded-md ${activeTab === 'en_mora' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Estudiantes En Mora
                        </button>
                        <button onClick={() => setActiveTab('recientes')} className={`px-4 py-2 font-medium text-sm transition-all rounded-md ${activeTab === 'recientes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Todos los Pagos
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab !== 'recientes' && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Mes reporte:</label>
                                <select className="form-input text-sm py-1.5" value={mesFiltro} onChange={(e) => setMesFiltro(Number(e.target.value))}>
                                    {MESES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                </select>
                            </div>
                        )}
                        {activeTab === 'recientes' && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Año:</label>
                                    <select className="form-input text-sm py-1.5" value={anioHistorial} onChange={(e) => setAnioHistorial(e.target.value)}>
                                        <option value="">Todos los años</option>
                                        {listaAnios.map(a => <option key={a.id} value={a.id}>{a.anio}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Mes:</label>
                                    <select className="form-input text-sm py-1.5" value={mesHistorial} onChange={(e) => setMesHistorial(e.target.value === '' ? '' : Number(e.target.value))}>
                                        <option value="">Todos los meses</option>
                                        {MESES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar por estudiante..."
                                        className="form-input text-sm py-1.5 w-64"
                                        value={searchHistorial}
                                        onChange={(e) => setSearchHistorial(e.target.value)}
                                    />
                                    {searchHistorial && (
                                        <button onClick={() => setSearchHistorial('')} className="text-slate-400 hover:text-slate-600">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'al_dia' && (
                            <div className="flex gap-3">
                                <div className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg flex flex-col items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Efectivo</span>
                                    <span className="text-sm font-black">${totalEfectivo.toLocaleString()}</span>
                                </div>
                                <div className="bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg flex flex-col items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transferencia</span>
                                    <span className="text-sm font-black">${totalTransferencia.toLocaleString()}</span>
                                </div>
                                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-lg flex flex-col items-end shadow-sm">
                                    <span className="text-xs font-bold uppercase tracking-wider">Total del Mes</span>
                                    <span className="text-lg font-black">${totalIngresos.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                        {activeTab === 'en_mora' && (
                            <button
                                onClick={exportarMoraExcel}
                                className="btn btn-ghost text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">description</span>
                                Exportar a Excel
                            </button>
                        )}
                    </div>
                </div>

                <div className="table-wrapper">
                    {activeTab === 'al_dia' && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Documento / Grado</th>
                                    <th>Pensión Esperada</th>
                                    <th>Total Pagado (Mes)</th>
                                    <th>Método de Pago</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reporteAlDia.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-500">Ningún estudiante se encuentra al día en este mes.</td></tr>
                                ) : reporteAlDia.map(est => (
                                    <tr key={est.id}>
                                        <td>
                                            <div className="font-bold text-slate-800">{est.nombres} {est.apellidos}</div>
                                        </td>
                                        <td>
                                            <div className="text-sm text-slate-600 font-medium">{est.numero_documento}</div>
                                            <div className="text-xs text-slate-400">{est.cursos?.nombre}</div>
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-500">${est.pensionEsperada.toLocaleString()}</span>
                                        </td>
                                        <td>
                                            <div className="font-bold text-emerald-600">${est.pagoRealizado.toLocaleString()}</div>
                                        </td>
                                        <td>
                                            <span className="text-xs font-medium capitalize text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                {est.metodoPago}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button onClick={() => verHistorialEstudiante(est)} className="btn btn-ghost btn-sm text-blue-600 p-1" title="Ver Historial">
                                                <span className="material-symbols-outlined !text-lg">history</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'en_mora' && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Estudiante</th>
                                    <th>Documento / Grado</th>
                                    <th>Pensión Esperada</th>
                                    <th>Abono del Mes</th>
                                    <th>Saldo en Contra</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reporteEnMora.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-500">No hay estudiantes en mora en este mes.</td></tr>
                                ) : reporteEnMora.map(est => (
                                    <tr key={est.id}>
                                        <td>
                                            <div className="font-bold text-slate-800">{est.nombres} {est.apellidos}</div>
                                        </td>
                                        <td>
                                            <div className="text-sm text-slate-600 font-medium">{est.numero_documento}</div>
                                            <div className="text-xs text-slate-400">{est.cursos?.nombre}</div>
                                        </td>
                                        <td>
                                            <span className="text-sm text-slate-500">${est.pensionEsperada.toLocaleString()}</span>
                                        </td>
                                        <td>
                                            <div className="font-medium text-slate-700">${est.pagoRealizado.toLocaleString()}</div>
                                        </td>
                                        <td>
                                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                                - ${est.saldoPendiente.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button onClick={() => verHistorialEstudiante(est)} className="btn btn-ghost btn-sm text-blue-600 p-1" title="Ver Historial">
                                                <span className="material-symbols-outlined !text-lg">history</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'recientes' && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Método</th>
                                    <th>Estudiante</th>
                                    <th>Mes Pagado</th>
                                    <th>Monto</th>
                                    <th>Obs.</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtrados = pagosRecientes.filter(p => {
                                        const search = searchHistorial.toLowerCase();
                                        const nombres = (p.estudiantes?.nombres || '').toLowerCase();
                                        const apellidos = (p.estudiantes?.apellidos || '').toLowerCase();
                                        return nombres.includes(search) || apellidos.includes(search);
                                    });

                                    if (filtrados.length === 0) {
                                        return <tr><td colSpan="6" className="text-center py-8 text-slate-500">No se encontraron pagos con los filtros seleccionados (Mes, Año, Estudiante).</td></tr>;
                                    }

                                    return filtrados.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div className="text-sm font-medium text-slate-700">{p.fecha_pago}</div>
                                                <div className="text-xs capitalize flex items-center gap-1 text-slate-500 mt-1">
                                                    <span className="material-symbols-outlined text-[14px]">{p.metodo_pago === 'efectivo' ? 'payments' : 'account_balance'}</span>
                                                    {p.metodo_pago}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="font-bold text-slate-800">{p.estudiantes?.nombres} {p.estudiantes?.apellidos}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">{MESES.find(m => m.id === p.mes)?.label}</span>
                                            </td>
                                            <td>
                                                <div className="font-bold text-emerald-600">${Number(p.monto).toLocaleString()}</div>
                                            </td>
                                            <td className="text-slate-500 text-sm max-w-[200px] truncate">{p.observacion || '-'}</td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleEditPago(p)} className="btn btn-ghost btn-sm text-blue-600 p-1" title="Editar Pago">
                                                        <span className="material-symbols-outlined !text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeletePago(p.id)} className="btn btn-ghost btn-sm text-rose-600 p-1" title="Eliminar Pago">
                                                        <span className="material-symbols-outlined !text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Registro de Pago */}
            {
                showModal && (
                    <div className="modal-backdrop z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[1.6rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col w-full max-w-7xl max-h-[90vh] overflow-hidden animate-zoomIn">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Registrar Pago de Pensión</h3>
                                    <p className="text-sm text-slate-500 mt-1">Busque un estudiante y registre su contribución.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm p-1.5 rounded-lg border border-slate-200 transition-colors">
                                    <span className="material-symbols-outlined block">close</span>
                                </button>
                            </div>

                            {/* Body Scrollable Area */}
                            <div className="p-6 overflow-y-auto w-full flex-1 bg-white">
                                <form onSubmit={handleRegistrarPago}>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                        {/* Left Column: Search & Student Info */}
                                        <div className="md:col-span-5 space-y-5">
                                            {!formData.estudiante_id && (
                                                <div className="form-group relative">
                                                    <label className="form-label text-sm">Buscar Estudiante</label>
                                                    <div className="relative shadow-sm rounded-lg">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                                        <input
                                                            type="text"
                                                            className="form-input pl-10 w-full bg-slate-50 focus:bg-white"
                                                            placeholder="Buscar por grado, nombre, documento..."
                                                            value={searchTerm}
                                                            onChange={e => setSearchTerm(e.target.value)}
                                                            autoFocus
                                                        />
                                                        {isSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>}

                                                        {estudiantesBuscados.length > 0 && searchTerm.length >= 3 && (
                                                            <ul className="absolute top-full left-0 z-50 w-full bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] max-h-60 overflow-y-auto divide-y divide-slate-100">
                                                                {estudiantesBuscados.map(est => (
                                                                    <li
                                                                        key={est.id}
                                                                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                                                        onClick={() => handleSelectEstudianteParaPago(est)}
                                                                    >
                                                                        <div className="flex justify-between items-start gap-3">
                                                                            <div>
                                                                                <div className="font-bold text-slate-800 text-base md:text-lg leading-tight">{est.nombres} {est.apellidos}</div>
                                                                                <div className="text-sm text-slate-500 flex flex-wrap gap-2 mt-2">
                                                                                    <span className="bg-slate-100 px-2 rounded text-slate-600 font-medium">{est.numero_documento}</span>
                                                                                    <span className="bg-blue-50 text-blue-700 font-medium px-2 rounded">{est.cursos?.nombre}</span>
                                                                                </div>
                                                                            </div>
                                                                            {est.descuento > 0 && (
                                                                                <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                                    Desc. Aplicado
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-2 text-slate-400 min-h-[120px]">
                                                        <span className="material-symbols-outlined text-4xl opacity-50">person_search</span>
                                                        <span className="text-sm">Utiliza el buscador para encontrar un estudiante registrado en el sistema.</span>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.estudiante_id && (
                                                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl relative overflow-hidden group shadow-sm">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded-full">Estudiante Seleccionado</span>
                                                            <button type="button" onClick={() => setFormData({ ...formData, estudiante_id: '', estudiante_nombre: '' })} className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm transition-colors flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[14px]">refresh</span> Cambiar
                                                            </button>
                                                        </div>
                                                        <h4 className="font-black text-slate-800 text-lg leading-tight mb-4">{formData.estudiante_nombre}</h4>

                                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                            <span className="text-xs font-medium text-slate-500 block mb-1">Pensión Máxima a Cancelar:</span>
                                                            <div className="flex items-end gap-2">
                                                                <span className="text-2xl font-black text-rose-600 leading-none">${formData.monto_maximo_permitido.toLocaleString()}</span>
                                                                {formData.monto_maximo_permitido < valorPensionNormal && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mb-0.5">Descuento activo</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Payment Form */}
                                        <div className={`md:col-span-7 space-y-5 transition-opacity duration-300 ${!formData.estudiante_id ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="form-group">
                                                    <label className="form-label text-sm">Mes a Cancelar</label>
                                                    <select
                                                        className="form-input w-full shadow-sm bg-slate-50 focus:bg-white"
                                                        value={formData.mes}
                                                        onChange={e => setFormData({ ...formData, mes: e.target.value })}
                                                        required
                                                    >
                                                        <option value="" disabled>Seleccione Mes</option>
                                                        {MESES.map(m => (
                                                            <option key={m.id} value={m.id}>{m.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-group relative group">
                                                    <label className="form-label text-sm text-emerald-700">Valor a Registrar</label>
                                                    <div className="relative shadow-sm rounded-lg">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-lg">$</span>
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0"
                                                            max={formData.monto_maximo_permitido > 0 ? formData.monto_maximo_permitido : undefined}
                                                            className="form-input pl-8 w-full font-black text-xl text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-emerald-50/50"
                                                            value={formData.monto}
                                                            onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                                        />
                                                    </div>
                                                    {formData.monto > formData.monto_maximo_permitido && (
                                                        <p className="text-xs text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">error</span>
                                                            El valor excede el saldo actual que es: ${formData.monto_maximo_permitido.toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="form-group">
                                                    <label className="form-label text-sm">Método de Pago</label>
                                                    <select
                                                        className="form-input w-full shadow-sm"
                                                        value={formData.metodo_pago}
                                                        onChange={e => setFormData({ ...formData, metodo_pago: e.target.value })}
                                                        required
                                                    >
                                                        <option value="transferencia">Transferencia Bancaria (o PSE)</option>
                                                        <option value="efectivo">Efectivo Físico</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label text-sm">Fecha de Transacción</label>
                                                    <input
                                                        type="date"
                                                        className="form-input w-full shadow-sm"
                                                        value={formData.fecha_pago}
                                                        onChange={e => setFormData({ ...formData, fecha_pago: e.target.value })}
                                                        max={new Date().toISOString().split('T')[0]}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label text-sm">Observación (Opcional)</label>
                                                <textarea
                                                    className="form-input w-full min-h-[80px] shadow-sm resize-none"
                                                    placeholder="Por ej. Número de aprobación del banco, nombres del depositante real..."
                                                    value={formData.observacion}
                                                    onChange={e => setFormData({ ...formData, observacion: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions - Now part of form inside modal but sticky to bottom if we want, or just at the end */}
                                    <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-slate-100">
                                        <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost border border-slate-200 hover:bg-slate-100">Cancelar Operación</button>
                                        <button type="submit" className="btn btn-primary px-10 shadow-md shadow-blue-500/20" disabled={loading || !formData.estudiante_id || Number(formData.monto) <= 0 || Number(formData.monto) > formData.monto_maximo_permitido}>
                                            <span className="material-symbols-outlined text-lg">{loading ? 'hourglass_empty' : 'check_circle'}</span>
                                            {loading ? 'Procesando...' : 'Confirmar y Registrar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
