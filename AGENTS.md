##AGENTS
Proyecto: Gestor Educativo

Rol / Persona principal de agente: Eres un desarrollador  frontend  con mas de 12 años de experiencia.

Stack de Tecnologias:
    •   HTML5
    •   CSS3
    •   Tailwindcss
    •   JavaScript 
    •   React
    •   vite
    •   supabase
    •   react-router-dom
    

Objetivo: Crear una aplicación web para un jardín infantil que permita el registro de calificaciones por logros, y los almacene en una base de datos supabase, debe permitir el logueo de profesores, padres de familia o administrador, se crearan asignaturas y se les asignaran a los cursos, los cursos se le asignan al docente los padres de familia podrán loguearse con su correo y el documento del estudiante, se debe permitir el registro de estudiantes, los docentes se asignaran sus calificaciones por asingaturas, el administrador podrá imprimir boletines, certificados, registrar los pagos de las pensiones

preferencias generales:
    •	 todo los textos de la aplicacion deben estan en español

Las funcionalidades que debe tener la app son estas:
    - Registro de usuario y Autenticación:
        1.	Loggin:  (estudiante, docente, administrador) si es estudiante debe pedir el documento del estudiante, correo y password
        Si es docente o administrador: pedir correo y password
        2.	Solo el administrador podra  realizar el registro inicial de  estudiante en un modulo con sus datos básicos (tipo de documento, documentos nombres y apellidos, curso)
        3.	Completar el  estudiante: luego de que el administrador registro los datos básicos, el estudiante podrá registrarse al dar  clic en el botón de registro en la pagina de login, el sistema debe solicitar correo, tipo de documento y documento, el sistema validara que existe un preregistro y si existe debe abrir un formulario con el nombre y apellidos pre-registrado  para completar la información del estudiante (dirección, teléfono, tipo de sangre nombre de los padres, ocupación, documento de los padres teléfono de los padres , contraseña  a asignar)  al finalizar debe enviar un correo al usuario indicado que el registro fue exitoso
        4.	Loguin de estudiante: para el Loguin del estudiante el sistema debe solicitar: (correo, tipo de documento, documento y contraseña) si es exitoso debe mostrar los datos del estudiantes y permitir su edicion
        5.	Solo el administrador podra  realizar el registro de docente  en un modulo con sus datos básicos (tipo de documento, documentos nombres y apellidos, correo, curso) cuando se finalice el registro se debe enviar un correo al docente para que realice la asignación de la contraseña
        6.	Login de docente: luego de que el docente se asigna la contraseña desde el correo enviado se podrá permitir el logguin y se le mostrara el curso asignados , al abrir podra ver las materias del curso y podrá realizar el registro de las calificaciones
        7.	Solo el administrador podrá:
            	Registrar, modificar, eliminar y actualizar  los cursos (los cursos actuales son parvulo, prejardín, jardín y transicion)
            	Registrar, modificar, eliminar y actualizar las materias (las materias actuales son: cognitiva, estética, comunicativa, corporal, ética, espiritual, afectiva, comportamiento, informatica)
            	Asignar  las materias a los cursos
            	

    - Modulo de creación de administrador
        •	Debe tener un opción para crear usuario administrador
        •	Se debe parametricar un correo en las variables de entorno el correo que pueda crear administrador
        •	Al crear el administrador debe pedir el correo, tipo de documento, documento y nombre y contraseña
        •	Este correo se debe validar con el que esta en la variable de entorno y si es correcto se debe enviar un correo de verificación para que confírme la creación desde este correo
        •	El correo que quedara en la variable de entorno es :  ecas007@hotmai.es

    - Registro de docente:
        El administrador crea el docente con los datos (tipo de documento, documento , nombre y apellido, grado, contraseña)
        El docente cuando se logue debe tener un modulo para cambio de contraseña, debe poder camblar la contraseña colocando la contraseña anterior y la nueva contraseña digitada dos veces 

    - Control de año academico
        •	debe tener un modulo de parametrización de año que solo es manipulado por el administrador, en este modulo se crean, editan los años,
        •	el año se crea con los campos (año, estado, fecha de inicio, fecha fin)
        •	solo se podrá tener un solo año activo
        •	al crear el estudiante se debe seleccionar el año,  debe mostrar una lista con el año que este activo.
        •	En el modulo de estudiante debe tener el filtro por año
        •	En el modulo de registro calificaciones debe esta el filtro por año y solo se mostrara el año que este activo, la calificación que se registre debe quedar con el año correspondiente


•	Funcionalidades de la app
    1.	Realizar el backen en supabase
    2.	Loguin y registro de usuarios en supabase en el 
    3.	Se guardaran los usuarios, materias, cursos, calificaciones,  en una base de datos de supabase en el poryecto (Gestoreducativo)

•	Backend
    1.	Realizar el backen en supabase
    2.	Loguin y registro de usuarios en supabase en el 
    3.	Se guardaran los usuarios, materias, cursos, calificaciones,  en una base de datos de supabase en el poryecto (Gestoreducativo)

Preferencias de diseño:
Básate en las imágenes del diseño que tienes en la carpeta design del proyecto y en las imágenes que te he enviado en la conversación

Preferencias de estilo:
•	usa tailwindcss para el diseño
•	colores los del diseño
•	que la app tenga idioma español
•	que la app sea responsive

Preferencia de codigo:
•	no añadas dependencias externas
•	html debe ser semantico
•	no uses alert, confirm, prompt todo el feedback debe ser visual en el dom
•	proriza que el codigo legible y mantenible
•	prioriza el codigo sencillo de entender
•	si el agente duda, que revise las especificaciones del proyecto y si no que pregunta al usuario.



