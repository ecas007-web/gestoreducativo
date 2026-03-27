import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App.jsx';

// Mockeamos el hook useAuth completo para poder controlar el contexto sin depender de la DB en este test
vi.mock('../AuthContext.jsx', () => ({
    AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
    useAuth: vi.fn()
}));

// Mock components to prevent deep rendering and focus on routing
vi.mock('../components/Login.jsx', () => ({ LoginPage: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../components/Admin/Dashboard.jsx', () => ({ AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div> }));
vi.mock('../components/Teacher/Dashboard.jsx', () => ({ TeacherDashboard: () => <div data-testid="teacher-dashboard">Teacher Dashboard</div> }));
vi.mock('../components/Student/Dashboard.jsx', () => ({ StudentDashboard: () => <div data-testid="student-dashboard">Student Dashboard</div> }));

// We also need to mock Layout since it does rendering based on auth
vi.mock('../components/Layout.jsx', () => ({
    Layout: ({ children }) => <div data-testid="layout">{children}</div>
}));

import { useAuth } from '../AuthContext.jsx';

describe('App Routing e Integración de PrivateRoute', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe mostrar pantalla de carga cuando el contexto está cargando', () => {
        useAuth.mockReturnValue({ loading: true, session: null, profile: null });
        window.history.pushState({}, 'Test', '/admin/dashboard');

        render(<App />);

        expect(screen.getByText(/Verificando acceso.../i)).toBeInTheDocument();
    });

    it('debe redirigir al login si no hay sesión al intentar acceder ruta protegida', () => {
        useAuth.mockReturnValue({ loading: false, session: null, profile: null });
        window.history.pushState({}, 'Test', '/admin/dashboard');

        render(<App />);

        // Al redirigir a /login, debe renderizar la página de login mockeada
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('debe redirigir al login si la sesión existe pero el rol no es el permitido', () => {
        // Usuario con rol 'estudiante' intentando ir a '/admin/dashboard'
        useAuth.mockReturnValue({
            loading: false,
            session: { user: { id: 'est-1' } },
            profile: { rol: 'estudiante' }
        });
        window.history.pushState({}, 'Test', '/admin/dashboard');

        render(<App />);

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('debe renderizar el dashboard de admin si el usuario es administrador', () => {
        useAuth.mockReturnValue({
            loading: false,
            session: { user: { id: 'admin-1' } },
            profile: { rol: 'admin' }
        });
        window.history.pushState({}, 'Test', '/admin/dashboard');

        render(<App />);

        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });

    it('debe renderizar la página 404 para una ruta inválida', () => {
        useAuth.mockReturnValue({ loading: false, session: null, profile: null });
        window.history.pushState({}, 'Test', '/ruta-inexistente');

        render(<App />);

        expect(screen.getByText(/404 - Página no encontrada/i)).toBeInTheDocument();
    });

});
