import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useNavigationGuard } from '../context/NavigationContext.jsx';
import { SCHOOL_NAME, supabase } from '../config.jsx';

export const Layout = ({ children, roleTitle, navigation }) => {
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { isDirty, showConfirmModal, attemptNavigation, confirmNavigation, cancelNavigation } = useNavigationGuard();

    const [openGroups, setOpenGroups] = useState(() => {
        const initial = {};
        const hasSingleSection = navigation.filter(g => g.title).length === 1;

        navigation.forEach(group => {
            if (group.title) {
                const hasActiveLink = group.links.some(link => location.pathname.startsWith(link.path));
                initial[group.title] = hasActiveLink || hasSingleSection;
            }
        });
        return initial;
    });

    const toggleGroup = (title) => {
        setOpenGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    useEffect(() => {
        const hasSingleSection = navigation.filter(g => g.title).length === 1;
        navigation.forEach(group => {
            if (group.title) {
                const hasActiveLink = group.links.some(link => location.pathname.startsWith(link.path));
                if (hasActiveLink) {
                    setOpenGroups(prev => ({ ...prev, [group.title]: true }));
                } else if (hasSingleSection) {
                    setOpenGroups(prev => ({ ...prev, [group.title]: true }));
                }
            }
        });
    }, [location.pathname, navigation]);

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
                        <img src="/images/escudo.webp" alt="Logo" className="w-30 h-30 object-contain" />
                    </div>
                    <div className={!sidebarOpen ? 'hidden' : ''}>
                        <div className="sidebar-logo-text">{SCHOOL_NAME || 'Gestor Educativo'}</div>
                        <div className="sidebar-logo-sub">{roleTitle}</div>
                    </div>
                </div>

                <nav className="sidebar-nav overflow-y-auto max-h-[calc(100vh-180px)] pr-1 select-none">
                    {navigation.map((group, idx) => {
                        const hasTitle = !!group.title;
                        const isOpen = !hasTitle || !!openGroups[group.title];

                        return (
                            <div key={idx} className="sidebar-group w-full">
                                {hasTitle && sidebarOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.title)}
                                        className="sidebar-section-title w-full flex items-center justify-between text-left hover:text-slate-300 transition-colors duration-150 py-3 mt-2 border-none bg-transparent cursor-pointer font-bold uppercase tracking-wider text-[1.2rem]"
                                    >
                                        <span>{group.title}</span>
                                        <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                                            keyboard_arrow_down
                                        </span>
                                    </button>
                                ) : (
                                    hasTitle && <div className="h-px bg-slate-800/60 my-3" />
                                )}

                                <div className={`space-y-1 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
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
                                            <span className="sidebar-label">{link.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{initial}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name truncate w-32">{nombre}</div>
                            <div className="sidebar-user-role">{roleTitle}</div>
                        </div>
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
