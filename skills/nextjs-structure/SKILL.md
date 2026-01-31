# Next.js Project Structure

Skill para estructura de proyectos Next.js App Router con las convenciones del usuario.

## Estructura Base

```
src/
├── app/                        # Next.js App Router
│   ├── {page}/
│   │   ├── page.tsx           # Vista (route)
│   │   ├── components/        # Componentes locales de pagina
│   │   └── lib/               # Hooks/logica local de pagina
│   │
│   └── api/
│       └── v1/                # API versionada (OBLIGATORIO)
│           └── users/
│               ├── route.ts   # GET, POST /api/v1/users
│               └── [id]/
│                   └── route.ts  # GET, PUT, DELETE /api/v1/users/:id
│
├── components/                 # Componentes globales
│   └── Button/
│       ├── index.tsx          # OBLIGATORIO - entry point
│       ├── components/        # Subcomponentes hijos
│       └── lib/               # Hooks locales del componente
│
└── lib/                        # Logica de negocio global
    ├── auth/
    │   ├── index.ts           # OBLIGATORIO - entry point
    │   └── types.d.ts         # Tipos del modulo
    └── use_cart.tsx           # Hooks globales (snake_case file, camelCase export)
```

## Reglas de Componentes

### Carpeta Obligatoria con index.tsx

Todo componente debe estar en su propia carpeta con `index.tsx`:

```
# CORRECTO
components/
└── UserCard/
    └── index.tsx

# PROHIBIDO
components/
└── UserCard.tsx
```

### Jerarquia de 3 Niveles

Maximo 3 niveles de profundidad: abuelo -> padre -> hijo

```
components/
└── Dashboard/              # Abuelo
    ├── index.tsx
    └── components/
        └── Sidebar/        # Padre
            ├── index.tsx
            └── components/
                └── MenuItem/  # Hijo (ULTIMO nivel permitido)
                    └── index.tsx
```

## Reglas de Imports

### PROHIBIDO: Imports entre hermanos

```typescript
// components/Header/index.tsx
import { Logo } from '../Footer'  // PROHIBIDO - hermanos
```

### PROHIBIDO: Imports hacia tios

```typescript
// components/Dashboard/Sidebar/index.tsx
import { Button } from '../../Header'  // PROHIBIDO - tio
```

### PERMITIDO: Imports validos

```typescript
// Hijo importa de padre
import { use_sidebar } from '../lib/use_sidebar'

// Cualquiera importa de globales
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth'
```

## API Routes Versionadas

Todas las APIs deben estar versionadas:

```
app/api/
├── v1/                    # Version 1 (actual)
│   ├── users/
│   │   └── route.ts
│   └── products/
│       └── route.ts
└── v2/                    # Version 2 (cuando sea necesario)
    └── users/
        └── route.ts
```

### Estructura de Route Handler

```typescript
// app/api/v1/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const users = await get_all_users()
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await create_user(body)
  return NextResponse.json(user, { status: 201 })
}
```

## Tipos Globales

Los tipos globales van en `types.d.ts` dentro de su modulo:

```typescript
// lib/auth/types.d.ts
declare namespace IAuth {
  interface User {
    id: string
    email: string
    role: 'admin' | 'user'
  }

  interface Session {
    user: User
    expires_at: Date
  }
}
```

## Checklist de Estructura

- [ ] Componentes en carpetas con `index.tsx`
- [ ] APIs en `app/api/v1/` (versionadas)
- [ ] Maximo 3 niveles de jerarquia
- [ ] Sin imports entre hermanos
- [ ] Sin imports hacia tios
- [ ] Tipos en `types.d.ts`
- [ ] Hooks globales en `src/lib/`
- [ ] Hooks locales en `Component/lib/`
