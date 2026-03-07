-- BACKUP DEL ESQUEMA DE BASE DE DATOS - GESTOR EDUCATIVO
-- Generado manualmente para migración entre proyectos de Supabase

-- 1. TIPOS PERSONALIZADOS (ENUMS)
DO $$ BEGIN
    CREATE TYPE public.rol_usuario AS ENUM ('admin', 'docente', 'estudiante');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tipo_documento AS ENUM ('CC', 'TI', 'RC', 'CE', 'PA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.periodo_tipo AS ENUM ('P1', 'P2', 'P3', 'P4');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. FUNCIONES
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT rol::TEXT FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    correo, 
    rol, 
    nombres, 
    apellidos, 
    tipo_documento, 
    numero_documento
  )
  VALUES (
    NEW.id,
    NEW.email,
    (COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante'))::public.rol_usuario,
    NEW.raw_user_meta_data->>'nombres',
    NEW.raw_user_meta_data->>'apellidos',
    (NEW.raw_user_meta_data->>'tipo_documento')::public.tipo_documento,
    NEW.raw_user_meta_data->>'numero_documento'
  );
  RETURN NEW;
END;
$function$;

-- 3. TABLAS

-- Años Académicos
CREATE TABLE IF NOT EXISTS public.anios_academicos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    anio integer NOT NULL,
    estado boolean NOT NULL DEFAULT false,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    valor_pension numeric DEFAULT 0,
    CONSTRAINT anios_academicos_pkey PRIMARY KEY (id),
    CONSTRAINT anios_academicos_anio_key UNIQUE (anio)
);

-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    correo text NOT NULL,
    rol public.rol_usuario NOT NULL DEFAULT 'estudiante'::public.rol_usuario,
    tipo_documento public.tipo_documento,
    numero_documento text,
    nombres text,
    apellidos text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cursos_pkey PRIMARY KEY (id),
    CONSTRAINT cursos_nombre_key UNIQUE (nombre)
);

-- Materias
CREATE TABLE IF NOT EXISTS public.materias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT materias_pkey PRIMARY KEY (id),
    CONSTRAINT materias_nombre_key UNIQUE (nombre)
);

-- Relación Curso - Materias
CREATE TABLE IF NOT EXISTS public.curso_materias (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_id uuid NOT NULL,
    materia_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT curso_materias_pkey PRIMARY KEY (id),
    CONSTRAINT curso_materias_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
    CONSTRAINT curso_materias_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id),
    CONSTRAINT curso_materias_curso_id_materia_id_key UNIQUE (curso_id, materia_id)
);

-- Estudiantes
CREATE TABLE IF NOT EXISTS public.estudiantes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    tipo_documento public.tipo_documento NOT NULL,
    numero_documento text NOT NULL,
    nombres text NOT NULL,
    apellidos text NOT NULL,
    correo text,
    curso_id uuid,
    direccion text,
    telefono text,
    tipo_sangre text,
    nombre_madre text,
    nombre_padre text,
    ocupacion_madre text,
    ocupacion_padre text,
    documento_madre text,
    documento_padre text,
    telefono_madre text,
    telefono_padre text,
    preregistro_completo boolean DEFAULT false,
    registro_completo boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    anio_academico_id uuid NOT NULL,
    CONSTRAINT estudiantes_pkey PRIMARY KEY (id),
    CONSTRAINT estudiantes_numero_documento_key UNIQUE (numero_documento),
    CONSTRAINT estudiantes_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
    CONSTRAINT estudiantes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT estudiantes_anio_academico_id_fkey FOREIGN KEY (anio_academico_id) REFERENCES public.anios_academicos(id)
);

-- Docentes
CREATE TABLE IF NOT EXISTS public.docentes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    tipo_documento public.tipo_documento NOT NULL,
    numero_documento text NOT NULL,
    nombres text NOT NULL,
    apellidos text NOT NULL,
    correo text NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT docentes_pkey PRIMARY KEY (id),
    CONSTRAINT docentes_correo_key UNIQUE (correo),
    CONSTRAINT docentes_numero_documento_key UNIQUE (numero_documento),
    CONSTRAINT docentes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Relación Docente - Cursos
CREATE TABLE IF NOT EXISTS public.docente_cursos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    docente_id uuid NOT NULL,
    curso_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT docente_cursos_pkey PRIMARY KEY (id),
    CONSTRAINT docente_cursos_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
    CONSTRAINT docente_cursos_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id),
    CONSTRAINT docente_cursos_docente_id_curso_id_key UNIQUE (docente_id, curso_id)
);

-- Calificaciones
CREATE TABLE IF NOT EXISTS public.calificaciones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id uuid NOT NULL,
    materia_id uuid NOT NULL,
    curso_id uuid NOT NULL,
    periodo public.periodo_tipo NOT NULL,
    anio integer NOT NULL DEFAULT EXTRACT(year FROM now()),
    nota numeric,
    descripcion text,
    docente_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    anio_academico_id uuid NOT NULL,
    tc1 numeric,
    tc2 numeric,
    tc3 numeric,
    tc4 numeric,
    th1 numeric,
    th2 numeric,
    th3 numeric,
    th4 numeric,
    cuaderno numeric,
    examen numeric,
    nota_final numeric,
    escala_valorativa text,
    logro_calculado text,
    CONSTRAINT calificaciones_pkey PRIMARY KEY (id),
    CONSTRAINT calificaciones_estudiante_id_materia_id_periodo_anio_key UNIQUE (estudiante_id, materia_id, periodo, anio),
    CONSTRAINT calificaciones_nota_check CHECK (nota >= 0::numeric AND nota <= 5::numeric),
    CONSTRAINT calificaciones_tc1_check CHECK (tc1 >= 0::numeric AND tc1 <= 5::numeric),
    CONSTRAINT calificaciones_tc2_check CHECK (tc2 >= 0::numeric AND tc2 <= 5::numeric),
    CONSTRAINT calificaciones_tc3_check CHECK (tc3 >= 0::numeric AND tc3 <= 5::numeric),
    CONSTRAINT calificaciones_tc4_check CHECK (tc4 >= 0::numeric AND tc4 <= 5::numeric),
    CONSTRAINT calificaciones_th1_check CHECK (th1 >= 0::numeric AND th1 <= 5::numeric),
    CONSTRAINT calificaciones_th2_check CHECK (th2 >= 0::numeric AND th2 <= 5::numeric),
    CONSTRAINT calificaciones_th3_check CHECK (th3 >= 0::numeric AND th3 <= 5::numeric),
    CONSTRAINT calificaciones_th4_check CHECK (th4 >= 0::numeric AND th4 <= 5::numeric),
    CONSTRAINT calificaciones_cuaderno_check CHECK (cuaderno >= 0::numeric AND cuaderno <= 5::numeric),
    CONSTRAINT calificaciones_examen_check CHECK (examen >= 0::numeric AND examen <= 5::numeric),
    CONSTRAINT calificaciones_nota_final_check CHECK (nota_final >= 0::numeric AND nota_final <= 5::numeric),
    CONSTRAINT calificaciones_anio_academico_id_fkey FOREIGN KEY (anio_academico_id) REFERENCES public.anios_academicos(id),
    CONSTRAINT calificaciones_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES public.docentes(id),
    CONSTRAINT calificaciones_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id),
    CONSTRAINT calificaciones_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
    CONSTRAINT calificaciones_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id)
);

-- Pagos
CREATE TABLE IF NOT EXISTS public.pagos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id uuid NOT NULL,
    mes integer NOT NULL,
    anio integer NOT NULL,
    monto numeric NOT NULL,
    fecha_pago date,
    estado text DEFAULT 'pendiente'::text,
    observacion text,
    registrado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metodo_pago text DEFAULT 'transferencia'::text,
    anio_academico_id uuid,
    CONSTRAINT pagos_pkey PRIMARY KEY (id),
    CONSTRAINT pagos_mes_check CHECK (mes >= 1 AND mes <= 12),
    CONSTRAINT pagos_estado_check CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'vencido'::text])),
    CONSTRAINT pagos_metodo_pago_check CHECK (metodo_pago = ANY (ARRAY['transferencia'::text, 'efectivo'::text])),
    CONSTRAINT pagos_anio_academico_id_fkey FOREIGN KEY (anio_academico_id) REFERENCES public.anios_academicos(id),
    CONSTRAINT pagos_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id),
    CONSTRAINT pagos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id)
);

-- Escalas Valorativas
CREATE TABLE IF NOT EXISTS public.escalas_valorativas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    escala text NOT NULL,
    rango_minimo numeric NOT NULL,
    rango_maximo numeric NOT NULL,
    verbo text NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT escalas_valorativas_pkey PRIMARY KEY (id),
    CONSTRAINT escalas_valorativas_escala_check CHECK (escala = ANY (ARRAY['Bajo'::text, 'Básico'::text, 'Alto'::text, 'Superior'::text])),
    CONSTRAINT escalas_valorativas_rango_minimo_check CHECK (rango_minimo >= 0::numeric AND rango_minimo <= 5::numeric),
    CONSTRAINT escalas_valorativas_rango_maximo_check CHECK (rango_maximo >= 0::numeric AND rango_maximo <= 5.6)
);

-- Logros Generales
CREATE TABLE IF NOT EXISTS public.logros_generales (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    curso_id uuid NOT NULL,
    materia_id uuid NOT NULL,
    anio_academico_id uuid NOT NULL,
    logro text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT logros_generales_pkey PRIMARY KEY (id),
    CONSTRAINT logros_generales_curso_id_fkey FOREIGN KEY (curso_id) REFERENCES public.cursos(id),
    CONSTRAINT logros_generales_materia_id_fkey FOREIGN KEY (materia_id) REFERENCES public.materias(id),
    CONSTRAINT logros_generales_anio_academico_id_fkey FOREIGN KEY (anio_academico_id) REFERENCES public.anios_academicos(id),
    CONSTRAINT logros_generales_curso_id_materia_id_anio_academico_id_key UNIQUE (curso_id, materia_id, anio_academico_id)
);

-- Descuentos de Pensiones
CREATE TABLE IF NOT EXISTS public.descuentos_pensiones (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    estudiante_id uuid,
    anio_academico_id uuid,
    monto_descuento numeric NOT NULL DEFAULT 0,
    observacion text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT descuentos_pensiones_pkey PRIMARY KEY (id),
    CONSTRAINT descuentos_pensiones_monto_descuento_check CHECK (monto_descuento >= 0::numeric),
    CONSTRAINT descuentos_pensiones_estudiante_id_anio_academico_id_key UNIQUE (estudiante_id, anio_academico_id),
    CONSTRAINT descuentos_pensiones_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(id),
    CONSTRAINT descuentos_pensiones_anio_academico_id_fkey FOREIGN KEY (anio_academico_id) REFERENCES public.anios_academicos(id)
);

-- 4. TRIGGERS
CREATE TRIGGER set_estudiantes_updated_at BEFORE UPDATE ON public.estudiantes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_docentes_updated_at BEFORE UPDATE ON public.docentes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_calificaciones_updated_at BEFORE UPDATE ON public.calificaciones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_pagos_updated_at BEFORE UPDATE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. POLÍTICAS DE RLS (Row Level Security)
ALTER TABLE public.anios_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curso_materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descuentos_pensiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docente_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Aplicar todas las políticas encontradas
CREATE POLICY "Admin CRUD años academicos" ON public.anios_academicos FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "Lectura publica de años academicos" ON public.anios_academicos FOR SELECT TO public USING (true);

CREATE POLICY "calificaciones_admin_delete" ON public.calificaciones FOR DELETE TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "calificaciones_docente_insert" ON public.calificaciones FOR INSERT TO public WITH CHECK ((get_user_rol() = ANY (ARRAY['admin'::text, 'docente'::text])));
CREATE POLICY "calificaciones_docente_update" ON public.calificaciones FOR UPDATE TO public USING ((get_user_rol() = ANY (ARRAY['admin'::text, 'docente'::text])));
CREATE POLICY "calificaciones_select" ON public.calificaciones FOR SELECT TO public USING (((get_user_rol() = 'admin'::text) OR (get_user_rol() = 'docente'::text) OR (estudiante_id IN ( SELECT id FROM estudiantes WHERE user_id = auth.uid()))));

CREATE POLICY "curso_materias_admin_write" ON public.curso_materias FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "curso_materias_select_all" ON public.curso_materias FOR SELECT TO public USING (true);

CREATE POLICY "cursos_admin_write" ON public.cursos FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "cursos_select_all" ON public.cursos FOR SELECT TO public USING (true);

CREATE POLICY "Permitir lectura a todos" ON public.descuentos_pensiones FOR SELECT TO public USING (true);
CREATE POLICY "Permitir todo a administradores" ON public.descuentos_pensiones FOR ALL TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.rol = 'admin'::rol_usuario)))));

CREATE POLICY "docente_cursos_admin_write" ON public.docente_cursos FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "docente_cursos_select" ON public.docente_cursos FOR SELECT TO public USING (get_user_rol() = ANY (ARRAY['admin'::text, 'docente'::text, 'estudiante'::text]));

CREATE POLICY "docentes_admin_write" ON public.docentes FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "docentes_select" ON public.docentes FOR SELECT TO public USING (((get_user_rol() = 'admin'::text) OR (user_id = auth.uid())));

CREATE POLICY "Estudiantes enlazar cuenta update" ON public.estudiantes FOR UPDATE TO authenticated USING (((registro_completo = false) AND (user_id IS NULL))) WITH CHECK (true);
CREATE POLICY "Estudiantes preregistro select" ON public.estudiantes FOR SELECT TO public USING ((registro_completo = false));
CREATE POLICY "estudiantes_admin_delete" ON public.estudiantes FOR DELETE TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "estudiantes_admin_write" ON public.estudiantes FOR INSERT TO public WITH CHECK ((get_user_rol() = 'admin'::text));
CREATE POLICY "estudiantes_select_admin" ON public.estudiantes FOR SELECT TO public USING (((get_user_rol() = 'admin'::text) OR (get_user_rol() = 'docente'::text) OR (user_id = auth.uid())));
CREATE POLICY "estudiantes_update_own_or_admin" ON public.estudiantes FOR UPDATE TO public USING (((user_id = auth.uid()) OR (get_user_rol() = 'admin'::text)));

CREATE POLICY "materias_admin_write" ON public.materias FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "materias_select_all" ON public.materias FOR SELECT TO public USING (true);

CREATE POLICY "pagos_admin_write" ON public.pagos FOR ALL TO public USING ((get_user_rol() = 'admin'::text));
CREATE POLICY "pagos_select" ON public.pagos FOR SELECT TO public USING (((get_user_rol() = 'admin'::text) OR (estudiante_id IN ( SELECT id FROM estudiantes WHERE user_id = auth.uid()))));

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO public WITH CHECK ((id = auth.uid()));
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO public USING (((id = auth.uid()) OR (get_user_rol() = 'admin'::text)));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO public USING (((id = auth.uid()) OR (get_user_rol() = 'admin'::text)));

-- Trigger de Registro de nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
