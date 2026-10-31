# Portal Inmobiliario — SDD

Portal inmobiliario para Chile construido mediante **Spec-Driven Development (SDD)**.

## Desarrollo local

Requisitos: Node.js 20.9 o superior y npm 10 o superior. La base se ha preparado con Next.js 16.4.3, React 19.3.1 y TypeScript estricto.

Ejecutar desde la raíz del repositorio:

```powershell
npm install
Copy-Item .env.example apps/web/.env.local
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). El Paso 2 incorpora el layout compartido, header, footer y navegación responsive. En móvil, el botón de menú muestra los enlaces y permite cerrar con Escape. También se incluye un enlace para saltar al contenido mediante teclado.

Los destinos `/properties` y `/login` son páginas provisionales de navegación. Comprar y Arrendar enlazan a `/properties?operation=SALE` y `/properties?operation=RENT`; el catálogo, los filtros y la autenticación se implementarán en sus pasos correspondientes.

Next.js carga las variables de entorno desde `apps/web/.env.local`, ya que ese es el directorio de la aplicación. `.env.example` documenta la configuración prevista; el arranque inicial no requiere PostgreSQL ni credenciales de las integraciones. Completar sus valores en las tareas correspondientes y conservar los secretos en el servidor.

## Comandos

| Comando | Propósito |
| --- | --- |
| `npm run dev` | Iniciar el servidor de desarrollo. |
| `npm run build` | Generar y comprobar la compilación de producción. |
| `npm start` | Servir la compilación de producción. |
| `npm run lint` | Ejecutar ESLint sin permitir advertencias. |
| `npm run typecheck` | Generar los tipos de rutas y comprobar TypeScript. |
| `npm test` | Ejecutar las validaciones estáticas: ESLint y TypeScript. |

Las pruebas de las funcionalidades se incorporarán con su implementación. El layout se validó sobre el servidor de producción en anchos de 360, 768 y 1280 px, comprobando los enlaces del header y footer, la ausencia de desbordamiento horizontal, el menú móvil, el cierre con Escape y la navegación mediante teclado al contenido principal.

Para comprobar producción:

```powershell
npm run build
npm start
```

## Estructura

```text
.
├── apps/
│   └── web/
│       └── src/
│           ├── app/           # App Router y futuros Route Handlers en api/
│           ├── components/    # Interfaz reutilizable
│           ├── services/      # Lógica de aplicación
│           ├── repositories/  # Persistencia
│           ├── lib/           # Utilidades y clientes
│           └── types/         # Tipos compartidos
├── .env.example
├── package.json              # Monorepo con npm workspaces
├── CLAUDE.md
└── specs/
    └── portal-inmobiliario/
        ├── spec.md
        ├── plan.md
        └── tasks.md
```

El frontend consumirá REST; los Route Handlers coordinarán servicios y repositorios para acceder a PostgreSQL. Las carpetas están preparadas sin implementar aún funcionalidades de las tareas siguientes.

## Documentos

### `CLAUDE.md`

Contiene las instrucciones permanentes que Claude Code debe seguir durante el desarrollo.

### `spec.md`

Define **qué debe hacer la aplicación**: funcionalidades, usuarios, propiedades, filtros, imágenes, ubicación, contacto, administración y criterios de aceptación.

### `plan.md`

Define **cómo se construirá técnicamente**: arquitectura, PostgreSQL, API REST, autenticación, Cloudinary, Google Maps, Web3Forms y separación de responsabilidades.

### `tasks.md`

Divide la implementación en una secuencia incremental de tareas.

## Comenzar con Claude Code

Abre Claude Code desde la raíz del repositorio y utiliza:

```text
Lee CLAUDE.md y todos los documentos del directorio
specs/portal-inmobiliario/.

Analiza la especificación, el plan técnico y la lista de tareas.

Comienza únicamente con la primera tarea pendiente de tasks.md.
No avances a la siguiente tarea hasta que te lo indique.
```

Para continuar posteriormente:

```text
Continúa con la siguiente tarea pendiente de tasks.md.

Consulta spec.md y plan.md cuando sea necesario.
Implementa únicamente esa tarea, valida los cambios y márcala
como completada cuando esté correctamente terminada.

No avances a la siguiente tarea.
```
