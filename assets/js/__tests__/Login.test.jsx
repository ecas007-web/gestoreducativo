import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '../components/Login.jsx';
import { mockSupabase } from './setupMocks.jsx';

// Mock dependencias externas
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

const mockSetProfile = vi.fn();
vi.mock('../AuthContext.jsx', () => ({
    useAuth: () => ({ setProfile: mockSetProfile })
}));

vi.mock('../utils.jsx', () => ({
    mostrarToast: vi.fn()
}));

import { mostrarToast } from '../utils.jsx';

describe('LoginPage Integración', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el formulario de login por defecto', () => {
        render(<LoginPage />);

        expect(screen.getByText('¡Hola de nuevo!')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('ejemplo@correo.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Docente')).toBeInTheDocument();
        expect(screen.getByText('Estudiante')).toBeInTheDocument();
    });

    it('debe iniciar sesión exitosamente y navegar al dashboard', async () => {
        // Mock de signInWithPassword success
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: { id: 'admin-123' } },
            error: null
        });

        // Mock profile fetch success y rol coincidente (por defecto admin)
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'admin-123', rol: 'admin' }, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        render(<LoginPage />);

        // Simular entrada
        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), { target: { value: 'admin@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

        await waitFor(() => {
            expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'admin@test.com',
                password: 'password123'
            });
            expect(mockSetProfile).toHaveBeenCalledWith({ id: 'admin-123', rol: 'admin' });
            expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
            expect(mostrarToast).toHaveBeenCalledWith('Bienvenido, acceso como admin', 'success');
        });
    });

    it('debe fallar inicio de sesión si el perfil en BD tiene otro rol', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null
        });

        // Simular que el usuario es estudiante en la BD, pero intenta entrar como admin (default role selected)
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'user-123', rol: 'estudiante' }, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        render(<LoginPage />);

        fireEvent.change(screen.getByPlaceholderText('ejemplo@correo.com'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));

        await waitFor(() => {
            expect(mockSupabase.auth.signOut).toHaveBeenCalled();
            expect(mostrarToast).toHaveBeenCalledWith('El usuario no tiene el rol seleccionado.', 'error');
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    it('debe cambiar a la vista de registro estudiantil al clicar el enlace correspondiente', () => {
        render(<LoginPage />);

        const registerButton = screen.getByText('Completar Registro Estudiante');
        fireEvent.click(registerButton);

        expect(screen.getByText('Completar Registro Estudiante', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText('Verificar Datos')).toBeInTheDocument();
        expect(screen.queryByText('Iniciar Sesión')).not.toBeInTheDocument();
    });

});
