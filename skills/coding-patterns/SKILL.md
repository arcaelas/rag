# Coding Patterns

Skill para nomenclatura, patrones de codigo, y convenciones TypeScript/React.

## Nomenclatura General

| Elemento | Convencion | Ejemplo |
|----------|------------|---------|
| Variables | snake_case | `user_id`, `is_loading` |
| Funciones | snake_case | `get_user()`, `calculate_total()` |
| Funciones privadas | _snake_case | `_validate_input()` |
| Clases | PascalCase | `UserController`, `PaymentService` |
| Metodos de clase | snake_case | `get_email()`, `set_password()` |
| Metodos privados | _snake_case | `_generate_token()` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Constantes locales | snake_case | `default_value` |
| Enums | PascalCase (keys UPPER) | `Status { ACTIVE, PENDING }` |
| Interfaces/Types | PascalCase | `UserProps`, `ApiResponse` |
| Tipos globales | I{Dominio} | `IAuth.User`, `IProduct.Item` |
| Archivos | snake_case | `user_controller.ts` |
| Carpetas | snake_case | `user_profile/` |

## Nomenclatura React

### Componentes

```typescript
// Nombre: PascalCase
// Archivo: PascalCase carpeta con index.tsx
// components/UserCard/index.tsx

export const UserCard = memo(function UserCard({ user_id, on_click }: UserCardProps) {
  // Props: snake_case
  return <div onClick={on_click}>{user_id}</div>
})
```

### useState

```typescript
// Variable: snake_case
// Setter: camelCase (excepcion React)
const [is_loading, setIsLoading] = useState(false)
const [user_data, setUserData] = useState<User | null>(null)
```

### Custom Hooks

```typescript
// Archivo: snake_case (use_cart.tsx)
// Export: camelCase (convencion React)

// src/lib/use_cart.tsx
"use client"
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const add_item = useCallback((product_id: string) => {
    setItems(prev => [...prev, { product_id, quantity: 1 }])
  }, [])

  return { items, add_item }
}
```

### Orden de Hooks en Componentes

```typescript
export const MyComponent = memo(function MyComponent(props: Props) {
  // 1. State hooks
  const [is_open, setIsOpen] = useState(false)

  // 2. Custom hooks
  const { user } = useAuth()
  const { items } = useCart()

  // 3. Memoized callbacks
  const handle_click = useCallback(() => {
    setIsOpen(true)
  }, [])

  // 4. Effects
  useEffect(() => {
    // setup
    return () => {
      // cleanup OBLIGATORIO si hay subscripciones
    }
  }, [])

  // 5. Helpers locales (si son necesarios)
  const format_date = (date: Date) => date.toISOString()

  // 6. Return JSX
  return <div>...</div>
})
```

### memo() Obligatorio

```typescript
// CORRECTO - siempre con memo()
export const Button = memo(function Button({ label, on_click }: ButtonProps) {
  return <button onClick={on_click}>{label}</button>
})

// PROHIBIDO - sin memo()
export function Button({ label, on_click }: ButtonProps) {
  return <button onClick={on_click}>{label}</button>
}
```

## Arquitectura de Metodos

### Self-Contained (OBLIGATORIO)

Los metodos deben ser completos y autosuficientes. NO fragmentar en helpers privados.

```typescript
// CORRECTO - metodo self-contained
class UserController {
  async get(id: string): Promise<User> {
    const user = await db.users.findUnique({ where: { id } })
    if (!user) throw new NotFoundError('User not found')
    return user
  }

  async update(id: string, data: UpdateInput): Promise<User> {
    // Recicla get() para validacion
    await this.get(id)
    return db.users.update({ where: { id }, data })
  }
}

// PROHIBIDO - fragmentado en helpers
class UserController {
  private _validate_id(id: string) { ... }
  private _check_exists(id: string) { ... }
  private _format_response(user: User) { ... }

  async get(id: string) {
    this._validate_id(id)
    const user = await this._check_exists(id)
    return this._format_response(user)
  }
}
```

### Reciclaje de Metodos Publicos

```typescript
class ProductController {
  // Metodo base
  get(id: string): Product {
    const product = db.products.findUnique({ where: { id } })
    if (!product) throw new Error('Not found')
    return product
  }

  // Recicla get() para validar existencia
  update(id: string, data: UpdateInput): Product {
    this.get(id)  // Valida que existe
    return db.products.update({ where: { id }, data })
  }

  // Recicla get() para validar existencia
  delete(id: string): void {
    this.get(id)  // Valida que existe
    db.products.delete({ where: { id } })
  }
}
```

## Package Managers

| Herramienta | Uso | Ejemplo |
|-------------|-----|---------|
| yarn | Todo lo local | `yarn add axios`, `yarn dev` |
| npm | Solo globales | `npm i -g typescript` |
| npx | One-off sin instalar | `npx create-next-app` |

```bash
# LOCAL (yarn)
yarn                     # Instalar dependencias
yarn add axios           # Agregar dependencia
yarn add -D typescript   # Agregar devDependency
yarn dev                 # Ejecutar script

# GLOBAL (npm)
npm i -g eslint          # Instalar CLI global

# ONE-OFF (npx)
npx prettier --write .   # Ejecutar sin instalar
```

## TypeScript

### Tipos Globales

```typescript
// lib/auth/types.d.ts
declare namespace IAuth {
  interface User {
    id: string
    email: string
  }

  interface Session {
    user: User
    token: string
  }
}

// Uso en cualquier archivo (sin import)
const user: IAuth.User = { id: '1', email: 'test@test.com' }
```

### Utility Types Preferidos

```typescript
// Partial - todos opcionales
type UpdateUser = Partial<User>

// Pick - seleccionar campos
type UserPreview = Pick<User, 'id' | 'name'>

// Omit - excluir campos
type CreateUser = Omit<User, 'id' | 'created_at'>

// Record - objeto tipado
type UserMap = Record<string, User>
```

## Prohibiciones

- Variables/funciones en camelCase (usar snake_case)
- Componentes sin carpeta propia
- Componentes sin memo()
- useState setter en snake_case (usar camelCase)
- Fragmentar logica en helpers privados
- `npm install` o `npm run` en proyectos locales
- Tipos en `index.ts` (usar `types.d.ts`)
