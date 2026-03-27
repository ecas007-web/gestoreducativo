import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatearMoneda, nombreMes, mostrarToast } from '../utils.jsx';

describe('Funciones de Utilidad (utils.jsx)', () => {

    describe('formatearMoneda', () => {
        it('debe formatear un número entero correctamente a COP', () => {
            const result = formatearMoneda(150000);
            // El formato exacto depende de la implementación del navegador jsdom, pero debería contener el número formateado
            // Utilizamos una comprobación flexible ya que distintos entornos pueden poner $ o espacio de forma diferente.
            expect(result.replace(/\s+/g, '')).toMatch(/150\.000/);
        });

        it('debe manejar el valor cero correctamente', () => {
            const result = formatearMoneda(0);
            expect(result).toMatch(/0/);
        });
    });

    describe('nombreMes', () => {
        it('debe retornar Enero para el mes 1', () => {
            expect(nombreMes(1)).toBe('Enero');
        });

        it('debe retornar Diciembre para el mes 12', () => {
            expect(nombreMes(12)).toBe('Diciembre');
        });

        it('debe retornar string vacío para meses inválidos', () => {
            expect(nombreMes(13)).toBe('');
            expect(nombreMes(0)).toBe('');
        });
    });

    describe('mostrarToast', () => {
        beforeEach(() => {
            document.body.innerHTML = '';
            vi.useFakeTimers();
        });

        it('debe crear un contenedor toast si no existe y añadir el mensaje', () => {
            mostrarToast('Prueba de éxito', 'success');

            const container = document.getElementById('toast-container');
            expect(container).not.toBeNull();

            const toast = container.querySelector('div');
            expect(toast).not.toBeNull();
            expect(toast.innerHTML).toContain('Prueba de éxito');
            expect(toast.className).toContain('bg-emerald-50'); // Clase de success
        });

        it('debe usar el mismo contenedor para múltiples toasts', () => {
            mostrarToast('Mensaje 1', 'info');
            mostrarToast('Mensaje 2', 'error');

            const containers = document.querySelectorAll('#toast-container');
            expect(containers.length).toBe(1);

            const toasts = containers[0].querySelectorAll('div.flex.items-center');
            expect(toasts.length).toBe(2);
        });

        it('debe eliminar el toast después de hacer clic en cerrar', () => {
            mostrarToast('Cerrar esto', 'info');
            const toast = document.querySelector('#toast-container div');
            const closeBtn = toast.querySelector('.close-toast');

            closeBtn.click();

            // Avanzar temporizadores para simular el setTimeout de 500ms
            vi.advanceTimersByTime(500);

            expect(document.querySelector('#toast-container div')).toBeNull();
        });
    });
});
