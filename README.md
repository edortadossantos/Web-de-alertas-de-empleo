# 🎯 Alertas de Empleo

Aplicación web que permite a cualquier persona registrar alertas de empleo personalizadas y recibir automáticamente por email las nuevas ofertas que encajan con sus filtros.

---

## ✨ Funcionalidades

- **Registro de alertas** con email, puesto, ciudad o provincia, salario mínimo y modalidad (presencial, teletrabajo, híbrido — selección múltiple)
- **Correo inmediato** al registrarse con las primeras ofertas encontradas
- **Actualización diaria** automática via cron job
- **Deduplicación** — nunca se envía la misma oferta dos veces al mismo usuario
- **Email HTML** con diseño profesional, tarjetas por oferta y botón "Ver oferta"
- **Filtro de relevancia** — solo se envían ofertas relacionadas con el puesto buscado
- **Gestión de alertas** — listar, silenciar, reactivar o borrar desde la propia web
- **Panel de administración** en `/admin` con métricas, gráficos y gestión de usuarios
- **Seguridad** — RLS en Supabase, autenticación por token en el scraper, rate limiting

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Usuario final                         │
└──────────────────────┬──────────────────────────────────┘
                       │ Rellena formulario
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js App (Vercel)                        │
│                                                          │
│  ┌─────────────┐    ┌──────────────────────────────┐    │
│  │  app/       │    │  app/api/                    │    │
│  │  page.js    │    │                              │    │
│  │  (UI)       │    │  save-alert/route.js         │    │
│  │             │    │  ├─ Valida y guarda alerta   │    │
│  │  admin/     │    │  └─ Trigger inmediato ──┐    │    │
│  │  page.js    │    │                         │    │    │
│  │  (Panel)    │    │  run-scraper/route.js ◄─┘    │    │
│  └─────────────┘    │  ├─ Busca en Adzuna           │    │
│                     │  ├─ Busca en Indeed           │    │
│                     │  ├─ Filtra relevancia         │    │
│                     │  ├─ Deduplica                 │    │
│                     │  └─ Envía email HTML          │    │
│                     │                              │    │
│                     │  scraper/logic.js            │    │
│                     │  (lógica compartida)         │    │
│                     │                              │    │
│                     │  admin/auth/route.js         │    │
│                     │  admin/stats/route.js        │    │
│                     └──────────────────────────────┘    │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────┐
│    Supabase      │   │   Gmail SMTP          │
│                  │   │                       │
│  alerts          │   │  buscador.empleo      │
│  jobs-sent       │   │  .bot@gmail.com       │
│  muted_emails    │   │                       │
└──────────────────┘   └──────────────────────┘

           ▲
           │ Cron diario (09:00 UTC)
┌──────────────────┐
│  Vercel Cron     │
│  vercel.json     │
└──────────────────┘
```

---

## 🗂️ Estructura del proyecto

```
web-de-alertas-de-empleo/
├── app/
│   ├── page.js                      # UI principal (formulario + gestión)
│   ├── layout.js                    # Layout raíz
│   ├── globals.css
│   ├── admin/
│   │   └── page.js                  # Panel de administración
│   └── api/
│       ├── save-alert/
│       │   └── route.js             # Guardar alerta + trigger scraper
│       ├── run-scraper/
│       │   └── route.js             # Scraper + envío de emails
│       ├── scraper/
│       │   └── logic.js             # Lógica compartida del scraper
│       ├── alerts/
│       │   └── route.js             # Listar alertas por email
│       ├── delete-by-email/
│       │   └── route.js             # Borrar alertas de un email
│       ├── mute-email/
│       │   └── route.js             # Silenciar / reactivar email
│       └── admin/
│           ├── auth/
│           │   └── route.js         # Autenticación del panel admin
│           └── stats/
│               └── route.js         # Estadísticas para el panel admin
├── public/
├── vercel.json                      # Cron job diario
├── package.json
└── .env.local                       # Variables de entorno (no subir a git)
```

---

## 🔄 Flujo de funcionamiento

```
Usuario registra alerta
        │
        ▼
save-alert valida + guarda en Supabase
        │
        ├──► Responde "Alerta guardada" al usuario (inmediato)
        │
        └──► runScraper(email) en background
                    │
                    ▼
             Busca en Adzuna API
             Busca en Indeed (scraping)
                    │
                    ▼
             Filtra por relevancia
             (título oferta ↔ puesto buscado)
                    │
                    ▼
             Filtra por modalidad
             (presencial / teletrabajo / híbrido)
                    │
                    ▼
             Deduplica contra jobs-sent
                    │
                    ▼
             Guarda en jobs-sent
             Envía email HTML
```

---

## 🗄️ Base de datos (Supabase)

| Tabla | Descripción |
|---|---|
| `alerts` | Alertas registradas por los usuarios |
| `jobs-sent` | Historial de ofertas enviadas (deduplicación) |
| `muted_emails` | Emails silenciados que no recibirán avisos |

### Tabla `alerts`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | ID único |
| `email` | text | Email del usuario |
| `job_title` | text | Puesto buscado |
| `city` | text | Ciudad o provincia |
| `country` | text | País |
| `mode` | jsonb | Array de modalidades: `["onsite","remote","hybrid"]` |
| `salary_min` | integer | Salario mínimo (opcional) |

---

## ⚙️ Variables de entorno

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase |
| `EMAIL` | Email remitente (Gmail) |
| `EMAIL_PASS` | App Password de Gmail |
| `ADZUNA_APP_ID` | ID de la app en Adzuna API |
| `ADZUNA_APP_KEY` | Clave de la app en Adzuna API |
| `CRON_SECRET` | Token de autenticación para el endpoint del scraper |
| `ADMIN_PASSWORD` | Contraseña del panel de administración |
| `NEXT_PUBLIC_BASE_URL` | URL base del proyecto en producción |
| `ADZUNA_MAX_PAGES` | (Opcional) Límite de páginas por búsqueda en Adzuna |
| `ADZUNA_MAX_RESULTS_PER_ALERT` | (Opcional) Límite de resultados por alerta |
| `EMAIL_CHUNK_SIZE` | (Opcional) Máx. ofertas por email (default: 100) |

---

## 🚀 Despliegue

El proyecto está desplegado en **Vercel** con conexión directa al repositorio de GitHub. Cada push a `main` genera un nuevo deployment automático.

El cron job está configurado en `vercel.json` para ejecutarse una vez al día a las 09:00 UTC (plan Hobby de Vercel).

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router), React |
| Backend | Next.js API Routes (Node.js runtime) |
| Base de datos | Supabase (PostgreSQL) |
| Email | Nodemailer + Gmail SMTP |
| Fuentes de empleo | Adzuna API + Indeed (scraping) |
| Despliegue | Vercel |

---

## 📬 Contacto

Proyecto desarrollado por **Edorta Dos Santos**.