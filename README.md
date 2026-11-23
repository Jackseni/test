# FinTrack — Gestión de finanzas personales

Aplicación web para registrar ingresos y gastos, definir presupuestos mensuales y visualizar reportes. Interfaz en español. Cada usuario ve **solo** sus datos (Supabase Auth + Row Level Security).

## Stack
Next.js 16 (App Router, Server Components/Actions, Cache Components) · React 19 · TypeScript estricto · Tailwind CSS 4 · componentes tipo shadcn/ui (Radix) · Lucide · Recharts · Zod + React Hook Form · Supabase (PostgreSQL + Auth + RLS) · Vitest + React Testing Library · Playwright · ESLint.

## Arquitectura
```
src/app/(auth)        login, registro, recuperación de contraseña (+ server actions)
src/app/(dashboard)   dashboard, transactions, categories, budgets, reports
src/app/auth/callback intercambio de código de Supabase (redirección validada)
src/proxy.ts          refresca la sesión y protege rutas (convención `proxy` de Next 16)
src/components        ui/, layout/, dashboard/, transactions/, categories/, budgets/, charts/, reports/
src/services          acceso a datos tipado (server-only), siempre filtrado por user_id
src/lib               supabase/ (clientes SSR), validations/ (Zod), utils/ (dinero en centavos, fechas, agregación)
supabase/migrations   esquema, funciones/triggers y políticas RLS
tests/                unit/, integration/, e2e/
```
Capas: UI → server actions (auth + rate limit + Zod) → services (scope por `user_id`) → Supabase (RLS como red de seguridad).
Dinero: `NUMERIC(14,2)` en BD; aritmética en centavos enteros en la aplicación (sin floats).

## Equipo multi-agente
| Agente | Archivo | Responsabilidad |
|---|---|---|
| ORCHESTRATOR | `CLAUDE.md` | Planifica, delega, inspecciona, resuelve conflictos, aprueba. Registro en `docs/TASKS.md`. |
| DEVELOP | `.claude/agents/develop.md` | Implementa funcionalidades, migraciones y correcciones. No aprueba su propio trabajo. |
| TESTING | `.claude/agents/testing.md` | Revisión independiente (funcional, validación, seguridad, RLS), escribe tests, nunca modifica código de producción. |

Flujo: PLAN → DELEGATE → DEVELOP → TEST → REVIEW → FIX → RETEST → APPROVE.

## Instalación local
Requisitos: Node.js >= 20.19 (probado con 24), npm.
```bash
npm ci
cp .env.example .env.local   # y completa los valores (ver abajo)
npm run dev                  # http://localhost:3000
```

## Variables de entorno
| Variable | Ámbito | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Clave anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** | No se usa por defecto; nunca la expongas al navegador |
| `NEXT_PUBLIC_SITE_URL` | público | URL pública de la app. **Obligatoria en producción** (redirecciones de auth) |
| `APP_TIMEZONE` | servidor, opcional | Zona IANA para "hoy"/mes actual (por defecto `America/Tegucigalpa`) |

`.env.local` está en `.gitignore`. `.env.example` no contiene valores. Si una clave secreta se pegó en algún sitio compartido, **rótala** en Supabase.

## Configurar Supabase
1. Crea un proyecto en https://supabase.com (plan Free).
2. **Project Settings → API**: copia la URL y la clave anon/publishable.
3. **Aplicar migraciones** (independiente del despliegue en Render), en orden:
   - Opción A, SQL Editor: ejecuta `supabase/migrations/20260101000001_create_tables.sql`, luego `..02_functions_triggers.sql`, luego `..03_rls_policies.sql`.
   - Opción B, CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
   - **No ejecutes `supabase/seed.sql` en producción** (solo desarrollo).
4. **Authentication → URL Configuration**: Site URL = tu URL pública; añade `<SITE_URL>/auth/callback` a *Redirect URLs* (y `http://localhost:3000/auth/callback` para desarrollo).
5. **Authentication → Providers → Email**: mantén **Confirm email activado** (evita revelar si un correo ya existe y es lo que el flujo de registro espera).

## Seguridad y RLS
- RLS activado en `profiles`, `categories`, `transactions`, `budgets`, con políticas explícitas SELECT/INSERT/UPDATE/DELETE basadas en `(select auth.uid())`; UPDATE con `USING` y `WITH CHECK`.
- Privilegios: se revocan todos a `public`/`anon`/`authenticated` y solo se otorgan SELECT/INSERT/UPDATE/DELETE a `authenticated` (impide `TRUNCATE`, que ignora RLS).
- Integridad: clave foránea compuesta `(category_id, user_id, type)` impide usar categorías de otro usuario o de otro tipo; un trigger exige que los presupuestos sean de categorías de gasto; `user_id` es inmutable; montos `> 0`; presupuesto único por categoría/mes; nombres de categoría únicos sin distinguir mayúsculas.
- App: toda server action llama a `getUser()` primero, valida con Zod (campos en lista blanca, sin `user_id` del cliente), limita la tasa y devuelve errores genéricos. Las redirecciones `next` se validan. Cabeceras de seguridad en `next.config.ts`. Sin `dangerouslySetInnerHTML`.
- El registro (`handle_new_user`) crea el perfil y 12 categorías por defecto (SECURITY DEFINER, `search_path=''`, EXECUTE revocado).

## Pruebas
```bash
npm run lint
npx tsc --noEmit
npm test                 # unitarias/integración (Vitest)
npm run build
npm run test:e2e         # Playwright; los flujos con login requieren Supabase real
```
Los e2e que usan credenciales se omiten salvo con `E2E_SUPABASE_CONFIGURED=1` y credenciales de prueba (usa un proyecto Supabase de pruebas, no producción).

## Despliegue en Render (Node Web Service)
La base de datos vive en Supabase; Render solo aloja la app.
1. Sube el repositorio a GitHub/GitLab.
2. En Render: **New → Blueprint** (usa `render.yaml`) o **New → Web Service** manual con:
   - Runtime: Node · Build Command: `npm run build` (o `npm ci && npm run build`) · Start Command: `npm run start`
3. **Environment**: define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (p. ej. `https://fintrack.onrender.com`) y, opcionalmente, `APP_TIMEZONE`. `SUPABASE_SERVICE_ROLE_KEY` solo si la necesitas (no se usa por defecto). Las variables `NEXT_PUBLIC_*` se incorporan en **build**: si las cambias, vuelve a desplegar.
4. En Supabase añade la URL de Render a *Site URL* y `https://<tu-app>.onrender.com/auth/callback` a *Redirect URLs*.
5. Aplica las migraciones en Supabase (ver arriba) antes del primer uso. La app funciona con un proyecto Supabase nuevo tras aplicar las 3 migraciones.
6. Verifica: abre `/login`, registra un usuario, confirma el correo, crea una categoría y una transacción.

El plan Free de Render duerme el servicio tras inactividad (el primer request es lento).

## Limitaciones conocidas
- **No verificado contra un Supabase real ni en navegador**: las migraciones y RLS se probaron en PostgreSQL 16 local con el esquema `auth` simulado; las acciones y páginas se probaron con clientes simulados. Prueba el flujo completo tras configurar Supabase.
- El limitador de tasa es en memoria y por instancia; asume un único proxy delante (usa la entrada más a la derecha de `x-forwarded-for`). Un atacante puede bloquear temporalmente el login de un correo ajeno (límite por correo).
- Los totales "de todo el historial" recorren las filas del usuario (máx. 100 000); para volúmenes grandes conviene una vista/RPC SQL.
- Borrar una categoría elimina en cascada sus presupuestos; no se puede borrar si tiene transacciones.
- `src/types/database.ts` está escrito a mano; mantenlo sincronizado con las migraciones.
- La política DELETE de `profiles` permite que un usuario borre su propia fila de perfil (riesgo bajo aceptado).
- Moneda por defecto HNL (`es-HN`).
