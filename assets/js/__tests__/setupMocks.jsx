import { vi } from 'vitest';

export const mockSupabase = {
    auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        signUp: vi.fn()
    },
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn(),
                maybeSingle: vi.fn()
            }))
        })),
        update: vi.fn(() => ({
            eq: vi.fn()
        }))
    }))
};

vi.mock('../config.jsx', () => ({
    supabase: mockSupabase,
    ADMIN_CREATOR_EMAIL: 'admin@test.com',
    SCHOOL_NAME: 'Test School'
}));
