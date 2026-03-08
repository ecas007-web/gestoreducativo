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

    - Parametrización de logros
        •	Se debe tener un modulo llamado “parametrización  de lo logro general” el cual podrá ser parametrizado por el docente o el administrador.
                El modulo debe tener los campos:  
            o	Materia: si se loguea un docente este solo podrá gestionar los logros del curso que tenga asigando
            o	Curso 
            o	Logro (campo de texto largo multilínea)
                solo se debe se podrá parametrizar un logro por materia
        •	también debe haber otro modulo que solo vera el administrador llamado “parametrización de escala valorativa”, en este modulo solo se manejaran 4 registros que contendrán los rangos entre 0 y 5 para cada escala, el objetivo de este modulo es para que cuando el docente asigne una calificación entre 0 y 5 el sistema obtenga la escala a cual pertenece y el verbo para que sea concatenado con el logro general.
        o	los campos de este modulo son: 
            	escala: el cual solo puede ser bajo, básico, alto, superior
            	rango mínimo: numero de 1 decimal  (valor entre 0,0 y 5,0)
            	rango máximo: numero de 1 decimal  (valor entre 0,0 y 5,6)
            	verbo: es un texto que se concatenara mas adelante al inicio de cada logro general cuando se este calificando

    - asignación de calificaciones:
        en este modulo se diligencias las notas por estudiantes de la siguiente manera:
        nota: las notas solo se manejan de 0 a 5.
            o	tarea en clase: 4 notas cuyo promedio  equivale a un 30%
            o	tarea en casa: 4 notas cuyo promedio  equivale a un 30%
            o	revisión de cuaderno: 1 nota que equivale a un 10%
            o	examen final: 1 nota que equivale a un 30%
        •	la nota final del periodo = la suma los porcentaje de las 4 notas
        •	la nota final solo se calcula cuando ya se tengan los 4 porcentajes
        •	campo nota valorativa, solo se muestra cuando se tengan la nota final, este campo se calcula de la siguiente manera: el sistema debe buscar la escala y el verbo (bajo, básico, alto, superior) en el módulo “parametrización de escala valorativa” donde la calificación sea >= a rango mínimo y <= rango máximo, en este campo solo se almacena la escala

        •	logro: solo se muestra cuando se tengan la nota final , el sistema debe buscar el logro en el modulo “parametrización  de lo logro general” para el curso y la materia correspondiente en este campo debe mostrarse la concatenación de (verbo + logro) , este se debe almacenar concatenado

    Modulo de gestion de estudiante:
        en el modulo de consulta del estudiente (Gestión de Estudiantes) quiero que se muestren tambien estos campos: (FECHA de nacimiento, SEXO ,LUGAR NACIMIENTO, DIRECCION, EMAIL, TELEFONO, CELULAR, EPS, TIPO DE SANGRE, IDENTIFICACION PADRE, NOMBRE PADRE, OCUPACION_PADRE, TELEFONO PADRE, NOMBRE MADRE, IDENTIFICACION MADRE, OCUPACION MADRE, TELEFONO MADRE, RELIGION, DEBILIDADES, FORTALEZAS), verifica que esten en la base de datos y si no estan los creas para que persistan, estos mismos campos se deben mostrar en: "consulta de estudiante" y "edicion de estudiante".

        nota: en el modulo de "Completar Registro Estudiante" también deben estar todos estos campos como obligatorios excepto, ese modulo también debería ser un modal ya que tendrá muchos campos, puede ser igual al edición, solo que el de edición no deben  estar  como obligatorios estos campos nuevos


    - Modulo de pagos:
        este se utilizara para el registro de los pagos de las pensiones de los estudiantes del año en curso.
        Se debe permitir el registro de pago de la pensión del estudiante con los siguientes campos: 

            •	estudiante: lista de autocompletar debe permitir buscar por grado,  nombre o documento 
            •	mes a cancelar
            •	valor a cancelar: por defecto debe esta el valor de la pensión del año parametrizado
            •	método de pago: transferencia o efectivo, por defecto transferencia
            •	fecha de pago
            •	se debe almacenar automáticamente la fecha en que se registra el pago y el usuario que lo realiza

        se debe permitir buscar por:
            •	al día: estudiantes que han cancelado el mes seleccionado, mostrar el total de ingresos del mes
            •	en mora: estudiantes que no han cancelado los  meses seleccionados  o el valor del cancelado en el mes es menor al valor de la pensión parametrizada

        nota: en el modulo “Parámetros de Años Académicos” se debe adicionar el campo valor de pensión, colocar para este año el valor de $210000
        hay estudiantes con descuento especial para todo el año, se debe permitir registra el descuento para que no salga en mora al sacar el reporte de los estudiantes  con mora




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



