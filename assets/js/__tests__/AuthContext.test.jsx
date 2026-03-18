import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';
import { mockSupabase } from './setupMocks.jsx';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const TestComponent = () => {
    const { session, profile, loading } = useAuth();
    return (
        <div>
            <div data-testid="loading">{loading ? 'true' : 'false'}</div>
            <div data-testid="session">{session ? session.user.id : 'null'}</div>
            <div data-testid="profile">{profile ? profile.rol : 'null'}</div>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe iniciar en estado de carga (loading = true) y luego pasar a false si no hay sesion', async () => {
        mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Al inicio, podría estar loading en true (el useEffect aún no se resuelve)
        // Luego resolvemos el getSession
        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        expect(screen.getByTestId('session').textContent).toBe('null');
        expect(screen.getByTestId('profile').textContent).toBe('null');
    });

    it('debe cargar la sesión y el perfil si getSession retorna un usuario administrador', async () => {
        const fakeSession = { user: { id: 'user-123' } };
        const fakeProfile = { id: 'user-123', rol: 'admin' };

        mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: fakeSession } });

        // Mock the supabase.from('profiles').select().eq().single() chain
        const mockSingle = vi.fn().mockResolvedValue({ data: fakeProfile, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        expect(screen.getByTestId('session').textContent).toBe('user-123');
        expect(screen.getByTestId('profile').textContent).toBe('admin');
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('debe manejar errores al cargar el perfil y no colapsar', async () => {
        const fakeSession = { user: { id: 'user-error' } };
        mockSupabase.auth.getSession.mockResolvedValueOnce({ data: { session: fakeSession } });

        const mockSingle = vi.fn().mockRejectedValue(new Error('DB Error'));
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
        mockSupabase.from.mockReturnValue({ select: mockSelect });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading').textContent).toBe('false');
        });

        expect(screen.getByTestId('session').textContent).toBe('user-error');
        expect(screen.getByTestId('profile').textContent).toBe('null');
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
