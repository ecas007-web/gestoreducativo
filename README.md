# 🏫 Gestor Educativo - Jardín Infantil "Mis Pequeños Genios"

Este proyecto es una aplicación web integral diseñada para la gestión académica y administrativa de un jardín infantil. Permite el control de estudiantes, docentes, calificaciones, comportamientos, pagos de pensiones y generación de boletines/certificados.

## 🚀 Tecnologías Utilizadas

- **Frontend**: React.js con Vite.
- **Estilos**: TailwindCSS y CSS3 (Diseño premium y responsive).
- **Backend**: Supabase (PostgreSQL + Auth + Storage).
- **Librerías Clave**:
  - `react-router-dom`: Gestión de navegación.
  - `docxtemplater` & `pizzip`: Generación de documentos Word (.docx).
  - `xlsx`: Exportación de datos a Excel.
  - `lucide-react` / Material Symbols: Iconografía.

## 📋 Funcionalidades Principales

### 🔐 Autenticación y Roles
- **Administrador**: Control total del sistema (Cursos, Materias, Docentes, Estudiantes, Pagos, Años Académicos).
- **Docente**: Registro de calificaciones por logros, gestión de comportamiento y observador del alumno.
- **Estudiante**: Consulta de calificaciones, logros y estado de cuenta (pensiones).

### 🛠️ Módulos Administrativos
- **Gestión de Estudiantes**: Registro completo con datos básicos y familiares. Control de estado (Activo/Retirado).
- **Control de Pagos**: Registro de pensiones mensuales, control de mora y descuentos especiales.
- **Parametrización**: Configuración de años académicos, periodos (abiertos/cerrados) y escalas valorativas.
- **Generación de Reportes**: Boletines periódicos, certificados estudiantiles y observador del alumno mediante plantillas Word.

### 📝 Gestión Académica
- **Calificaciones por Logros**: Cálculo automático de promedios y asignación de escala cualitativa basada en verbos configurables.
- **Comportamiento**: Registro de conducta por periodo.
- **Observador**: Seguimiento de fortalezas, debilidades y estrategias pedagógicas.

## ⚙️ Configuración del Entorno

Para ejecutar este proyecto localmente, sigue estos pasos:

### 1. Requisitos Previos
- Node.js (v18 o superior).
- Una cuenta en [Supabase](https://supabase.com/).

### 2. Instalación
Clona el repositorio y ejecuta:
```bash
npm install
```

### 3. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con las siguientes claves:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 4. Base de Datos (Supabase)
Asegúrate de tener las tablas necesarias en Supabase. Si has agregado la funcionalidad de **Estado del Estudiante**, ejecuta este SQL en el editor de Supabase:
```sql
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado'));
```

## 🛠️ Ejecución

### Modo Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### Construcción para Producción
```bash
npm run build
```

## 📂 Estructura del Proyecto

- `assets/js/components/`: Componentes React divididos por roles (Admin, Teacher, Student).
- `assets/js/config.jsx`: Configuración del cliente Supabase.
- `assets/js/utils.jsx`: Funciones de utilidad y notificaciones.
- `public/plantillas/`: Plantillas `.docx` para la generación de reportes.
- `AGENTS.md`: Documentación técnica detallada de los agentes y reglas de negocio.

---
Desarrollado con ❤️ para la gestión educativa moderna.
