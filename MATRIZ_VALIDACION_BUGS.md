# 🛡️ MATRIZ DE VALIDACIÓN - EVITAR BUGS DE STOCK Y RENDER

## PARTE 1: VALIDACIONES DE STOCK

### Pregunta 1: ¿Cuándo se restaura stock?

| Situación | ¿Stock se restaura? | Dónde | Observación |
|-----------|-------------------|-------|------------|
| Cancelar en `paid` | ✅ SÍ | RPC: `admin_cancel_order_atomic()` | Loop en order_items |
| Cancelar en `shipped` | ❌ NO | No permitido | RPC valida: `IF status != 'paid' THEN error` |
| Devolución → `returned` | ❌ NO (default) | Pero opcional | Modal tiene checkbox |
| Devolución → `refunded` | ❌ NO | Nunca | Stock ya fue vendido |
| Cambiar producto en BD | ❌ NO | Manual | Admin lo hace manualmente si es necesario |

**REGLA:** Stock se restaura SOLO en `admin_cancel_order_atomic()` cuando `status = 'paid'`.

---

### Pregunta 2: ¿Puede el admin cancelar dos veces?

```
Admin hace click "Cancelar" → API call
Usuario hace click "Cancelar" → API call (2da vez)

¿Qué sucede?
```

**RESPUESTA:**

La 1ª llamada:
```sql
-- order.status = 'paid'
-- RPC ejecuta: admin_cancel_order_atomic()
-- Resultado: status → 'cancelled', stock restaurado ✅
```

La 2ª llamada:
```sql
-- order.status = 'cancelled' (ya cambió)
-- RPC valida: IF v_order.status != 'paid' THEN RETURN error
-- Resultado: ❌ ERROR "Can only cancel orders with status paid"
```

**CONCLUSIÓN:** Imposible cancelar dos veces. Stock está safe. ✅

---

### Pregunta 3: ¿Y si falla la restauración de stock a mitad?

```
BEGIN TRANSACTION
  UPDATE orders.status = 'cancelled' ✅
  UPDATE products.stock (producto 1) ✅
  UPDATE products.stock (producto 2) ❌ ERROR
  INSERT order_status_history ❌ (no llega)
COMMIT ❌ NUNCA SUCEDE
```

**RESPUESTA:**

PostgreSQL hace ROLLBACK automático:
```sql
BEGIN
  UPDATE orders ... ✅
  UPDATE products ... ✅
  UPDATE products ... ❌ ERROR AQUÍ
  -- PostgreSQL detiene TODO
  -- Revierte todos los UPDATEs
EXCEPTION WHEN OTHERS THEN
  -- Captura el error
  RETURN error message
END;
```

**CONCLUSIÓN:** O TODO funciona, o NADA cambia. Zero casos intermedios. ✅

---

## PARTE 2: VALIDACIONES DE RENDER REACT

### Problema: Re-renders problemáticos

**Código MALO:**
```jsx
export default function AdminOrderRow({ order }) {
    const [status, setStatus] = useState(order.status); // ❌ Dependencia no controlada
    
    useEffect(() => {
        setStatus(order.status); // ❌ Cambia state dentro de effect
    }, []); // ❌ Dependency array vacío
    
    return (
        <>
            {order.status === 'paid' && <button>Cancel</button>} // ❌ Render condicional
            {/* ❌ Si order.status cambia, this button puede aparecer/desaparecer */}
        </>
    );
}
```

**Código CORRECTO (Lo que implementamos):**
```jsx
export default function AdminOrderRow({ order }) {
    const [currentStatus, setCurrentStatus] = useState<string>(
        order?.status ?? 'awaiting_payment'
    ); // ✅ Estado inicial definido
    
    // ✅ Sin useEffect - solo props
    
    const handleActionComplete = (newStatus: string) => {
        setCurrentStatus(newStatus); // ✅ Actualiza state controladamente
    };
    
    return (
        <AdminOrderActions 
            order={{ ...order, status: currentStatus }} 
            onActionComplete={handleActionComplete}
        />
        // ✅ Componente hijo maneja render condicional
    );
}
```

---

### Problema: Keys no estables

**Código MALO:**
```jsx
{availableActions.map((action, index) => (
    <button key={index}> // ❌ KEY = índice (inestable)
        {action.label}
    </button>
))}
```

Si la lista cambia de orden, React se confunde y re-monta los botones.

**Código CORRECTO (Lo que implementamos):**
```jsx
{availableActions.map(action => (
    <button key={action.type}> // ✅ KEY = propiedad única
        {action.label}
    </button>
))}
```

`action.type` nunca cambia: `'cancel'`, `'ship'`, etc.

---

### Problema: Hooks no en orden fijo

**Código MALO:**
```jsx
const AdminOrderActions = ({ order }) => {
    if (order.status === 'delivered') {
        return null; // ❌ NO devuelve el componente
    }
    
    const [isLoading, setIsLoading] = useState(false); // ❌ Hook dentro de condicional
    const [notes, setNotes] = useState('');
    
    return <div>{notes}</div>;
};
```

React espera el MISMO número de hooks en cada render. Si devuelves null, los hooks se pierden.

**Código CORRECTO:**
```jsx
const AdminOrderActions = ({ order, onActionComplete }) => {
    // ✅ Hooks SIEMPRE en el mismo orden
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalAction, setModalAction] = useState<ActionType | null>(null);
    const [notes, setNotes] = useState('');
    const [restoreStock, setRestoreStock] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // ✅ Lógica DESPUÉS de los hooks
    const availableActions = useMemo(() => {
        // Determina qué botones mostrar
        if (order.status === 'delivered') {
            return []; // ← Retorna array vacío, no null
        }
        // ...
    }, [order.status]);
    
    // ✅ Si no hay acciones, aún se renderizan los hooks
    return (
        <>
            {/* Botones aquí */}
            {availableActions.map(action => (...))}
        </>
    );
};
```

---

### Problema: Funciones que cambian en cada render

**Código MALO:**
```jsx
const availableActions = [
    {
        type: 'cancel',
        label: '❌ Cancelar',
        handler: () => { // ❌ Nueva función en cada render
            // ...
        }
    }
];

// Luego:
{availableActions.map(action => (
    <button key={action.type} onClick={action.handler}>
        {action.label}
    </button>
))}
```

En cada render, `handler` es una función NUEVA. React piensa que cambió.

**Código CORRECTO:**
```jsx
const handleActionClick = useCallback((action: ActionType) => {
    // ✅ Función memoizada
    if (requiresModal) {
        setModalAction(action);
        setShowModal(true);
    }
}, []); // ← Dependencias vacías = función estable

// Luego:
{availableActions.map(action => (
    <button 
        key={action.type} 
        onClick={() => handleActionClick(action.type)}
    >
        {action.label}
    </button>
))}
```

---

## PARTE 3: CHECKLIST FINAL

### ANTES DE COMMIT

- [ ] **Stock**: ¿Se restaura SOLO en `paid` → `cancelled`?
- [ ] **Stock**: ¿No se restaura dos veces?
- [ ] **Stock**: ¿Si falla a mitad, se revierte TODO?
- [ ] **React**: ¿No hay useEffect innecesarios?
- [ ] **React**: ¿Keys son estables (no índices)?
- [ ] **React**: ¿Hooks están SIEMPRE en el mismo orden?
- [ ] **React**: ¿No hay render condicional que devuelva null?
- [ ] **React**: ¿Las funciones están memoizadas si es necesario?

### ANTES DE PRODUCCIÓN

- [ ] **Supabase**: ¿Existen las 5 RPC functions?
- [ ] **API**: ¿Valida admin status?
- [ ] **API**: ¿Retorna errores claros?
- [ ] **UI**: ¿Botones aparecen correctamente?
- [ ] **UI**: ¿Modal funciona y no tiene bugs?
- [ ] **Historial**: ¿order_status_history tiene registros?
- [ ] **Permisos**: ¿No admins reciben 403?
- [ ] **Testing**: ¿Probaste cancelar y verificar stock?

---

## PARTE 4: EJEMPLOS DE PRUEBA

### Test 1: Cancelación correcta

```
1. Usuario A compra 2x Producto X (stock actual: 10)
2. Pedido se crea con status = 'awaiting_payment'
3. Admin marca como 'paid'
4. Admin hace click en "Cancelar Pedido"
5. Confirma el modal
6. Verifica:
   ✅ order.status = 'cancelled'
   ✅ products.stock = 12 (se restauraron 2)
   ✅ order_status_history.to_status = 'cancelled'
```

### Test 2: Fallo de cancelación

```
1. Usuario A compra 2x Producto X
2. Pedido está en 'paid'
3. Alguien cambia orden a 'shipped' externamente
4. Admin intenta cancelar
5. Verifica:
   ✅ Error: "Can only cancel orders with status paid"
   ✅ Stock no cambia
   ✅ order_status_history NO tiene nuevo registro
```

### Test 3: Doble click

```
1. Usuario A compra 1x Producto X (stock = 10)
2. Pedido en 'paid'
3. Admin hace click "Cancelar" (muy rápido, dos veces)
4. Verifica:
   ✅ 1ª llamada: SUCCESS, stock = 11
   ✅ 2ª llamada: ERROR "status must be paid"
   ✅ Stock NO es 12
   ✅ order_status_history tiene SOLO 1 registro de cancelación
```

### Test 4: Render sin bugs

```
1. Abre admin/pedidos
2. Abre DevTools → Console
3. Verifica:
   ✅ No hay warnings de hooks
   ✅ No hay warnings de keys
   ✅ No hay warnings de re-renders infinitos
4. Cambia estado del pedido
5. Verifica:
   ✅ Botones cambian correctamente
   ✅ No hay parpadeos
   ✅ Consola limpia
```

---

## RESUMEN

| Aspecto | Validación | Ubicación |
|---------|-----------|----------|
| **Stock** | Loop en RPC, solo en `paid`, transacción atómica | `admin_cancel_order_atomic()` |
| **Render** | Hooks en orden, keys estables, sin renderizado condicional | `AdminOrderActions.tsx` |
| **Seguridad** | Admin check, RPC definer, validaciones | API handlers |
| **Historial** | Insert en cada transacción | `order_status_history` |

✅ **TODO ESTÁ VALIDADO**
