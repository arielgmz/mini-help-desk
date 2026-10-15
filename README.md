# Mini Punto de Reclamo

Registro y seguimiento de reclamos para una entidad financiera. Los clientes registran un reclamo, reciben un folio y consultan su estado con folio + email; el personal interno los gestiona desde un panel con inicio de sesión. Cada reclamo debe atenderse en 5 días hábiles y el sistema calcula y muestra ese vencimiento.

| Capa | Tecnología |
|---|---|
| Backend | .NET 10 Web API en capas (Domain / Application / Infrastructure / Api), EF Core 10, FluentValidation, JWT, Swagger |
| Base de datos | SQL Server 2022 con migraciones de EF Core |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| Calidad | xUnit + FluentAssertions (backend), Vitest + Testing Library (frontend), ESLint + Prettier |
| Contenedores | Docker Compose (SQL Server + API + Web) |

## Estructura

```
prueba_tecnica/
├── backend/
│   ├── src/
│   │   ├── PuntoReclamo.Domain          Entidades, enums, máquina de estados, días hábiles, formato de folio
│   │   ├── PuntoReclamo.Application     Servicios, DTOs, validadores, abstracciones
│   │   ├── PuntoReclamo.Infrastructure  EF Core, repositorio, secuencia de folio, migraciones, seed
│   │   └── PuntoReclamo.Api             Controladores delgados, middleware ProblemDetails, JWT / X-Api-Key, Swagger
│   └── tests/PuntoReclamo.UnitTests
├── frontend/
│   └── src/
│       ├── app/          Rutas: /reclamos, /seguimiento, /admin (y / → /reclamos)
│       ├── components/   UI con una responsabilidad cada uno (+ sus pruebas *.test.tsx)
│       └── lib/          Capa de acceso a la API, validaciones, sesión, formato (+ pruebas)
└── docker-compose.yml
```

## Requisitos previos

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (probado con 22)
- [Docker](https://www.docker.com/) con Docker Compose

## Opción A — Todo en Docker (la más rápida)

```bash
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API + Swagger | http://localhost:5017/swagger |
| SQL Server | `localhost,1433` (usuario `sa`, contraseña en `.env.example`) |

La API aplica las migraciones y carga los datos semilla al arrancar. Para detener y **borrar los datos**: `docker compose down -v`.

## Opción B — Desarrollo local

1. **Base de datos**: `docker compose up -d sqlserver`, o un SQL Server propio ajustando `ConnectionStrings:DefaultConnection` en `backend/src/PuntoReclamo.Api/appsettings.json` (o la variable `ConnectionStrings__DefaultConnection`).
2. **API**: `dotnet run --project backend/src/PuntoReclamo.Api` → `http://localhost:5017`.
3. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:5017
   npm install
   npm run dev                     # http://localhost:3000
   ```

## Base de datos: creación, migraciones y datos semilla

Por defecto la API aplica las migraciones pendientes al arrancar (`Database:ApplyMigrationsOnStartup`) y, si la tabla de reclamos está vacía, inserta los datos semilla (`Database:Seed`). Para hacerlo a mano:

```bash
dotnet tool install --global dotnet-ef        # una sola vez

# Crear/actualizar el esquema (usa la cadena de conexión de appsettings o ConnectionStrings__DefaultConnection)
dotnet ef database update --project backend/src/PuntoReclamo.Infrastructure --startup-project backend/src/PuntoReclamo.Api

# Alternativa: generar un script SQL idempotente para ejecutarlo en SSMS/sqlcmd
dotnet ef migrations script --idempotent -o crear-base.sql --project backend/src/PuntoReclamo.Infrastructure --startup-project backend/src/PuntoReclamo.Api
```

Los datos semilla los inserta la API en su primer arranque. Son 7 reclamos ficticios con fechas relativas al momento del arranque (`AAAA` = año en curso):

| Folio | Email | Estado | Nota |
|---|---|---|---|
| REC-AAAA-000001 | ana.perez@example.com | Recibido | Vigente |
| REC-AAAA-000002 | carlos.mamani@example.com | Recibido | **Vencido** |
| REC-AAAA-000003 | lucia.fernandez@example.com | EnProceso | Vigente |
| REC-AAAA-000004 | jorge.vargas@example.com | EnProceso | **Vencido** |
| REC-AAAA-000005 | maria.gutierrez@example.com | Resuelto | Con comentario |
| REC-AAAA-000006 | pedro.choque@example.com | Rechazado | Con comentario |
| REC-AAAA-000007 | sofia.limachi@example.com | Recibido | Registrado hoy |

## Acceso de administración

Los endpoints `/api/admin/*` aceptan **cualquiera** de estas dos credenciales, ambas leídas de configuración:

| Método | Cómo | Uso |
|---|---|---|
| **JWT** (plus) | `POST /api/auth/login` con usuario y contraseña → `Authorization: Bearer <token>` | Panel web `/admin` |
| **API key** (requisito base) | Header `X-Api-Key: <clave>` | curl, Swagger, integraciones |

Credenciales de **prueba** (docker compose y `dotnet run` en Development):

```
Usuario:    admin
Contraseña: admin-pass-2026
X-Api-Key:  admin-secret-key-2026
```

**Alcance de la protección del panel:**
- La seguridad real está en la API: cada endpoint admin rechaza con 401 cualquier petición sin un JWT válido o sin la clave correcta.
- La ruta `/admin` es una puerta en el cliente: sin sesión solo muestra el login. El JWT (60 min) se guarda en `sessionStorage` y al expirar se vuelve al login.
- Fuera de Development la API **no arranca** si faltan las credenciales o si `Jwt:SigningKey` tiene menos de 32 caracteres.
- El login admite 10 intentos por minuto por IP (luego 429) y responde igual ante usuario inexistente o contraseña errónea.

## Endpoints

| Método | Ruta | Acceso | Respuestas |
|---|---|---|---|
| POST | `/api/claims` | Público | 201, 400, 422 |
| GET | `/api/claims/{folio}?email=` | Público | 200, 404 |
| GET | `/api/admin/claims?status=&page=&pageSize=&overdue=` | JWT o `X-Api-Key` | 200, 400, 401, 422 |
| PATCH | `/api/admin/claims/{folio}/status` | JWT o `X-Api-Key` | 200, 400, 401, 404, 409, 422 |
| POST | `/api/auth/login` | Público (limitado) | 200, 401, 422, 429 |
| GET | `/health` | Público | 200 |

Todos los errores usan **ProblemDetails (RFC 7807)** en español, sin detalles internos. **400** indica que la petición no se puede interpretar (JSON malformado o un parámetro con tipo incorrecto). **422** indica una regla de validación incumplida, con `errors` por campo en camelCase.

## Uso de Next.js

- **Enrutamiento**: App Router, con `/reclamos` (formulario), `/seguimiento` y `/admin`. `/` redirige a `/reclamos` desde `next.config.ts`.
- **URL de la API por variables de entorno**: `NEXT_PUBLIC_API_URL` (navegador) y `API_URL` (servidor de Next).
- **Pantalla con datos obtenidos en el servidor: `/seguimiento` (Server Component).**
  - Cómo funciona: el formulario envía una Server Action que valida, guarda folio + email en una cookie `HttpOnly` de 15 minutos y redirige a `/seguimiento?folio=…`. La página, un Server Component, lee la cookie, consulta la API desde el servidor y renderiza el estado y el historial dentro de `<Suspense>`, que se encarga del estado de carga.
  - Por qué ahí:
    1. **Privacidad**: es la consulta pública con datos personales. El email no aparece en la URL (historial, logs, enlaces compartidos) y el navegador nunca llama a la API ni conoce su URL interna.
    2. **Sin estado de cliente**: el resultado es de solo lectura, así que no hace falta JavaScript para mostrarlo.
    3. **Sin caché**: el dato es personal y cambiante, por eso se consulta con `cache: "no-store"`.
  - El formulario de registro y el panel admin son Client Components porque son interactivos: validación en vivo, sesión y diálogos.

## Pruebas y calidad

```bash
dotnet test backend/PuntoReclamo.sln      # backend: 77 pruebas

cd frontend
npm test                                  # frontend: 62 pruebas (Vitest + Testing Library)
npm run lint                              # ESLint (con eslint-config-prettier)
npm run format:check                      # Prettier (npm run format para aplicar)
```

- **Backend**: días hábiles (lunes, miércoles, viernes, sábado, domingo), máquina de estados y comentario obligatorio, formato y correlatividad del folio, anti-enumeración, vencidos (marca, orden y filtro), paginación, JWT (firma ajena, expirado, manipulado) y respuesta 400 sin detalles internos.
- **Frontend**: validaciones del formulario, capa de API (Bearer, errores por campo, red caída), sesión, seguimiento (404, error y vencido), y componentes:
  - Formulario: errores junto al campo, doble envío y confirmación con folio y fecha límite.
  - Tabla admin: columnas e indicador de vencido.
  - Detalle: transiciones válidas, comentario obligatorio, 409 y 401.

**Diseño responsivo**: auditado en 17 tamaños, de 320×568 a 2560×1440, incluidos apaisados. No hay scroll horizontal, los campos usan 16 px en móvil (evita el zoom de iOS) y los objetivos táctiles miden ≥ 40 px. El panel admin muestra tarjetas por debajo de 1024 px y tabla desde 1024 px.

## Supuestos de negocio

- **Feriados fuera de alcance**: los 5 días hábiles excluyen solo sábados y domingos.
- **Plazo**: `dueDate = createdAt + 5 días hábiles`, conservando la hora, en UTC. Un reclamo de sábado o domingo vence el viernes siguiente.
- **Horas en pantalla**: se muestran en `America/La_Paz` (es-BO), igual en el servidor y en el navegador.
- **Email exacto**: la consulta pública compara el email de forma ordinal (sensible a mayúsculas), como dice "el email no coincide".
- **Folio**: correlativo por año. Si un insert falla después de reservar el número queda un hueco, pero nunca un duplicado.
- **Transiciones**: una transición ilegal da 409 aunque falte el comentario; un comentario faltante en una transición válida da 422.
- **CI**: obligatorio, de 4 a 20 caracteres alfanuméricos, espacios o guiones (`1234567 LP`, `1234567-1A`).
- **Vista pública**: el seguimiento no expone CI, nombre ni teléfono.
- **Listado admin**: los vencidos van primero, el más atrasado arriba. `overdue=true` (interruptor "Solo vencidos") filtra solo los vencidos.

## Decisiones

### Tres decisiones de diseño
1. **Reglas de negocio en el dominio.** La máquina de estados y el cálculo de plazos son código puro en `Domain`, y `Claim` solo cambia de estado a través de sus métodos. Las violaciones son excepciones de dominio que un único middleware traduce a ProblemDetails (409/422/404). *Por qué*: es lo que más debe acertar; se prueba sin base de datos ni HTTP y los controladores quedan sin lógica.
2. **Folio con un `MERGE … WITH (HOLDLOCK)` por año.** Una tabla `FolioCounters(Year, LastValue)` se incrementa en una sola sentencia atómica, con un índice único sobre `Folio` como red de seguridad. *Por qué*: `MAX(folio)+1` duplica bajo concurrencia y una `SEQUENCE` no reinicia por año. Lo verifiqué con 25 POST en paralelo: 25 folios únicos y consecutivos.
3. **Privacidad del seguimiento de punta a punta.** Folio inexistente y email incorrecto producen exactamente la misma respuesta 404. En el frontend, `/seguimiento` se resuelve en un Server Component con el email en una cookie `HttpOnly`. *Por qué*: la anti-enumeración se rompe por detalles laterales, como mensajes distintos, URLs con el email o llamadas visibles desde el navegador.

### Qué simplifiqué y qué haría con más horas
- **Un solo administrador definido en configuración**: sin usuarios en base de datos, roles, *refresh tokens* ni registro de **quién** hizo cada cambio. Con más tiempo: usuarios con hash, roles y el actor en `ClaimStatusHistory`.
- **JWT en `sessionStorage`**: es simple, pero queda expuesto a XSS. Lo mejoraría con una cookie `HttpOnly` emitida por Next (patrón BFF).
- **Sin feriados, sin límite de peticiones en la consulta pública y sin notificaciones**: agregaría un calendario configurable, CAPTCHA o rate limit por IP real, y correo al cambiar de estado.
- **Sin pruebas de integración ni E2E en el repositorio** (los flujos E2E los verifiqué con scripts temporales): agregaría `WebApplicationFactory` + Testcontainers y Playwright en CI.

### Qué tuve que aprender
- **Next.js 16 con Cache Components.** El proyecto generado venía con este modo activo y un `AGENTS.md` que avisaba que la API difiere de versiones anteriores. Todo dato de la petición (`searchParams`, `cookies()`) debe resolverse dentro de `<Suspense>`, `cookies().set` solo funciona en Server Functions y `redirect()` va fuera de `try/catch`. Lo resolví leyendo la documentación incluida en `node_modules/next/dist/docs` antes de escribir cada pantalla.
- **Diagnóstico guiado por pruebas.** Una prueba de Vitest fallaba con un error ya capturado por el componente. La causa era que `beforeEach(() => mock.mockReset())` devuelve el mock y Vitest lo ejecuta como función de limpieza. La misma batería encontró un `aria-describedby` que apuntaba a un elemento oculto. Bisecté las variantes hasta aislar cada causa en lugar de silenciar el síntoma.

## Variables de entorno

| Variable | Dónde | Descripción | Predeterminado |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | API | Cadena de conexión SQL Server | `localhost,1433` (demo local) |
| `Admin__ApiKey` | API | Clave del header `X-Api-Key` | `admin-secret-key-2026` (demo) |
| `Admin__Username` / `Admin__Password` | API | Credenciales del panel (login → JWT) | solo Development / compose |
| `Jwt__SigningKey` | API | Secreto HMAC del JWT (mín. 32 caracteres) | **sin valor por defecto** fuera de Development |
| `Jwt__ExpiryMinutes` | API | Vigencia del token | `60` |
| `Cors__AllowedOrigins__0` | API | Origen permitido del frontend | `http://localhost:3000` |
| `Database__ApplyMigrationsOnStartup` / `Database__Seed` | API | Migrar y sembrar al iniciar | `true` / `true` |
| `NEXT_PUBLIC_API_URL` | Web (build) | URL de la API vista por el navegador | `http://localhost:5017` |
| `API_URL` | Web (runtime) | URL de la API vista por el servidor de Next | `NEXT_PUBLIC_API_URL` |
| `MSSQL_SA_PASSWORD` | compose | Contraseña de `sa` | ver `.env.example` |

Todos los valores por defecto son **de demostración local**. En un entorno público se definen por variables de entorno o secretos; ninguna credencial real se guarda en el repositorio.
