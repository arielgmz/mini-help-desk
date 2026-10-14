# Mini Punto de Reclamo

Registro y seguimiento de reclamos para una entidad financiera. Los clientes registran un reclamo y consultan su estado con folio + email; el personal administra los reclamos desde un panel protegido por API key.

| Capa | Tecnología |
|---|---|
| Backend | .NET 10 Web API, Clean Architecture (Domain / Application / Infrastructure / Api), EF Core 10, FluentValidation, Swagger |
| Base de datos | SQL Server 2022 |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| Pruebas | xUnit + FluentAssertions |
| Contenedores | Docker Compose (SQL Server + API + Web) |

## Estructura

```
prueba_tecnica/
├── backend/
│   ├── src/
│   │   ├── PuntoReclamo.Domain          Entidades, enums, máquina de estados, calculadora de días hábiles
│   │   ├── PuntoReclamo.Application     Servicios, DTOs, validadores, abstracciones
│   │   ├── PuntoReclamo.Infrastructure  EF Core, repositorio, secuencia de folio, migraciones, seed
│   │   └── PuntoReclamo.Api             Controladores delgados, middleware ProblemDetails, API key, Swagger
│   └── tests/PuntoReclamo.UnitTests
├── frontend/                            Next.js (App Router)
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
| SQL Server | `localhost,1433` (usuario `sa`) |

La API aplica las migraciones y carga los datos semilla al arrancar (reintenta hasta que SQL Server acepta conexiones). Para detener y **borrar los datos**: `docker compose down -v`.

## Opción B — Desarrollo local (API y frontend fuera de Docker)

1. **Base de datos** — solo SQL Server en Docker:
   ```bash
   docker compose up -d sqlserver
   ```
   *(Si prefiere un SQL Server propio, ajuste `ConnectionStrings:DefaultConnection` en `backend/src/PuntoReclamo.Api/appsettings.json` o con la variable `ConnectionStrings__DefaultConnection`.)*
2. **API**:
   ```bash
   dotnet run --project backend/src/PuntoReclamo.Api
   ```
   Escucha en `http://localhost:5017`. Migraciones y seed se aplican solos.
3. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:5017
   npm install
   npm run dev
   ```
   Abra http://localhost:3000.

## Acceso de administración

Los endpoints `/api/admin/*` aceptan **cualquiera** de estas dos credenciales:

| Método | Cómo | Uso |
|---|---|---|
| **JWT** (plus) | `POST /api/auth/login` con usuario y contraseña → `Authorization: Bearer <token>` | Panel web `/admin` |
| **API key** (requisito base) | Header `X-Api-Key: <clave>` | curl, Swagger, integraciones |

Credenciales de **demostración local** (docker compose / `dotnet run` en Development):

```
Usuario:    admin
Contraseña: admin-pass-2026
X-Api-Key:  admin-secret-key-2026
```

- El panel **no pide la API key**: inicia sesión, recibe un JWT (60 min por defecto) y lo envía como `Bearer`. Al expirar, vuelve al login automáticamente.
- Usuario, contraseña, clave y secreto de firma se leen **solo de configuración** (`Admin:*`, `Jwt:SigningKey`, o variables de entorno). No hay valores por defecto en `appsettings.json` para el secreto JWT: en cualquier entorno distinto de Development la API **no arranca** si faltan, o si el secreto tiene menos de 32 caracteres.
- El login tiene límite de intentos (10 por minuto por IP → 429) y responde igual ante usuario inexistente o contraseña errónea.
- En Swagger use **Authorize**: pegue el token de `/api/auth/login` (esquema *Bearer*) o la clave (esquema *ApiKey*).
## Datos semilla

Si la tabla está vacía, la API crea 7 reclamos (fechas relativas al momento del arranque):

| Folio | Email | Estado | Nota |
|---|---|---|---|
| REC-AAAA-000001 | ana.perez@example.com | Recibido | Vigente |
| REC-AAAA-000002 | carlos.mamani@example.com | Recibido | **Vencido** |
| REC-AAAA-000003 | lucia.fernandez@example.com | EnProceso | Vigente |
| REC-AAAA-000004 | jorge.vargas@example.com | EnProceso | **Vencido** |
| REC-AAAA-000005 | maria.gutierrez@example.com | Resuelto | Con comentario |
| REC-AAAA-000006 | pedro.choque@example.com | Rechazado | Con comentario |
| REC-AAAA-000007 | sofia.limachi@example.com | Recibido | Registrado hoy |

(`AAAA` = año en curso.) Para consultarlos en `/seguimiento` use folio + email de la tabla.

## Endpoints

| Método | Ruta | Acceso | Respuestas |
|---|---|---|---|
| POST | `/api/auth/login` | Público (limitado) | 200, 401, 422, 429 |
| POST | `/api/claims` | Público | 201, 422 |
| GET | `/api/claims/{folio}?email=` | Público | 200, 404 |
| GET | `/api/admin/claims?status=&page=&pageSize=&overdue=` | JWT o `X-Api-Key` | 200, 401, 422 |
| PATCH | `/api/admin/claims/{folio}/status` | JWT o `X-Api-Key` | 200, 401, 404, 409, 422 |
| GET | `/health` | Público | 200 |

Todos los errores usan **ProblemDetails (RFC 7807)**; los de validación incluyen `errors` por campo en camelCase.

## Pruebas unitarias

```bash
dotnet test backend/PuntoReclamo.sln
```

75 pruebas: calculadora de días hábiles (lunes, miércoles, viernes, sábado, domingo), máquina de estados (transiciones válidas/ inválidas, comentario obligatorio), formato y correlatividad del folio, reglas de servicio (anti-enumeración, vencimiento, orden "vencidos primero", filtro de vencidos, paginación) y seguridad (emisión/validación de JWT, firma ajena, expirado, manipulado).

## Diseño responsivo

Verificado con una auditoría automatizada en 17 tamaños (320×568 hasta 2560×1440, incluidos apaisados 667×375 y 844×390): sin scroll horizontal, campos a 16 px en móvil (evita el zoom de iOS), objetivos táctiles ≥ 40 px, y el panel admin pasa de **tarjetas (< 1024 px)** a **tabla (≥ 1024 px)** para que la acción *Cambiar estado* nunca quede fuera de pantalla. El diálogo de cambio de estado mantiene sus botones fijos y hace scroll interno en pantallas bajas.
## Supuestos de negocio

- **Feriados excluidos del alcance**: los 5 días hábiles descartan solo sábados y domingos.
- **Plazo**: `dueDate = createdAt + 5 días hábiles`, conservando la hora, todo en UTC. Si el reclamo entra en fin de semana, el primer día hábil contado es el lunes siguiente (sábado/domingo → viernes de la semana próxima).
- **Email exacto**: la consulta pública compara el email de forma ordinal (sensible a mayúsculas), siguiendo "coincide exactamente".
- **Folio**: correlativo por año (`REC-AAAA-NNNNNN`). Si un insert falla tras reservar el número, queda un hueco, nunca un duplicado.
- **Códigos**: validación semántica → 422 (en POST también, la consigna permitía 400/422); transición ilegal → 409 aun si falta el comentario; comentario faltante en transición válida → 422.
- **CI**: 4–20 caracteres alfanuméricos, espacios o guiones (admite complementos como `1234567-1A`).
- **Vista pública**: el seguimiento no expone CI, nombre ni teléfono.
- **Listado admin**: los reclamos vencidos van primero (el más atrasado arriba) y el resto por fecha de registro descendente; `overdue=true` (interruptor "Solo vencidos" en el panel) muestra únicamente los vencidos y se combina con el filtro de estado.
- **Estados finales**: `Resuelto` y `Rechazado` no admiten más cambios; `isOverdue` solo aplica a estados no finales.

## Decisiones

### Tres decisiones de diseño clave

1. **Reglas de negocio en el dominio, no en los controladores.** La máquina de estados y el cálculo de plazos son código puro y estático en `Domain` (`ClaimStateMachine`, `BusinessDaysCalculator`), y `Claim` es la única vía para mutar su estado (setters privados). Las violaciones son excepciones de dominio que un único middleware traduce a ProblemDetails (409/422/404). *Por qué:* es la parte que debe ser correcta y testeable sin base de datos ni HTTP; los controladores quedan sin lógica y el mapeo a códigos HTTP vive en un solo lugar.
2. **Folio seguro ante concurrencia con un `MERGE ... WITH (HOLDLOCK)` por año.** Una tabla `FolioCounters(Year, LastValue)` se incrementa en una sola sentencia atómica que devuelve el nuevo valor; un índice único sobre `Folio` es la red de seguridad. *Por qué:* leer `MAX(folio)+1` genera duplicados bajo carga y una `SEQUENCE` de SQL Server no reinicia por año. Verificado con 25 POST en paralelo: 25 folios únicos y consecutivos.
3. **Anti-enumeración por construcción + consulta resuelta en el servidor.** Folio inexistente y email incorrecto lanzan la **misma** excepción con el mismo mensaje y cuerpo (nada que diferenciar ni por timing de ramas). En el frontend, `/seguimiento` usa una Server Action: el email viaja en POST (no queda en la URL ni en logs de acceso) y el navegador nunca ve la URL interna del API. *Por qué:* la regla de privacidad se rompe fácilmente por detalles laterales (mensajes, status, URLs).

### Qué se simplificó y qué se mejoraría con más horas

Simplificado por tiempo:
- Un único usuario administrador definido por configuración (sin tabla de usuarios, roles ni hash de contraseña con sal); el JWT no tiene *refresh token* ni revocación; el historial no registra **quién** hizo el cambio.
- El JWT se guarda en `sessionStorage`: simple, pero expuesto a XSS. Lo correcto sería una cookie `HttpOnly` emitida por el servidor de Next (BFF).
- Sin feriados (calendario configurable).
- Sin rate limiting en la consulta pública ni protección anti-bots en el formulario.
- Sin pruebas de integración de la API ni E2E dentro del repo (se verificaron manualmente con scripts descartables: curl/Playwright).
- Sin paginación del lado servidor en el seguimiento ni notificaciones por correo al cambiar de estado.
- Secretos de desarrollo en `appsettings.json`/compose.

Con más horas:
- Usuarios en base de datos con hash (Argon2/PBKDF2), roles, OIDC, *refresh tokens* y registro del actor en `ClaimStatusHistory`; rotación de claves.
- Rate limiting por IP real (requiere propagar `X-Forwarded-For` desde el servidor de Next) y CAPTCHA.
- Pruebas de integración con `WebApplicationFactory` + Testcontainers y E2E Playwright en CI.
- Idempotency-Key en `POST /api/claims` para evitar duplicados por reintentos de red.
- Outbox + correo/SMS al cliente; auditoría y observabilidad (OpenTelemetry).
- Calendario de feriados configurable por país.

### Algo que hubo que investigar/aprender

- **Next.js 16 con Cache Components.** El proyecto generado traía `cacheComponents` activado y un `AGENTS.md` advirtiendo que la versión difiere de lo conocido. En ese modelo, todo dato de la petición (`searchParams`, fetch sin caché) debe resolverse dentro de `<Suspense>` o el build falla. Lo resolví leyendo la documentación incluida en `node_modules/next/dist/docs` y estructurando `/seguimiento` como shell estático + sección dinámica en Suspense.
- **React 19 reinicia los formularios tras una Server Action.** Los campos del seguimiento volvían a vaciarse; la solución fue devolver los valores enviados en el estado de la acción y usarlos como `defaultValue`.
- **Foco tras error de servidor.** Un input `disabled` no puede recibir foco; al enfocar el primer campo inválido durante el envío fallaba silenciosamente. Se detectó con la prueba E2E y se corrigió enfocando en un efecto cuando el envío termina.
- **EF Core y `--no-build`.** Generar la migración con `--no-build` no la incluía en el ensamblado ya compilado, y la API arrancó sin tablas; hay que recompilar antes de ejecutar.

## Variables de entorno

| Variable | Dónde | Descripción | Predeterminado |
|---|---|---|---|
| `ConnectionStrings__DefaultConnection` | API | Cadena de conexión SQL Server | `localhost,1433` |
| `Admin__ApiKey` | API | Clave del header `X-Api-Key` | `admin-secret-key-2026` |
| `Admin__Username` / `Admin__Password` | API | Credenciales del panel (login → JWT) | solo Development / compose |
| `Jwt__SigningKey` | API | Secreto HMAC del JWT (mín. 32 caracteres) | **sin valor por defecto** fuera de Development |
| `Jwt__ExpiryMinutes` | API | Vigencia del token | `60` |
| `Cors__AllowedOrigins__0` | API | Origen permitido del frontend | `http://localhost:3000` |
| `Database__ApplyMigrationsOnStartup` | API | Migrar al iniciar | `true` |
| `Database__Seed` | API | Cargar datos semilla si está vacío | `true` |
| `NEXT_PUBLIC_API_URL` | Web (build) | URL del API vista por el navegador | `http://localhost:5017` |
| `API_URL` | Web (runtime) | URL del API vista por el servidor de Next | `NEXT_PUBLIC_API_URL` |
| `MSSQL_SA_PASSWORD` | compose | Contraseña de `sa` | ver `.env.example` |
