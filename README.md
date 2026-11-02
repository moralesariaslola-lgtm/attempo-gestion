# ATTEMPO · Gestión

Aplicación independiente de Spirit to All. Clientes, bolos, presupuestos, disponibilidad, tareas, gastos, repertorio y equipo. Todos los integrantes autorizados tienen los mismos permisos; cada uno responde con su propia cuenta. Facturación externa a través de Artistamente y proveedores.

## Publicación en GitHub Pages
Subir los archivos de esta carpeta al repositorio `attempo-gestion`. En Settings → Pages, seleccionar Deploy from a branch, rama main y carpeta raíz. La URL definitiva la muestra GitHub Pages. No publicar los archivos de configuración privada ni credenciales secretas.

## Supabase
Proyecto `nfxbufrhhwebhxcvdwtb`, ya configurado. `config.js` solo contiene la URL y una clave publicable. Las tablas usan RLS para exigir pertenencia activa al equipo; no hay acceso de datos anónimo.

## Primera cuenta e invitaciones
En Supabase → Authentication → Users → Invite user, invitar cada correo. Configurar antes Authentication → URL Configuration con la URL definitiva de GitHub Pages en Site URL y Redirect URLs (incluyendo index.html). Tras aceptar la invitación, registrar su UUID real en at_miembros desde Table Editor, con nombre y activo=true. Nunca autorizar automáticamente a cualquier usuario que se registre. No crear las cuentas directamente con SQL.

## Instalación
Abrir la URL HTTPS y pulsar Instalar app. Android: Chrome → menú → Instalar aplicación. iPhone: Safari → Compartir → Añadir a pantalla de inicio. Los datos requieren Internet; el caché guarda únicamente la interfaz pública, nunca las respuestas de Supabase.
