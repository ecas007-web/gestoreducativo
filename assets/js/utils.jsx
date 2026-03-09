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
    toast.className = `flex items-center gap-4 px-6 py-5 rounded-2xl border-2 shadow-2xl text-lg font-bold transition-all duration-500 ${colores[tipo]}`;
    toast.style.cssText = 'min-width:340px;max-width:500px;opacity:0;transform:translateY(-20px) scale(0.95);';
    toast.innerHTML = `
    <span class="material-symbols-outlined text-3xl shrink-0">${iconos[tipo]}</span>
    <span class="flex-1 leading-tight">${mensaje}</span>
    <button class="ml-4 p-1 rounded-full hover:bg-black/5 transition-colors close-toast shrink-0">
      <span class="material-symbols-outlined text-xl">close</span>
    </button>`;

    container.appendChild(toast);

    // Event listener for close button
    toast.querySelector('.close-toast').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px) scale(0.95)';
        setTimeout(() => toast.remove(), 500);
    });

    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        }, 10);
    });
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => toast.remove(), 500);
        }
    }, 6000);
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
