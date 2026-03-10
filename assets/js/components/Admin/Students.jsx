import React, { useState, useEffect } from 'react';
import { supabase } from '../../config.jsx';
import { mostrarToast } from '../../utils.jsx';
import { useAuth } from '../../AuthContext.jsx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

export const StudentsManager = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.rol === 'admin';
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [years, setYears] = useState([]);
    const [activeYear, setActiveYear] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id: null, nombres: '', apellidos: '', tipo_documento: 'RC', numero_documento: '',
        curso_id: '', anio_academico_id: '', fecha_nac: '', sexo: '', lugar_nacimiento: '',
        direccion: '', correo: '', telefono: '', celular: '', eps: '', tipo_sangre: '',
        documento_padre: '', nombre_padre: '', ocupacion_padre: '', telefono_padre: '',
        nombre_madre: '', documento_madre: '', ocupacion_madre: '', telefono_madre: '',
        religion: '', debilidades: '', fortalezas: ''
    });
    const [filters, setFilters] = useState({ query: '', courseId: '', status: '', anioId: '' });
    const [generatingCert, setGeneratingCert] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [stRes, crRes, anRes] = await Promise.all([
            supabase.from('estudiantes').select('*, cursos(nombre)').order('apellidos'),
            supabase.from('cursos').select('*').order('nombre'),
            supabase.from('anios_academicos').select('*').order('anio', { ascending: false })
        ]);

        const loadedYears = anRes.data || [];
        const currentActive = loadedYears.find(y => y.estado);

        setStudents(stRes.data || []);
        setCourses(crRes.data || []);
        setYears(loadedYears);
        setActiveYear(currentActive);

        // If no filter selected, default to active year
        setFilters(prev => ({ ...prev, anioId: prev.anioId || currentActive?.id || '' }));
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            delete payload.id;
            // Clean empty strings for database
            Object.keys(payload).forEach(key => {
                if (payload[key] === '') payload[key] = null;
            });

            if (formData.id) {
                const { error } = await supabase.from('estudiantes').update(payload).eq('id', formData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('estudiantes').insert([payload]);
                if (error) throw error;
            }
            mostrarToast('Estudiante guardado correctamente', 'success');
            setShowModal(false);
            loadData();
        } catch (err) {
            mostrarToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const name = (s.nombres || '') + ' ' + (s.apellidos || '');
        const doc = s.numero_documento || '';
        const matchesQuery = (name + doc).toLowerCase().includes(filters.query.toLowerCase());
        const matchesCourse = !filters.courseId || s.curso_id == filters.courseId;
        const matchesStatus = !filters.status || (filters.status === 'complete' ? s.registro_completo : !s.registro_completo);
        const matchesYear = !filters.anioId || s.anio_academico_id == filters.anioId;
        return matchesQuery && matchesCourse && matchesStatus && matchesYear;
    });

    const handleOpenModal = (student = null) => {
        if (student) {
            setFormData({
                id: student.id,
                nombres: student.nombres || '',
                apellidos: student.apellidos || '',
                tipo_documento: student.tipo_documento || 'RC',
                numero_documento: student.numero_documento || '',
                curso_id: student.curso_id || '',
                anio_academico_id: student.anio_academico_id || '',
                fecha_nac: student.fecha_nac || '',
                sexo: student.sexo || '',
                lugar_nacimiento: student.lugar_nacimiento || '',
                direccion: student.direccion || '',
                correo: student.correo || '',
                telefono: student.telefono || '',
                celular: student.celular || '',
                eps: student.eps || '',
                tipo_sangre: student.tipo_sangre || '',
                documento_padre: student.documento_padre || '',
                nombre_padre: student.nombre_padre || '',
                ocupacion_padre: student.ocupacion_padre || '',
                telefono_padre: student.telefono_padre || '',
                nombre_madre: student.nombre_madre || '',
                documento_madre: student.documento_madre || '',
                ocupacion_madre: student.ocupacion_madre || '',
                telefono_madre: student.telefono_madre || '',
                religion: student.religion || '',
                debilidades: student.debilidades || '',
                fortalezas: student.fortalezas || ''
            });
        } else {
            setFormData({
                id: null, nombres: '', apellidos: '', tipo_documento: 'RC', numero_documento: '',
                curso_id: '', anio_academico_id: activeYear?.id || '', fecha_nac: '', sexo: '', lugar_nacimiento: '',
                direccion: '', correo: '', telefono: '', celular: '', eps: '', tipo_sangre: '',
                documento_padre: '', nombre_padre: '', ocupacion_padre: '', telefono_padre: '',
                nombre_madre: '', documento_madre: '', ocupacion_madre: '', telefono_madre: '',
                religion: '', debilidades: '', fortalezas: ''
            });
        }
        setShowModal(true);
    };

    const generateCertificate = async (student) => {
        setGeneratingCert(student.id);
        try {
            const response = await fetch('/plantillas/plantilla_certificado.docx');
            if (!response.ok) throw new Error('No se pudo cargar la plantilla del certificado');

            const content = await response.arrayBuffer();
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '%', end: '%' }
            });

            // Formatear fecha actual
            const fechaActual = new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const data = {
                'apellidos y nombre': `${student.apellidos} ${student.nombres}`.toUpperCase(),
                'documento': `${student.tipo_documento} ${student.numero_documento}`,
                'grado': student.cursos?.nombre || 'N/A',
                'año': activeYear?.anio || new Date().getFullYear(),
                'fecha actual': fechaActual
            };

            doc.render(data);

            const out = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            saveAs(out, `Certificado_${student.apellidos}_${student.nombres}.docx`);
            mostrarToast('Certificado generado correctamente', 'success');
        } catch (err) {
            console.error(err);
            mostrarToast('Error al generar el certificado: ' + err.message, 'error');
        } finally {
            setGeneratingCert(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Gestión de Estudiantes</h2>
                    <p className="text-slate-500">Administra los perfiles completos de los alumnos.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => handleOpenModal()} className="btn btn-primary">
                        <span className="material-symbols-outlined">person_add</span> Pre-registrar Estudiante
                    </button>
                )}
            </div>

            <div className="card flex flex-col md:flex-row gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <input type="text" className="form-input" placeholder="Buscar por nombre o documento..." value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} />
                </div>
                <select className="form-input md:w-40" value={filters.anioId} onChange={e => setFilters({ ...filters, anioId: e.target.value })}>
                    <option value="">Todos los Años</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.anio} {y.estado ? '(Activo)' : ''}</option>)}
                </select>
                <select className="form-input md:w-48" value={filters.courseId} onChange={e => setFilters({ ...filters, courseId: e.target.value })}>
                    <option value="">Todos los Cursos</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <select className="form-input md:w-48" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">Todos los Estados</option>
                    <option value="pending">Pre-registro</option>
                    <option value="complete">Completo</option>
                </select>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="table-wrapper overflow-x-auto">
                    <table className="data-table whitespace-nowrap">
                        <thead>
                            <tr>
                                <th className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Estudiante</th>
                                <th>Identificación</th>
                                <th>Curso</th>
                                <th>Datos Personales</th>
                                <th>Contacto</th>
                                <th>Padre</th>
                                <th>Madre</th>
                                <th>Estado</th>
                                <th className="text-left sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] px-8">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(s => (
                                <tr key={s.id}>
                                    <td className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                        <div className="font-bold text-slate-900">{s.nombres} {s.apellidos}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.tipo_documento} {s.numero_documento}</div>
                                    </td>
                                    <td>
                                        <div className="text-sm font-medium">{s.tipo_documento} {s.numero_documento}</div>
                                        <div className="text-xs text-slate-400">{s.fecha_nac ? new Date(s.fecha_nac).toLocaleDateString() : 'Sin fecha'}</div>
                                    </td>
                                    <td><span className="badge badge-primary">{s.cursos?.nombre || 'Sin asignar'}</span></td>
                                    <td className="text-xs">
                                        <div className="font-bold">{s.sexo === 'M' ? 'Masculino' : s.sexo === 'F' ? 'Femenino' : 'N/A'}</div>
                                        <div>RH: {s.tipo_sangre || 'S/G'}</div>
                                        <div className="text-slate-400">{s.lugar_nacimiento || 'S/L'}</div>
                                    </td>
                                    <td className="text-xs">
                                        <div className="font-medium">{s.celular || s.telefono || 'Sin tel.'}</div>
                                        <div className="text-slate-400">{s.correo || 'Sin correo'}</div>
                                        <div className="text-[10px] truncate max-w-[120px]">{s.direccion || 'Sin dir.'}</div>
                                    </td>
                                    <td className="text-xs">
                                        <div className="font-bold">{s.nombre_padre || 'Sin datos'}</div>
                                        <div className="text-slate-400">{s.telefono_padre || s.documento_padre || '-'}</div>
                                        <div className="italic text-[10px]">{s.ocupacion_padre || '-'}</div>
                                    </td>
                                    <td className="text-xs">
                                        <div className="font-bold">{s.nombre_madre || 'Sin datos'}</div>
                                        <div className="text-slate-400">{s.telefono_madre || s.documento_madre || '-'}</div>
                                        <div className="italic text-[10px]">{s.ocupacion_madre || '-'}</div>
                                    </td>

                                    <td>
                                        <span className={`badge ${s.registro_completo ? 'badge-success' : 'badge-warning'}`}>
                                            {s.registro_completo ? 'Completo' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="text-left sticky right-0 bg-white z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] px-8">
                                        <div className="flex justify-start gap-6">
                                            <button
                                                onClick={() => generateCertificate(s)}
                                                className={`btn btn-ghost text-emerald-600 hover:bg-emerald-50 w-16 h-16 p-0 flex items-center justify-center rounded-2xl transition-all shadow-sm border border-emerald-100 ${generatingCert === s.id ? 'animate-pulse' : ''}`}
                                                title="Generar Certificado"
                                                disabled={generatingCert === s.id}
                                            >
                                                {generatingCert === s.id ? (
                                                    <span className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                                                ) : (
                                                    <span className="material-symbols-outlined !text-5xl">description</span>
                                                )}
                                            </button>

                                            {isAdmin ? (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenModal(s)}
                                                        className="btn btn-ghost text-blue-600 hover:bg-blue-50 w-16 h-16 p-0 flex items-center justify-center rounded-2xl transition-all shadow-sm border border-blue-100"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined !text-5xl">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={async () => { if (confirm('¿Eliminar estudiante?')) { await supabase.from('estudiantes').delete().eq('id', s.id); loadData(); } }}
                                                        className="btn btn-ghost text-rose-600 hover:bg-rose-50 w-16 h-16 p-0 flex items-center justify-center rounded-2xl transition-all shadow-sm border border-rose-100"
                                                        title="Eliminar"
                                                    >
                                                        <span className="material-symbols-outlined !text-5xl">delete</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 flex items-center justify-center opacity-20 cursor-not-allowed bg-slate-100 rounded-2xl border border-slate-200" title="Sin permisos de edición">
                                                        <span className="material-symbols-outlined !text-5xl">edit</span>
                                                    </div>
                                                    <div className="w-16 h-16 flex items-center justify-center opacity-20 cursor-not-allowed bg-slate-100 rounded-2xl border border-slate-200" title="Sin permisos para eliminar">
                                                        <span className="material-symbols-outlined !text-5xl">delete</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr><td colSpan="11" className="text-center py-20 text-slate-400">No se encontraron estudiantes.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp !max-w-6xl">
                        <div className="modal-header">
                            <h3 className="modal-title">{formData.id ? 'Editar Estudiante' : 'Pre-registrar Estudiante'}</h3>
                            <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body max-h-[70vh] overflow-y-auto">
                            <form id="studentForm" onSubmit={handleSubmit} className="space-y-8">
                                {/* Datos Básicos */}
                                <section>
                                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Datos Básicos</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="form-group"><label className="form-label">Nombres</label><input type="text" required className="form-input" value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Apellidos</label><input type="text" required className="form-input" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="form-group">
                                                <label className="form-label">Tipo Doc.</label>
                                                <select className="form-input" value={formData.tipo_documento} onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}>
                                                    <option value="RC">RC</option><option value="TI">TI</option>
                                                </select>
                                            </div>
                                            <div className="form-group"><label className="form-label">Número</label><input type="text" required className="form-input" value={formData.numero_documento} onChange={e => setFormData({ ...formData, numero_documento: e.target.value })} /></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                        <div className="form-group"><label className="form-label">Fecha Nacimiento</label><input type="date" className="form-input" value={formData.fecha_nac} onChange={e => setFormData({ ...formData, fecha_nac: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Lugar Nacimiento</label><input type="text" className="form-input" value={formData.lugar_nacimiento} onChange={e => setFormData({ ...formData, lugar_nacimiento: e.target.value })} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="form-group">
                                                <label className="form-label">Sexo</label>
                                                <select className="form-input" value={formData.sexo} onChange={e => setFormData({ ...formData, sexo: e.target.value })}>
                                                    <option value="">Seleccione</option><option value="M">Masculino</option><option value="F">Femenino</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">T. Sangre</label>
                                                <select className="form-input" value={formData.tipo_sangre} onChange={e => setFormData({ ...formData, tipo_sangre: e.target.value })}>
                                                    <option value="">Seleccione</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Contacto y Salud */}
                                <section>
                                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Contacto y Otros</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="form-group"><label className="form-label">Dirección</label><input type="text" className="form-input" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Correo Electrónico</label><input type="email" className="form-input" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                        <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Celular</label><input type="text" className="form-input" value={formData.celular} onChange={e => setFormData({ ...formData, celular: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">EPS</label><input type="text" className="form-input" value={formData.eps} onChange={e => setFormData({ ...formData, eps: e.target.value })} /></div>
                                        <div className="form-group"><label className="form-label">Religión</label><input type="text" className="form-input" value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} /></div>
                                    </div>
                                </section>

                                {/* Información de los Padres */}
                                <section>
                                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Información de los Padres</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Datos del Padre</p>
                                            <div className="form-group"><label className="form-label">Nombre Completo</label><input type="text" className="form-input" value={formData.nombre_padre} onChange={e => setFormData({ ...formData, nombre_padre: e.target.value })} /></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="form-group"><label className="form-label">Identificación</label><input type="text" className="form-input" value={formData.documento_padre} onChange={e => setFormData({ ...formData, documento_padre: e.target.value })} /></div>
                                                <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.telefono_padre} onChange={e => setFormData({ ...formData, telefono_padre: e.target.value })} /></div>
                                            </div>
                                            <div className="form-group"><label className="form-label">Ocupación</label><input type="text" className="form-input" value={formData.ocupacion_padre} onChange={e => setFormData({ ...formData, ocupacion_padre: e.target.value })} /></div>
                                        </div>
                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                                            <p className="text-xs font-bold text-slate-400 uppercase">Datos de la Madre</p>
                                            <div className="form-group"><label className="form-label">Nombre Completo</label><input type="text" className="form-input" value={formData.nombre_madre} onChange={e => setFormData({ ...formData, nombre_madre: e.target.value })} /></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="form-group"><label className="form-label">Identificación</label><input type="text" className="form-input" value={formData.documento_madre} onChange={e => setFormData({ ...formData, documento_madre: e.target.value })} /></div>
                                                <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={formData.telefono_madre} onChange={e => setFormData({ ...formData, telefono_madre: e.target.value })} /></div>
                                            </div>
                                            <div className="form-group"><label className="form-label">Ocupación</label><input type="text" className="form-input" value={formData.ocupacion_madre} onChange={e => setFormData({ ...formData, ocupacion_madre: e.target.value })} /></div>
                                        </div>
                                    </div>
                                </section>

                                {/* Académico y Observaciones */}
                                <section>
                                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 border-b pb-1">Académico y Observaciones</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="form-group">
                                            <label className="form-label">Año Académico</label>
                                            <select required className="form-input" value={formData.anio_academico_id} onChange={e => setFormData({ ...formData, anio_academico_id: e.target.value })}>
                                                <option value="">Seleccionar Año</option>
                                                {years.filter(y => y.estado || y.id === formData.anio_academico_id).map(y => (
                                                    <option key={y.id} value={y.id}>{y.anio} {y.estado ? '(Activo)' : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Curso Inicial</label>
                                            <select required className="form-input" value={formData.curso_id} onChange={e => setFormData({ ...formData, curso_id: e.target.value })}>
                                                <option value="">Seleccionar Curso</option>
                                                {courses.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="form-group"><label className="form-label">Debilidades</label><textarea className="form-input h-20" value={formData.debilidades} onChange={e => setFormData({ ...formData, debilidades: e.target.value })} placeholder="Aspectos a mejorar..."></textarea></div>
                                        <div className="form-group"><label className="form-label">Fortalezas</label><textarea className="form-input h-20" value={formData.fortalezas} onChange={e => setFormData({ ...formData, fortalezas: e.target.value })} placeholder="Habilidades y capacidades..."></textarea></div>
                                    </div>
                                </section>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
                            <button type="submit" form="studentForm" className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Estudiante'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
