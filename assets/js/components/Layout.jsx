import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { SCHOOL_NAME } from '../config.jsx';
import { supabase } from '../config.jsx';

export const Layout = ({ children, roleTitle, navigation }) => {
    const { profile } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const nombre = `${profile?.nombres || ''} ${profile?.apellidos || ''}`.trim() || profile?.correo || 'Usuario';
    const initial = nombre.charAt(0).toUpperCase();

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
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
        </div>
    );
};
