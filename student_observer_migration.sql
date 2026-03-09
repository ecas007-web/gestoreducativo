-- Create the Student Observer table
CREATE TABLE IF NOT EXISTS public.estudiante_observador (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.profiles(id),
    anio_academico_id UUID NOT NULL REFERENCES public.anios_academicos(id),
    periodo TEXT NOT NULL CHECK (periodo IN ('P1', 'P2', 'P3', 'P4')),
    fortalezas TEXT,
    debilidades TEXT,
    estrategias TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.estudiante_observador ENABLE ROW LEVEL SECURITY;

-- Policies for Admin
CREATE POLICY "Admins can do everything on estudiante_observador" 
ON public.estudiante_observador FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Policies for Teachers
CREATE POLICY "Teachers can read and write on estudiante_observador" 
ON public.estudiante_observador FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'docente'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_estudiante_observador_updated_at
BEFORE UPDATE ON public.estudiante_observador
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
