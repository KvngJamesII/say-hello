# Redon3 — Frontend ↔ Backend API Guide

> **For frontend developers.** This document explains how the React frontend talks to the Node.js/Express API server, covering every endpoint, every WebSocket event, authentication flow, and which page uses what.

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Project Structure](#2-project-structure)
3. [How API Calls Work](#3-how-api-calls-work)
4. [Authentication Flow](#4-authentication-flow)
5. [API Endpoints Reference](#5-api-endpoints-reference)
   - [Auth](#51-auth)
   - [Bots](#52-bots)
   - [Bot Files](#53-bot-files)
   - [Environment Variables](#54-environment-variables)
   - [Billing](#55-billing)
   - [Dashboard](#56-dashboard)
   - [Account / Settings](#57-account--settings)
   - [Admin](#58-admin)
6. [WebSocket / Real-Time Events](#6-websocket--real-time-events)
7. [Page → API Map](#7-page--api-map)
8. [Design System](#8-design-system)
9. [Local Development Setup](#9-local-development-setup)

---

## 1. Stack Overview

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite |
| **Routing** | [Wouter](https://github.com/molefrog/wouter) (lightweight React Router alternative) |
| **State / Data fetching** | TanStack Query (`@tanstack/react-query`) |
| **HTTP client** | Axios (configured in `src/lib/api.ts`) |
| **Real-time** | Socket.IO client (`socket.io-client`) |
| **Styling** | Tailwind CSS v4 + CSS custom properties |
| **Component library** | Custom components built on [Radix UI](https://www.radix-ui.com/) primitives |
| **Forms** | `react-hook-form` + `zod` for validation |
| **Animations** | Framer Motion |
| **Code editor** | CodeMirror 6 (used in the Files tab of BotDetailPage) |
| **Fonts** | Plus Jakarta Sans (UI) · JetBrains Mono (code/terminal) |

The backend runs on **Express + Node.js** at `https://redon3.com/api` in production, and `http://localhost:3001/api` during development. All routes are prefixed with `/api`.

---

## 2. Project Structure

```
src/
├── App.tsx                  # Route definitions (wouter <Switch>)
├── main.tsx                 # React root mount + providers
├── index.css                # Global CSS variables and Tailwind base
│
├── lib/
│   ├── api.ts               # Axios instance (baseURL=/api, withCredentials)
│   ├── socket.ts            # Socket.IO client singleton
│   └── utils.ts             # cn() class merge helper
│
├── contexts/
│   └── AuthContext.tsx      # Global auth state, login/logout, refreshUser()
│
├── hooks/
│   ├── use-toast.ts         # Toast notification hook (Sonner)
│   └── use-mobile.tsx       # useMediaQuery('(max-width: 768px)')
│
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx   # Sidebar + MobileTopBar + BottomNav wrapper
│   │   ├── Sidebar.tsx           # Desktop left nav (Dashboard/Bots/Billing/Settings)
│   │   ├── BottomNav.tsx         # Mobile fixed bottom nav (4 tabs)
│   │   ├── MobileTopBar.tsx      # Mobile fixed top bar
│   │   └── MarketingNav.tsx      # Public pages nav (Landing/Pricing/Terms)
│   ├── shared/
│   │   ├── ProtectedRoute.tsx    # Redirects to /login if not authenticated
│   │   ├── PlanBadge.tsx         # Basic / Pro badge chip
│   │   └── StatusBadge.tsx       # running / stopped / crashed badge
│   └── ui/                  # Radix-based UI primitives (button, input, etc.)
│
└── pages/
    ├── LandingPage.tsx
    ├── PricingPage.tsx
    ├── CheckoutPage.tsx
    ├── auth/
    │   ├── LoginPage.tsx
    │   ├── SignupPage.tsx
    │   ├── TwoFaPage.tsx
    │   ├── VerifyEmailPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   └── ResetPasswordPage.tsx
    ├── dashboard/
    │   └── DashboardPage.tsx
    ├── bots/
    │   ├── BotsListPage.tsx
    │   ├── NewBotPage.tsx
    │   └── BotDetailPage.tsx     # 4 tabs: Console · Files · Config · Settings
    ├── billing/
    │   └── BillingPage.tsx
    ├── settings/
    │   └── SettingsPage.tsx
    └── admin/
        ├── AdminDashboardPage.tsx
        ├── AdminUsersPage.tsx
        ├── AdminContainersPage.tsx
        ├── AdminCouponsPage.tsx
        ├── AdminTrialCodesPage.tsx
        ├── AdminBroadcastPage.tsx
        ├── AdminPaymentsPage.tsx
        ├── AdminAuditLogPage.tsx
        └── AdminDebugLogsPage.tsx
```

---

## 3. How API Calls Work

### The Axios Instance (`src/lib/api.ts`)

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',          // All calls go to /api/...
  withCredentials: true,    // Always send HTTP-only cookies (JWT)
});
```

**All API calls use this `api` instance** — never raw `fetch` or a different axios instance.

### Automatic Token Refresh

The axios response interceptor handles `401 Unauthorized` automatically:

1. On a `401`, it calls `POST /api/auth/refresh` using the HTTP-only refresh cookie.
2. If refresh succeeds → retries the original request once.
3. If refresh fails and the user is on a protected page → redirects to `/login`.

This means **frontend components never need to handle token expiry manually**.

### Making a Call (example)

```ts
import api from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';

// GET with TanStack Query
const { data: bots } = useQuery({
  queryKey: ['bots'],
  queryFn: async () => {
    const r = await api.get('/bots');
    return r.data; // typed as Bot[]
  },
  refetchInterval: 15_000, // auto-refresh every 15s
});

// POST with useMutation
const start = useMutation({
  mutationFn: async (botId: string) => {
    await api.post(`/bots/${botId}/start`);
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bots'] }),
  onError: (e: any) => toast.error(e.response?.data?.error ?? 'Failed'),
});
```

---

## 4. Authentication Flow

### How auth state works

`AuthContext` holds the logged-in user globally. On app boot it calls `GET /api/auth/me` to restore session from the HTTP-only cookie. If the cookie is valid, the user is set. If not, the user stays `null` and protected routes redirect to `/login`.

```ts
// src/contexts/AuthContext.tsx
const { user, loading, login, logout, refreshUser } = useAuth();

// user shape:
{
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  status: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  hasCompletedOnboarding: boolean;
  plan: string | null;
}
```

### Login flow

```
User submits email + password
    → POST /api/auth/login
    ← { requiresTwoFa: boolean }

If requiresTwoFa → navigate to /login/2fa → POST /api/auth/2fa/verify
If not → refreshUser() → navigate to /dashboard
```

### Cookie-based session

The backend sets two HTTP-only cookies:
- `access_token` — short-lived JWT (15 min)
- `refresh_token` — longer-lived JWT (7 days)

The frontend never reads these cookies directly. The axios `withCredentials: true` ensures they are always sent with every request.

---

## 5. API Endpoints Reference

> **Base URL:** `/api`
> All protected routes require a valid session cookie. No Authorization header needed — cookies handle it automatically.

---

### 5.1 Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Login with email + password |
| `POST` | `/auth/logout` | Yes | Clear session cookies |
| `GET` | `/auth/me` | Yes | Get current user profile |
| `POST` | `/auth/refresh` | No (cookie) | Refresh access token |
| `POST` | `/auth/verify-email` | No | Verify email with OTP code |
| `POST` | `/auth/resend-verification` | No | Resend email verification |
| `POST` | `/auth/forgot-password` | No | Request password reset email |
| `POST` | `/auth/reset-password` | No | Reset password with token |
| `POST` | `/auth/change-password` | Yes | Change password (requires current) |
| `POST` | `/auth/2fa/setup` | Yes | Generate TOTP QR code |
| `POST` | `/auth/2fa/verify` | No | Confirm 2FA code on login |
| `POST` | `/auth/2fa/disable` | Yes | Disable 2FA |

**`POST /auth/register`**
```json
// Request body
{ "email": "user@example.com", "password": "Str0ngPass!", "fullName": "Ada Bot" }

// Response 201
{ "message": "Registration successful. Check your email to verify." }
```

**`POST /auth/login`**
```json
// Request body
{ "email": "user@example.com", "password": "Str0ngPass!" }

// Response 200
{ "requiresTwoFa": false, "user": { ...AuthUser } }

// If 2FA is enabled:
{ "requiresTwoFa": true }
```

**`GET /auth/me`**
```json
// Response 200
{
  "id": "abc123",
  "email": "user@example.com",
  "fullName": "Ada Bot",
  "role": "user",
  "status": "active",
  "emailVerified": true,
  "totpEnabled": false,
  "hasCompletedOnboarding": true,
  "plan": null
}
```

---

### 5.2 Bots

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/bots` | Yes | List all user's bots |
| `POST` | `/bots` | Yes | Create a new bot |
| `GET` | `/bots/:id` | Yes | Get single bot with live stats |
| `PATCH` | `/bots/:id` | Yes | Update name, startFile, or plan |
| `DELETE` | `/bots/:id` | Yes | Delete bot + all files + containers |
| `POST` | `/bots/:id/start` | Yes | Start the bot container |
| `POST` | `/bots/:id/stop` | Yes | Stop the bot container |
| `POST` | `/bots/:id/restart` | Yes | Restart the bot container |
| `GET` | `/bots/:id/stats` | Yes | Get live container metrics |
| `GET` | `/bots/:id/logs` | Yes | Get recent log lines (plain text) |
| `GET` | `/bots/:id/deploy-status` | Yes | Get deployment stage |
| `POST` | `/bots/:id/upload` | Yes | Upload a ZIP file to deploy |

**Bot object shape** (returned from GET /bots and GET /bots/:id):
```json
{
  "id": "4d9f2bdd-a13b-4325-b1cf-0655eac9bfec",
  "userId": "user-123",
  "name": "MyTelegramBot",
  "runtime": "nodejs",
  "startFile": "index.js",
  "plan": "basic",
  "status": "running",
  "memoryUsedMb": 142.5,
  "memoryLimitMb": 400,
  "cpuPercent": 3.2,
  "uptimeSeconds": 86400,
  "createdAt": "2026-05-01T10:00:00.000Z",
  "updatedAt": "2026-05-02T08:30:00.000Z"
}
```

**Bot status values:**
| Status | Meaning |
|---|---|
| `running` | Container is running normally |
| `stopped` | Container stopped intentionally |
| `crashed` | Container exited with non-zero code |
| `setting_up` | ZIP is being extracted / installed |
| `suspended` | Suspended due to billing (not implemented yet) |
| `not_created` | Bot record exists but no container yet |

**Plan values:** `"basic"` or `"pro"`

**`POST /bots`**
```json
// Request body
{ "name": "TradeBot", "runtime": "nodejs", "plan": "basic" }

// Response 201 — returns the new bot object
```

**`PATCH /bots/:id`**
```json
// Request body (all optional)
{ "name": "NewName", "startFile": "bot.py", "plan": "pro" }

// Response 200 — returns updated bot object
```

**`POST /bots/:id/upload`** (multipart form)
```
Content-Type: multipart/form-data
Field: file (required) — a .zip file containing your bot code
Field: startFile (optional string) — override the detected entry point

// Response 200
{
  "message": "Upload received. Deploying…",
  "detectedRuntime": "nodejs",
  "detectedStartFile": "index.js",
  "validationResults": [
    { "status": "success", "text": "package.json found — Node.js bot detected" },
    { "status": "success", "text": "Start file: index.js" }
  ]
}
```

After upload, the bot status becomes `setting_up`. Listen to the `deploy:complete` WebSocket event to know when it's done.

**`GET /bots/:id/stats`**
```json
{
  "cpuPercent": 3.2,
  "memoryUsedMb": 142.5,
  "memoryLimitMb": 400,
  "networkOutBytes": 102400,
  "networkInBytes": 51200,
  "uptimeSeconds": 86400,
  "recordedAt": "2026-05-02T10:00:00.000Z"
}
```

**`GET /bots/:id/deploy-status`**
```json
{
  "stage": "complete",
  "queuePosition": null,
  "error": null
}
// stage values: "upload" | "install" | "complete" | "failed"
```

---

### 5.3 Bot Files

All file operations scope to `/home/bots/{userId}/{botId}/` on the server. Path traversal is blocked server-side.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/bots/:id/files` | Yes | List files in a directory |
| `GET` | `/bots/:id/files/content` | Yes | Read a file's text content |
| `PUT` | `/bots/:id/files/content` | Yes | Write/overwrite a file |
| `POST` | `/bots/:id/files/create` | Yes | Create a new file or directory |
| `DELETE` | `/bots/:id/files` | Yes | Delete a file or directory |
| `POST` | `/bots/:id/files/rename` | Yes | Rename/move a file |
| `POST` | `/bots/:id/files/clone` | Yes | Duplicate a file |
| `GET` | `/bots/:id/files/download` | Yes | Download a file (streams binary) |
| `POST` | `/bots/:id/files/upload` | Yes | Upload one or more files (multipart) |

**`GET /bots/:id/files?path=/`**
```json
// Response — array of entries
[
  { "name": "index.js", "isDir": false, "size": 2048, "modified": "2026-05-01T10:00:00.000Z" },
  { "name": "node_modules", "isDir": true, "size": 0, "modified": "2026-05-01T10:00:00.000Z" }
]
```

**`GET /bots/:id/files/content?path=/index.js`**
```json
{ "content": "console.log('Hello bot!');\n" }
```

**`PUT /bots/:id/files/content`**
```json
// Request body
{ "path": "/index.js", "content": "console.log('Updated!');\n" }

// Response 200
{ "ok": true }
```

**`POST /bots/:id/files/create`**
```json
// Request body
{ "path": "/utils/helpers.js", "type": "file" }
// or
{ "path": "/utils", "type": "dir" }

// Response 200
{ "ok": true }
```

**`POST /bots/:id/files/rename`**
```json
// Request body
{ "from": "/oldname.js", "to": "/newname.js" }
```

**`POST /bots/:id/files/upload`** (multipart)
```
Content-Type: multipart/form-data
Field: files[] — one or more files
Field: relativePaths[] — relative path for each file (for folder uploads)
Field: path — destination directory, e.g. "/"
```

---

### 5.4 Environment Variables

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/bots/:id/env` | Yes | List env vars (values are masked as `••••••••`) |
| `POST` | `/bots/:id/env` | Yes | Add a new env var |
| `PATCH` | `/bots/:id/env/:varId` | Yes | Update an env var |
| `DELETE` | `/bots/:id/env/:varId` | Yes | Delete an env var |

**`GET /bots/:id/env`**
```json
[
  {
    "id": "var-abc-123",
    "key": "BOT_TOKEN",
    "value": "••••••••",
    "createdAt": "2026-05-01T10:00:00.000Z"
  }
]
```

> ⚠️ Values are always masked on the server for security. There is no "reveal" endpoint. The show/hide toggle on the frontend is cosmetic only.

**`POST /bots/:id/env`**
```json
// Request body
{ "key": "BOT_TOKEN", "value": "1234567890:ABC-secret" }

// Response 201
{ "id": "var-abc-123", "key": "BOT_TOKEN", "value": "••••••••", "createdAt": "..." }
```

---

### 5.5 Billing

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/billing/plans` | No | List available plans from DB |
| `GET` | `/billing/subscription` | Yes | Get user's current subscription |
| `POST` | `/billing/checkout` | Yes | Initiate payment / activate free plan |
| `POST` | `/billing/coupon/validate` | Yes | Validate a coupon code |
| `GET` | `/billing/payments` | Yes | Paginated payment history |
| `POST` | `/billing/webhook/paystack` | No (signed) | Paystack webhook (server-side only) |

**`GET /billing/plans`**
```json
[
  {
    "id": "basic",
    "name": "Basic",
    "priceKobo": 140000,
    "botLimit": 1,
    "ramPerBotMb": 400,
    "cpuPerBot": 0.5,
    "storageGb": 3,
    "features": {}
  },
  {
    "id": "pro",
    "name": "Pro",
    "priceKobo": 299900,
    "botLimit": 1,
    "ramPerBotMb": 768,
    "cpuPerBot": 1.0,
    "storageGb": 10,
    "features": {}
  }
]
```

> Note: `priceKobo` is price in Nigerian kobo (₦1 = 100 kobo). So `140000` = ₦1,400.

**`GET /billing/subscription`**
```json
{
  "id": "sub-abc-123",
  "planId": "basic",
  "planName": "Basic",
  "priceKobo": 140000,
  "status": "active",
  "startDate": "2026-05-01T00:00:00.000Z",
  "expiryDate": "2026-06-01T00:00:00.000Z",
  "graceEndDate": null
}
// Returns 404 if no active subscription
```

**`POST /billing/checkout`**
```json
// Request body
{
  "planId": "basic",
  "couponCode": "PROMO20",       // optional
  "callbackUrl": "https://redon3.com/dashboard"
}

// Response — free/coupon plan:
{ "checkoutUrl": null, "free": true, "message": "Plan activated successfully!" }

// Response — paid plan:
{ "checkoutUrl": "https://checkout.paystack.com/...", "free": false, "message": "Redirecting..." }
```

When `free: false`, redirect the user to `checkoutUrl`. After payment, Paystack calls the webhook and the plan activates automatically.

**`POST /billing/coupon/validate`**
```json
// Request body
{ "code": "PROMO20", "planId": "basic" }

// Response — valid:
{
  "valid": true,
  "discountPercent": 20,
  "originalPriceKobo": 140000,
  "finalPriceKobo": 112000,
  "isFree": false,
  "error": null
}

// Response — invalid:
{
  "valid": false,
  "discountPercent": 0,
  "originalPriceKobo": 0,
  "finalPriceKobo": 0,
  "isFree": false,
  "error": "This code is not valid or has expired"
}
```

**`GET /billing/payments?page=1&limit=10`**
```json
{
  "payments": [
    {
      "id": "pay-abc",
      "planName": "Basic",
      "amountKobo": 140000,
      "status": "confirmed",
      "type": "new",
      "paystackReference": "redon3_user123_1746000000000",
      "paidAt": "2026-05-01T10:00:00.000Z",
      "createdAt": "2026-05-01T09:58:00.000Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10
}
```

---

### 5.6 Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard/summary` | Yes | Bot counts + bulk discount info |

**`GET /dashboard/summary`**
```json
{
  "totalBots": 4,
  "runningBots": 3,
  "stoppedBots": 1,
  "crashedBots": 0,
  "activeBots": 4,
  "discountPct": 15,
  "botsToNextTier": 3,
  "nextDiscountAt": 7,
  "plan": null,
  "botLimit": null,
  "daysUntilExpiry": null
}
```

**Bulk discount tiers:**
| `activeBots` | `discountPct` |
|---|---|
| 1 | 0% |
| 2–3 | 10% |
| 4–6 | 15% |
| 7+ | 20% |

---

### 5.7 Account / Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| `PATCH` | `/account/profile` | Yes | Update full name |
| `GET` | `/account/notifications` | Yes | Get notification preferences |
| `PATCH` | `/account/notifications` | Yes | Update notification preferences |
| `DELETE` | `/account` | Yes | Delete account permanently |

**`PATCH /account/profile`**
```json
// Request body
{ "fullName": "Ada Bot" }

// Response 200
{ "message": "Profile updated" }
```

---

### 5.8 Admin

All admin routes require `role: "admin"` on the authenticated user. Regular users get `403 Forbidden`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Platform-wide stats |
| `GET` | `/admin/users` | Paginated user list |
| `GET` | `/admin/users/:id` | Single user details |
| `PATCH` | `/admin/users/:id` | Edit user (role, status, plan) |
| `DELETE` | `/admin/users/:id` | Delete user |
| `GET` | `/admin/containers` | All active Docker containers |
| `POST` | `/admin/containers/:id/restart` | Force restart any container |
| `POST` | `/admin/containers/:id/stop` | Force stop any container |
| `GET` | `/admin/coupons` | List all coupons |
| `POST` | `/admin/coupons` | Create coupon |
| `DELETE` | `/admin/coupons/:id` | Delete coupon |
| `GET` | `/admin/trial-codes` | List trial codes |
| `POST` | `/admin/trial-codes` | Generate trial codes |
| `POST` | `/admin/broadcast` | Send notification to all users |
| `GET` | `/admin/payments` | All payments across all users |
| `GET` | `/admin/audit-log` | System audit log |
| `GET` | `/admin/debug-logs` | Server debug logs |

---

## 6. WebSocket / Real-Time Events

The frontend connects to Socket.IO at `/api/socket.io`. The connection is configured in `src/lib/socket.ts`:

```ts
import { io } from 'socket.io-client';

const socket = io({
  path: '/api/socket.io',
  autoConnect: false,    // Connect manually when needed
  withCredentials: true, // Sends session cookies for auth
});

export default socket;
```

### Connection pattern (used in ConsoleTab)

```ts
useEffect(() => {
  if (!socket.connected) socket.connect();
  socket.emit('logs:subscribe', { botId });

  const onLine = (data: { line: string; isStderr: boolean }) => {
    setLines(prev => [...prev, data]);
  };
  socket.on('logs:line', onLine);

  return () => {
    socket.off('logs:line', onLine);
    socket.emit('logs:unsubscribe', { botId });
  };
}, [botId]);
```

### Events Reference

#### Client → Server (emit)

| Event | Payload | Description |
|---|---|---|
| `logs:subscribe` | `{ botId: string }` | Start streaming logs for a bot |
| `logs:unsubscribe` | `{ botId: string }` | Stop streaming logs |
| `stdin:write` | `{ botId: string, data: string }` | Send input to bot's stdin |
| `room:join` | `{ room: string }` | Join a named room (e.g. `bot:${botId}`) |

#### Server → Client (on)

| Event | Payload | Description |
|---|---|---|
| `logs:line` | `{ line: string, isStderr: boolean }` | One line of bot output |
| `deploy:complete` | `{ botId: string }` | ZIP upload/extraction finished |
| `bot:status` | `{ botId: string, status: string }` | Bot status changed |
| `notification` | `{ type: string, message: string }` | Push notification to user |

### Deploy flow (ZIP upload)

```
1. User uploads ZIP → POST /api/bots/:id/upload
2. Server responds immediately with { detectedRuntime, validationResults }
3. Server extracts ZIP in background (async)
4. When done, emits: socket.to(`bot:${botId}`).emit('deploy:complete', { botId })
5. Frontend listens on deploy:complete → invalidates bot query → refreshes UI
```

---

## 7. Page → API Map

| Page / Component | API Calls | Notes |
|---|---|---|
| **App boot** | `GET /auth/me` | Via `AuthContext` on mount |
| **LoginPage** | `POST /auth/login` | Via `useAuth().login()` |
| **SignupPage** | `POST /auth/register` | |
| **TwoFaPage** | `POST /auth/2fa/verify` | |
| **VerifyEmailPage** | `POST /auth/verify-email`, `POST /auth/resend-verification` | |
| **ForgotPasswordPage** | `POST /auth/forgot-password` | |
| **ResetPasswordPage** | `POST /auth/reset-password` | |
| **DashboardPage** | `GET /dashboard/summary`, `GET /bots`, `POST /bots/:id/start\|stop\|restart` | Polls every 15–30s |
| **BotsListPage** | `GET /bots`, `POST /bots/:id/start\|stop\|restart` | Polls every 15s |
| **NewBotPage** | `POST /bots` | Redirects to BotDetailPage on success |
| **BotDetailPage → Console** | Socket.IO `logs:subscribe`, `stdin:write` | Live streaming |
| **BotDetailPage → Files** | `GET /bots/:id/files`, `GET\|PUT /bots/:id/files/content`, `POST /bots/:id/files/upload`, etc. | |
| **BotDetailPage → Config** | `GET /bots/:id/files` (for autocomplete), `PATCH /bots/:id`, `GET\|POST\|DELETE /bots/:id/env` | |
| **BotDetailPage → Settings** | `PATCH /bots/:id`, `DELETE /bots/:id` | |
| **BotDetailPage header** | `GET /bots/:id` (polls every 10s), `POST /bots/:id/start\|stop\|restart` | |
| **BillingPage** | `GET /billing/subscription`, `GET /billing/plans`, `GET /billing/payments`, `POST /billing/coupon/validate`, `POST /billing/checkout` | |
| **CheckoutPage** | `GET /dashboard/summary` (for discount), `POST /billing/coupon/validate`, `POST /billing/checkout` | |
| **PricingPage** | No API calls — fully static | |
| **SettingsPage** | `PATCH /account/profile`, `POST /auth/change-password`, `GET\|PATCH /account/notifications`, `DELETE /account` | |
| **Admin pages** | All `/admin/*` endpoints | |

---

## 8. Design System

### Color tokens (inline style constants used in pages)

All pages define a few local constants at the top of the file instead of using Tailwind classes for colors, to allow for precise RGBA opacity values:

```ts
const BL  = '#3b82f6';                    // Blue — primary actions, Pro plan
const GR  = '#22c55e';                    // Green — running status, success
const B   = 'rgba(255,255,255,0.08)';     // Border color
const S   = 'rgba(255,255,255,0.04)';     // Subtle card background
const DIM = 'rgba(255,255,255,0.5)';      // Dimmed text (descriptions)
const MUT = 'rgba(255,255,255,0.25)';     // Muted text (labels, placeholders)
```

### CSS custom properties (set in `index.css`)

```css
/* Background layers */
--bg-primary:      #060709   /* Main page background */
--bg-secondary:    #0a0c10   /* Sidebar, cards */

/* Accent */
--accent-primary:  #F97316   /* Orange — old primary action color */

/* Typography */
--app-font-sans:   'Plus Jakarta Sans', sans-serif
--app-font-display: 'Plus Jakarta Sans', sans-serif
--app-font-mono:   'JetBrains Mono', monospace
```

> **Note for the redesign:** The inline color constants (`BL`, `GR`, `B`, `S`, `DIM`, `MUT`) are used directly in `style={{}}` props throughout the pages. If you want to switch to a different colour scheme, update these constants at the top of each file.

### Font imports

```css
/* In index.css */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Status → colour mapping

```ts
const STATUS_DOT: Record<string, string> = {
  running:     '#22c55e',                    // green
  stopped:     'rgba(255,255,255,0.25)',     // muted grey
  crashed:     '#ef4444',                    // red
  suspended:   '#f59e0b',                    // amber
  setting_up:  '#3b82f6',                    // blue
  not_created: 'rgba(255,255,255,0.12)',     // very dim
};
```

### Layout system

- **Desktop (md+):** Left sidebar (256px fixed) + scrollable main content area
- **Mobile (< md):** Fixed top bar (80px) + scrollable content + fixed bottom nav (96px)
- **Bot detail page:** Full-screen mode — no page scroll, each tab scrolls internally. Uses `DashboardLayout fullHeight` prop.
- **Max content width:** `max-w-7xl mx-auto` (standard pages) or full-width (bot detail)

### Tailwind classes to know

```
bg-[--bg-primary]     → main dark background
bg-[--bg-secondary]   → slightly lighter (sidebar, cards)
text-[--text-primary] → white text
border-[--border]     → subtle border
text-[--accent-primary] → orange accent
```

---

## 9. Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Access to the API server (either local or the production URL)

### Install

```bash
pnpm install
```

### Run the frontend

```bash
PORT=3080 BASE_PATH=/ pnpm dev
```

The frontend will be at `http://localhost:3080`.

### Connecting to the backend

The Vite dev server does **not** proxy API calls — the `baseURL: '/api'` in `src/lib/api.ts` resolves against the same host the page is served from.

**Option A — Use production API** (quickest for UI-only work):
Edit `src/lib/api.ts` temporarily:
```ts
const api = axios.create({
  baseURL: 'https://redon3.com/api',  // point to production
  withCredentials: true,
});
```
> ⚠️ This will use real production data. Only for read operations during design work.

**Option B — Run the full stack locally**:
The API server runs on port 3001. Add a Vite proxy:
```ts
// vite.config.ts — add inside defineConfig()
server: {
  proxy: {
    '/api': 'http://localhost:3001',
    '/api/socket.io': {
      target: 'http://localhost:3001',
      ws: true,
    },
  },
}
```

### Environment variables

The frontend itself has **no env vars** at runtime — everything flows through the API. At build time, only `PORT` and `BASE_PATH` are required (used by Vite).

```bash
PORT=3080         # Port to serve the dev server on
BASE_PATH=/       # Base URL path (/ for local, /redon3/ if served from a subpath)
```

---

## Quick Reference Card

```
# Auth
POST /api/auth/login              → login
GET  /api/auth/me                 → current user
POST /api/auth/logout             → logout

# Bots
GET  /api/bots                    → list bots
POST /api/bots                    → create bot { name, runtime, plan }
GET  /api/bots/:id                → bot + live stats
PATCH /api/bots/:id               → update { name?, startFile?, plan? }
DELETE /api/bots/:id              → delete bot
POST /api/bots/:id/start          → start container
POST /api/bots/:id/stop           → stop container
POST /api/bots/:id/restart        → restart container
POST /api/bots/:id/upload         → deploy ZIP file

# Files
GET  /api/bots/:id/files          → list dir  ?path=/
GET  /api/bots/:id/files/content  → read file ?path=/file.js
PUT  /api/bots/:id/files/content  → write file { path, content }
POST /api/bots/:id/files/create   → new file/dir { path, type }
DELETE /api/bots/:id/files        → delete { path }
POST /api/bots/:id/files/rename   → rename { from, to }
POST /api/bots/:id/files/upload   → upload multipart files
GET  /api/bots/:id/files/download → download ?path=/file

# Env vars
GET    /api/bots/:id/env          → list vars (masked values)
POST   /api/bots/:id/env          → add { key, value }
DELETE /api/bots/:id/env/:varId   → remove

# Billing
GET  /api/billing/plans           → plan list
GET  /api/billing/subscription    → current sub
POST /api/billing/checkout        → pay { planId, couponCode?, callbackUrl }
POST /api/billing/coupon/validate → check { code, planId }
GET  /api/billing/payments        → history ?page=1&limit=10

# Dashboard
GET /api/dashboard/summary        → counts + discount info

# WebSocket
socket.emit('logs:subscribe', { botId })
socket.on('logs:line', ({ line, isStderr }))
socket.emit('stdin:write', { botId, data })
socket.on('deploy:complete', { botId })
```
