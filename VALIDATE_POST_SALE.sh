#!/bin/bash
# VALIDACIÓN FINAL DEL SISTEMA POST-VENTA ADMIN
# Ejecuta este script para verificar que todo esté correcto

echo "🔍 INICIANDO VALIDACIÓN DEL SISTEMA POST-VENTA..."
echo ""

# 1. Verificar que los archivos existan
echo "✓ PASO 1: Verificando archivos..."
files=(
    "src/components/admin/AdminOrderActions.tsx"
    "src/components/admin/AdminOrderRow.tsx"
    "src/pages/api/admin/cancel-order.ts"
    "src/pages/api/admin/mark-shipped.ts"
    "src/pages/api/admin/mark-delivered.ts"
    "src/pages/api/admin/process-return.ts"
    "rpc_admin_post_sale.sql"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - NO ENCONTRADO"
    fi
done

echo ""
echo "✓ PASO 2: Verificando que npm run build funciona..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  ✅ Build exitoso"
else
    echo "  ❌ Build falló - verifica los errores"
fi

echo ""
echo "✓ PASO 3: Verificando estructura de base de datos..."
echo "  Recuerda ejecutar en Supabase SQL Editor:"
echo "  1. Abre: https://supabase.com/dashboard"
echo "  2. Ve a SQL Editor"
echo "  3. Copia y ejecuta: rpc_admin_post_sale.sql"
echo ""

echo "✓ PASO 4: Verificando RPC Functions..."
echo "  Las siguientes funciones deben existir:"
echo "  - admin_cancel_order_atomic(uuid, uuid, text)"
echo "  - admin_mark_shipped(uuid, uuid, text)"
echo "  - admin_mark_delivered(uuid, uuid, text)"
echo "  - admin_process_return(uuid, uuid, text, boolean, text)"
echo "  - get_order_available_actions(uuid)"
echo ""

echo "✓ PASO 5: Checklist de ATOMICIDAD..."
echo "  □ Stock se restaura AUTOMÁTICAMENTE al cancelar"
echo "  □ Historial se registra en TODAS las acciones"
echo "  □ NO se pueden cancelar pedidos en 'shipped' o posterior"
echo "  □ return_deadline se calcula al entregar"
echo ""

echo "✓ PASO 6: Checklist de UI/UX..."
echo "  □ Botones aparecen según el estado"
echo "  □ Modal de confirmación funciona"
echo "  □ Notas se pueden añadir"
echo "  □ Checkbox de 'restaurar stock' en devoluciones"
echo ""

echo "✓ PASO 7: Testing manual..."
echo "  TESTS A EJECUTAR:"
echo "  1. Crear un pedido y marcarlo como pagado"
echo "  2. Hacer click en 'Cancelar Pedido'"
echo "  3. Verificar que stock se restaure"
echo "  4. Ir a Base de Datos y verificar order_status_history"
echo ""

echo "✓ PASO 8: Verificando environment variables..."
if [ -z "$SUPABASE_URL" ]; then
    echo "  ⚠️  SUPABASE_URL no está definida"
else
    echo "  ✅ SUPABASE_URL está configurada"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "  ⚠️  SUPABASE_ANON_KEY no está definida"
else
    echo "  ✅ SUPABASE_ANON_KEY está configurada"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "  ⚠️  SUPABASE_SERVICE_ROLE_KEY no está definida (necesaria para admin)"
else
    echo "  ✅ SUPABASE_SERVICE_ROLE_KEY está configurada"
fi

echo ""
echo "=================================="
echo "🎉 VALIDACIÓN COMPLETADA"
echo "=================================="
echo ""
echo "Próximos pasos:"
echo "1. npm run dev"
echo "2. Ve a http://localhost:3000/admin/pedidos"
echo "3. Prueba las acciones"
echo "4. Si todo funciona: git push"
echo ""
