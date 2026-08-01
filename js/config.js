/* ==========================================================================
   CONTA-SMART SENA - Configuración Global
   ========================================================================== */

const CONFIG = {
  APP_NAME: 'ContaSmart SENA',
  APP_VERSION: '1.0.0',
  PROJECT_SUBTITLE: 'Sistema de Inventario y Contabilidad Comercial',
  DEFAULT_CURRENCY: 'COP',
  DB_NAME: 'ContaSmartDB',
  DB_VERSION: 1,

  // Configuración predeterminada de Supabase (modificable por el usuario en la interfaz)
  SUPABASE_DEFAULT_URL: 'https://xyzcompany.supabase.co',
  SUPABASE_DEFAULT_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key',

  // Categorías de Gastos predefinidas
  EXPENSE_CATEGORIES: [
    { id: 'proveedores', label: 'Compras a Proveedores / Mercancía' },
    { id: 'servicios', label: 'Servicios Públicos (Agua, Luz, Internet)' },
    { id: 'arriendo', label: 'Arriendo de Local / Bodega' },
    { id: 'nomina', label: 'Pago de Nómina / Empleados' },
    { id: 'otros', label: 'Otros Gastos Operativos' }
  ],

  // Categorías de Inventario por defecto (El usuario puede añadir más libremente)
  DEFAULT_PRODUCT_CATEGORIES: [
    'Calzado',
    'Ropa',
    'Accesorios',
    'Abarrotes',
    'Tecnología',
    'General'
  ]
};

window.CONFIG = CONFIG;
