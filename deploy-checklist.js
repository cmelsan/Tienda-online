#!/usr/bin/env node

/**
 * 🚀 DEPLOY CHECKLIST - SISTEMA POST-VENTA ADMIN
 * 
 * Ejecuta este script ANTES de hacer push a main
 * node deploy-checklist.js
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;

const log = (type, message) => {
    const icons = {
        pass: '✅',
        fail: '❌',
        warn: '⚠️',
        info: 'ℹ️'
    };
    console.log(`${icons[type]} ${message}`);
};

console.log('\n🔍 INICIANDO VERIFICACIÓN DE DEPLOY\n');
console.log('═'.repeat(60));

// 1. Verificar archivos
log('info', 'PASO 1: Verificando archivos...\n');

const requiredFiles = [
    'src/components/admin/AdminOrderActions.tsx',
    'src/components/admin/AdminOrderRow.tsx',
    'src/pages/api/admin/cancel-order.ts',
    'src/pages/api/admin/mark-shipped.ts',
    'src/pages/api/admin/mark-delivered.ts',
    'src/pages/api/admin/process-return.ts',
    'rpc_admin_post_sale.sql',
    'ADMIN_POST_SALE_SETUP.md',
    'SISTEMA_POST_VENTA_RESUMEN.md',
    'MATRIZ_VALIDACION_BUGS.md'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    if (exists) {
        log('pass', `${file}`);
        passed++;
    } else {
        log('fail', `${file} NO ENCONTRADO`);
        failed++;
    }
});

console.log(`\n→ Archivos: ${passed}/${requiredFiles.length} ✓\n`);

// 2. Verificar contenido crítico
log('info', 'PASO 2: Verificando contenido crítico...\n');

try {
    // AdminOrderActions
    const actionContent = fs.readFileSync('src/components/admin/AdminOrderActions.tsx', 'utf8');
    if (actionContent.includes('admin_cancel_order_atomic') || actionContent.includes('admin_mark_shipped')) {
        log('pass', 'AdminOrderActions.tsx contiene referencias a RPC');
        passed++;
    } else {
        log('fail', 'AdminOrderActions.tsx NO tiene referencias a RPC');
        failed++;
    }
    
    // AdminOrderRow
    const rowContent = fs.readFileSync('src/components/admin/AdminOrderRow.tsx', 'utf8');
    if (rowContent.includes('AdminOrderActions')) {
        log('pass', 'AdminOrderRow.tsx importa AdminOrderActions');
        passed++;
    } else {
        log('fail', 'AdminOrderRow.tsx NO importa AdminOrderActions');
        failed++;
    }
    
    // SQL RPC
    const sqlContent = fs.readFileSync('rpc_admin_post_sale.sql', 'utf8');
    const rpcFunctions = [
        'admin_cancel_order_atomic',
        'admin_mark_shipped',
        'admin_mark_delivered',
        'admin_process_return',
        'get_order_available_actions'
    ];
    
    rpcFunctions.forEach(fn => {
        if (sqlContent.includes(`CREATE OR REPLACE FUNCTION ${fn}`)) {
            log('pass', `RPC function ${fn}() definida`);
            passed++;
        } else {
            log('fail', `RPC function ${fn}() NO encontrada`);
            failed++;
        }
    });
    
    // API handlers
    const apiFiles = [
        'src/pages/api/admin/cancel-order.ts',
        'src/pages/api/admin/mark-shipped.ts',
        'src/pages/api/admin/mark-delivered.ts',
        'src/pages/api/admin/process-return.ts'
    ];
    
    apiFiles.forEach(apiFile => {
        const apiContent = fs.readFileSync(apiFile, 'utf8');
        if (apiContent.includes('profiles') && apiContent.includes('is_admin') && apiContent.includes('rpc')) {
            log('pass', `${path.basename(apiFile)} tiene validaciones`);
            passed++;
        } else {
            log('fail', `${path.basename(apiFile)} NO tiene todas las validaciones`);
            failed++;
        }
    });

} catch (error) {
    log('fail', `Error leyendo archivos: ${error.message}`);
    failed++;
}

console.log(`\n→ Contenido: ${passed}/${requiredFiles.length + 5} ✓\n`);

// 3. Verificar TypeScript
log('info', 'PASO 3: Verificando TypeScript...\n');

const tsConfigPath = 'tsconfig.json';
if (fs.existsSync(tsConfigPath)) {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    log('pass', 'tsconfig.json existe');
    passed++;
} else {
    log('fail', 'tsconfig.json NO encontrado');
    failed++;
}

// 4. Verificar environment
log('info', 'PASO 4: Verificando variables de entorno...\n');

const envFile = '.env.local';
if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    if (envContent.includes('SUPABASE_URL')) {
        log('pass', 'SUPABASE_URL configurada');
        passed++;
    } else {
        log('warn', 'SUPABASE_URL NO está en .env.local');
    }
    
    if (envContent.includes('SUPABASE_ANON_KEY')) {
        log('pass', 'SUPABASE_ANON_KEY configurada');
        passed++;
    } else {
        log('warn', 'SUPABASE_ANON_KEY NO está en .env.local');
    }
    
    if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        log('pass', 'SUPABASE_SERVICE_ROLE_KEY configurada');
        passed++;
    } else {
        log('fail', 'SUPABASE_SERVICE_ROLE_KEY NO está - CRÍTICO para admin');
        failed++;
    }
} else {
    log('warn', '.env.local NO encontrado - verifica env online');
}

console.log(`\n→ Environment: Configuración verificada\n`);

// 5. Warnings & recomendaciones
log('info', 'PASO 5: Recomendaciones finales...\n');

const recommendations = [
    'Ejecuta las RPC functions en Supabase SQL Editor (rpc_admin_post_sale.sql)',
    'Prueba la cancelación de un pedido y verifica que stock se restaure',
    'Verifica order_status_history en BD',
    'No admins deben recibir error 403',
    'Botones deben aparecer según estado del pedido',
    'Doble-click en "Cancelar" debe fallar en 2da vez'
];

recommendations.forEach(rec => {
    log('warn', rec);
});

console.log('\n' + '═'.repeat(60));
console.log('\n📊 RESULTADO FINAL\n');
console.log(`✅ Pasadas: ${passed}`);
console.log(`❌ Fallidas: ${failed}`);

if (failed === 0) {
    console.log('\n🎉 ¡TODO LISTO PARA DEPLOY!\n');
    console.log('Próximos pasos:');
    console.log('  1. npm run build');
    console.log('  2. npm run preview');
    console.log('  3. Prueba la UI: http://localhost:3000/admin/pedidos');
    console.log('  4. git add .');
    console.log('  5. git commit -m "feat: admin post-sale management"');
    console.log('  6. git push\n');
    process.exit(0);
} else {
    console.log('\n⚠️  REVISA LOS ERRORES ANTES DE HACER PUSH\n');
    process.exit(1);
}
