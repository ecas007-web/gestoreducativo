import { supabase } from './config.jsx';

/**
 * Muestra un toast de notificación en el DOM
 */
export function mostrarToast(mensaje, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.75rem;';
        document.body.appendChild(container);
    }

    const colores = {
        success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
        error: 'bg-red-50 border-red-400 text-red-800',
        info: 'bg-blue-50 border-blue-400 text-blue-800',
        warning: 'bg-amber-50 border-amber-400 text-amber-800',
    };
    const iconos = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning',
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg text-sm font-medium transition-all duration-300 ${colores[tipo]}`;
    toast.style.cssText = 'min-width:280px;max-width:380px;opacity:0;transform:translateX(20px);';
    toast.innerHTML = `
    <span class="material-symbols-outlined text-xl">${iconos[tipo]}</span>
    <span class="flex-1">${mensaje}</span>
    <button class="ml-2 opacity-60 hover:opacity-100 close-toast">
      <span class="material-symbols-outlined text-base">close</span>
    </button>`;

    container.appendChild(toast);

    // Event listener for close button (inline onclick doesn't work well with ESM sometimes)
    toast.querySelector('.close-toast').addEventListener('click', () => toast.remove());

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

/**
 * Formatea un número como moneda colombiana
 */
export function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
}

/**
 * Obtiene el nombre del mes en español
 */
export function nombreMes(num) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[num - 1] || '';
}

/**
 * Obtiene el perfil del usuario actual (legacy, prefer usedAuth hook)
 */
export async function obtenerPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return data;
}
