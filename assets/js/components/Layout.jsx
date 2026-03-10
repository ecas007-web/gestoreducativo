import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useNavigationGuard } from '../context/NavigationContext.jsx';
import { SCHOOL_NAME, supabase } from '../config.jsx';

export const Layout = ({ children, roleTitle, navigation }) => {
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
    const { isDirty, showConfirmModal, attemptNavigation, confirmNavigation, cancelNavigation } = useNavigationGuard();

    const nombre = `${profile?.nombres || ''} ${profile?.apellidos || ''}`.trim() || profile?.correo || 'Usuario';
    const initial = nombre.charAt(0).toUpperCase();

    const cerrarSesion = async () => {
        attemptNavigation(async () => {
            await signOut();
            window.location.href = '/login';
        });
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} id="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <img src="/images/escudo.png" alt="Logo" className="w-30 h-30 object-contain" />
                    </div>
                    <div className={!sidebarOpen ? 'hidden' : ''}>
                        <div className="sidebar-logo-text">{SCHOOL_NAME || 'Gestor Educativo'}</div>
                        <div className="sidebar-logo-sub">{roleTitle}</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navigation.map((group, idx) => (
                        <React.Fragment key={idx}>
                            {group.title && sidebarOpen && <p className="sidebar-section-title mt-4">{group.title}</p>}
                            {group.links.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={(e) => {
                                        if (window.innerWidth <= 1024) {
                                            setSidebarOpen(false);
                                        }
                                        if (location.pathname.startsWith(link.path)) return;
                                        if (isDirty) {
                                            e.preventDefault();
                                            attemptNavigation(link.path);
                                        }
                                    }}
                                    className={`sidebar-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
                                >
                                    <span className="material-symbols-outlined sidebar-icon">{link.icon}</span>
                                    {sidebarOpen && <span>{link.label}</span>}
                                </Link>
                            ))}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{initial}</div>
                        {sidebarOpen && (
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-name truncate w-32">{nombre}</div>
                                <div className="sidebar-user-role">{roleTitle}</div>
                            </div>
                        )}
                        <button onClick={cerrarSesion} className="ml-auto text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <header className="topbar">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-btn btn btn-ghost btn-sm">
                        <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
                    </button>
                    <div>
                        <div className="topbar-title">Panel de Control</div>
                        <div className="topbar-subtitle">
                            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </header>

                <main className="page-content animate-fadeIn">
                    {children}
                </main>
            </div>

            {/* Sidebar Overlay para Móviles (Solo se muestra en pantallas pequeñas) */}
            {sidebarOpen && window.innerWidth <= 1024 && (
                <div
                    className="sidebar-overlay show"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Modal Global de Confirmación de Navegación */}
            {showConfirmModal && (
                <div className="modal-backdrop">
                    <div className="modal animate-fadeInUp">
                        <div className="modal-header">
                            <h3 className="modal-title flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">warning</span>
                                Cambios sin guardar
                            </h3>
                        </div>
                        <div className="modal-body p-8">
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Tienes cambios realizados que no han sido guardados.
                                <br /><br />
                                ¿Deseas <strong>guardar</strong> los cambios antes de salir o prefieres <strong>cancelarlos</strong>?
                            </p>
                        </div>
                        <div className="modal-footer flex-col sm:flex-row gap-4">
                            <button onClick={cancelNavigation} className="btn btn-ghost w-full sm:w-auto order-3 sm:order-1">
                                Continuar editando
                            </button>
                            <button onClick={() => confirmNavigation(false)} className="btn border border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto order-2 sm:order-2">
                                Descartar cambios
                            </button>
                            <button onClick={() => confirmNavigation(true)} className="btn btn-primary w-full sm:w-auto order-1 sm:order-3 shadow-lg shadow-blue-100">
                                Guardar y Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
