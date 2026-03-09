import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { Layout } from './components/Layout.jsx';
import { LoginPage } from './components/Login.jsx';
import ResetPassword from './components/ResetPassword.jsx';

// Admin Components
import { AdminDashboard } from './components/Admin/Dashboard.jsx';
import { StudentsManager } from './components/Admin/Students.jsx';
import { TeachersManager } from './components/Admin/Teachers.jsx';
import { CoursesManager } from './components/Admin/Courses.jsx';
import { SubjectsManager } from './components/Admin/Subjects.jsx';
import { PaymentsManager } from './components/Admin/Payments.jsx';
import { DiscountsManager } from './components/Admin/Discounts.jsx';
import { ReportsManager } from './components/Admin/Reports.jsx';
import { AcademicYearsManager } from './components/Admin/AcademicYears.jsx';
import { ScaleSettings } from './components/Admin/ScaleSettings.jsx';
import { AchievementSettings } from './components/Admin/AchievementSettings.jsx';
import { BehaviorManagement } from './components/Admin/BehaviorManagement.jsx';
import { ActivitiesManager } from './components/Admin/ActivitiesManager.jsx';

// Teacher Components
import { TeacherDashboard } from './components/Teacher/Dashboard.jsx';
import { TeacherGrades } from './components/Teacher/Grades.jsx';
import { TeacherProfile } from './components/Teacher/Profile.jsx';

// Student Components
import { StudentDashboard } from './components/Student/Dashboard.jsx';
import { StudentProfile } from './components/Student/Profile.jsx';

/**
 * Protector de Rutas: Verifica sesión y roles
 */
const PrivateRoute = ({ children, allowedRoles }) => {
    const { session, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(profile?.rol)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const App = () => {
    const adminNav = [
        {
            links: [{ path: '/admin/dashboard', icon: 'dashboard', label: 'Inicio' }]
        },
        {
            title: 'Académico',
            links: [
                { path: '/admin/anios-academicos', icon: 'event', label: 'Años Académicos' },
                { path: '/admin/escalas', icon: 'grade', label: 'Escala Valorativa' },
                { path: '/admin/logros', icon: 'emoji_events', label: 'Logros Generales' },
                { path: '/admin/comportamiento', icon: 'psychology', label: 'Comportamiento' },
                { path: '/admin/actividades', icon: 'list_alt', label: 'Actividades' },
                { path: '/admin/cursos', icon: 'room_preferences', label: 'Cursos' },
                { path: '/admin/materias', icon: 'menu_book', label: 'Materias' }
            ]
        },
        {
            title: 'Personas',
            links: [
                { path: '/admin/estudiantes', icon: 'child_care', label: 'Estudiantes' },
                { path: '/admin/docentes', icon: 'person_apron', label: 'Docentes' }
            ]
        },
        {
            title: 'Otros',
            links: [
                { path: '/admin/pagos', icon: 'payments', label: 'Pagos' },
                { path: '/admin/descuentos', icon: 'money_off', label: 'Descuentos' },
                { path: '/admin/boletines', icon: 'description', label: 'Boletines' }
            ]
        }
    ];

    const docenteNav = [
        {
            title: 'Principal',
            links: [
                { path: '/docente/dashboard', icon: 'dashboard', label: 'Inicio' },
                { path: '/docente/logros', icon: 'emoji_events', label: 'Logros Generales' },
                { path: '/docente/comportamiento', icon: 'psychology', label: 'Comportamiento' },
                { path: '/docente/actividades', icon: 'list_alt', label: 'Actividades' },
                { path: '/docente/perfil', icon: 'person', label: 'Mi Perfil' }
            ]
        }
    ];

    const estudianteNav = [
        {
            title: 'Principal',
            links: [
                { path: '/estudiante/dashboard', icon: 'analytics', label: 'Calificaciones' },
                { path: '/estudiante/perfil', icon: 'person', label: 'Mis Datos' }
            ]
        }
    ];

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Rutas de Administrador */}
                    <Route path="/admin/*" element={
                        <PrivateRoute allowedRoles={['admin']}>
                            <Layout roleTitle="Administrador" navigation={adminNav}>
                                <Routes>
                                    <Route path="dashboard" element={<AdminDashboard />} />
                                    <Route path="estudiantes" element={<StudentsManager />} />
                                    <Route path="docentes" element={<TeachersManager />} />
                                    <Route path="anios-academicos" element={<AcademicYearsManager />} />
                                    <Route path="escalas" element={<ScaleSettings />} />
                                    <Route path="logros" element={<AchievementSettings />} />
                                    <Route path="comportamiento" element={<BehaviorManagement />} />
                                    <Route path="cursos" element={<CoursesManager />} />
                                    <Route path="materias" element={<SubjectsManager />} />
                                    <Route path="pagos" element={<PaymentsManager />} />
                                    <Route path="actividades" element={<ActivitiesManager />} />
                                    <Route path="descuentos" element={<DiscountsManager />} />
                                    <Route path="boletines" element={<ReportsManager />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </Layout>
                        </PrivateRoute>
                    } />

                    {/* Rutas de Docente */}
                    <Route path="/docente/*" element={
                        <PrivateRoute allowedRoles={['docente']}>
                            <Layout roleTitle="Docente" navigation={docenteNav}>
                                <Routes>
                                    <Route path="dashboard" element={<TeacherDashboard />} />
                                    <Route path="logros" element={<AchievementSettings />} />
                                    <Route path="comportamiento" element={<BehaviorManagement />} />
                                    <Route path="calificaciones/:cursoId" element={<TeacherGrades />} />
                                    <Route path="actividades" element={<ActivitiesManager />} />
                                    <Route path="perfil" element={<TeacherProfile />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </Layout>
                        </PrivateRoute>
                    } />

                    {/* Rutas de Estudiante */}
                    <Route path="/estudiante/*" element={
                        <PrivateRoute allowedRoles={['estudiante']}>
                            <Layout roleTitle="Estudiante" navigation={estudianteNav}>
                                <Routes>
                                    <Route path="dashboard" element={<StudentDashboard />} />
                                    <Route path="perfil" element={<StudentProfile />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </Layout>
                        </PrivateRoute>
                    } />

                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<div className="p-20 text-center font-bold text-slate-800">404 - Página no encontrada</div>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
