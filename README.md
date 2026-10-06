# Bitácora de proyectos

Página para llevar el registro de proyectos propios. Para cada uno guarda en qué fase está, una descripción, el link al sitio publicado y el repositorio de GitHub.

## Funcionalidades

- **Listado de proyectos** con nombre, descripción, fase, link al sitio y link al repositorio.
- **Filtro por fase**: En producción, En desarrollo, Prototipo, En pausa e Idea. Cada filtro muestra cuántos proyectos tiene.
- **Orden** por nombre, ascendente o descendente.
- **Modo admin** protegido con contraseña, para crear, editar y borrar proyectos.
- **Repositorios privados**: si un proyecto se marca como privado, la dirección del repositorio se guarda cifrada (AES-GCM con clave derivada por PBKDF2), así que solo se ve en modo admin.
- Tema claro / oscuro.

## Cómo se usa

1. Abrí la página. Sin iniciar sesión, cualquiera puede ver los proyectos.
2. Para editar, tocá **Admin** e ingresá la contraseña.
3. Con **+ Nuevo** agregás un proyecto: nombre, descripción, repositorio, URL del sitio, fase y si el repositorio es privado.
4. **Guardar** sube los cambios. Quedan guardados para todos.

## Cómo funciona

- El frontend es HTML, CSS y JavaScript, sin build.
- Los datos están en un archivo JSON (`bitacora/proyectos.json`) dentro de otro repositorio de GitHub (por defecto `FABIOR1981/bd`).
- El navegador nunca habla directo con GitHub. Pasa por la Netlify Function `netlify/functions/bitacora.js`, que es la única que conoce el token y que verifica la contraseña de admin antes de guardar.

## Publicación en Netlify

Configurar estas variables de entorno en Netlify:

| Variable | Para qué sirve |
|---|---|
| `GITHUB_TOKEN` | Token de GitHub con permiso de lectura y escritura sobre el repositorio de datos. |
| `CLAVE_ADMIN` | Contraseña del modo admin. |
| `GITHUB_TOKEN_DOCUMENTACION_CENTRAL` | Token de GitHub con permiso de lectura sobre `FABIOR1981/documentacion-central`, de donde el botón **Docs** toma la documentación de cada proyecto (`<repo>/documentacion/`). Si no está, se usa `GITHUB_TOKEN`. |
| `GITHUB_REPO` | Opcional. Repositorio donde está el JSON. Si no se define, se usa `FABIOR1981/bd`. |

## Estructura

```
index.html                     Página principal
css/estilos.css                Estilos
js/principal.js                Lógica de la página (listado, filtros, cifrado, modo admin)
netlify/functions/bitacora.js  Lee y guarda el JSON en GitHub
```
