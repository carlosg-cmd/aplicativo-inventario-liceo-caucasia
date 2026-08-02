/* ==========================================================================
   CONTA-SMART SENA - Configuración Global
   ========================================================================== */

const CONFIG = {
  APP_NAME: 'ContaSmart SENA',
  APP_VERSION: '1.1.0',
  PROJECT_SUBTITLE: 'Sistema de Inventario y Contabilidad Comercial Adaptable',
  DEFAULT_CURRENCY: 'COP',
  DB_NAME: 'ContaSmartDB',
  DB_VERSION: 2, // Versión 2 con Store configuracion

  // Configuración predeterminada de Supabase
  SUPABASE_DEFAULT_URL: 'https://jsdvbuzqxdhvgikqhffo.supabase.co',
  SUPABASE_DEFAULT_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZHZidXpxeGRodmdpa3FoZmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MTIwNTIsImV4cCI6MjEwMTE4ODA1Mn0.jzonbxNMt5avlk8jjzdt-HrF--2fn9wqG_GrdOyJRMo',

  // Categorías de Gastos predefinidas
  EXPENSE_CATEGORIES: [
    { id: 'proveedores', label: 'Compras a Proveedores / Mercancía' },
    { id: 'servicios', label: 'Servicios Públicos (Agua, Luz, Internet)' },
    { id: 'arriendo', label: 'Arriendo de Local / Bodega' },
    { id: 'nomina', label: 'Pago de Nómina / Empleados' },
    { id: 'otros', label: 'Otros Gastos Operativos' }
  ],

  // Categorías de Inventario por defecto
  DEFAULT_PRODUCT_CATEGORIES: [
    'Calzado',
    'Ropa',
    'Accesorios',
    'Abarrotes',
    'Aseo',
    'Lácteos',
    'Snacks',
    'Bebidas',
    'Medicamentos',
    'Carnes',
    'General'
  ],

  // Plantillas de Campos por Tipo de Negocio (SENA Requerimiento 2.1)
  BUSINESS_TEMPLATES: {
    carniceria: {
      label: 'Carnicería',
      fields: [
        { nombre: 'nombre', label: 'Corte / Producto', tipo: 'texto', fijo: true, requerido: true },
        { nombre: 'tipo_corte', label: 'Tipo de Corte', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'precio_compra', label: 'Precio Compra ($/Kg)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'precio_venta', label: 'Precio Venta ($/Kg)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock', label: 'Stock (Kg)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock_minimo', label: 'Stock Mínimo (Kg)', tipo: 'numerico', fijo: true, requerido: true }
      ],
      sampleRows: [
        { nombre: 'Lomo Ancho de Res', tipo_corte: 'Res - Primera', precio_compra: 22000, precio_venta: 32000, stock: 45, stock_minimo: 10 },
        { nombre: 'Pechuga deshuesada', tipo_corte: 'Pollo', precio_compra: 14000, precio_venta: 21000, stock: 30, stock_minimo: 8 }
      ]
    },
    farmacia: {
      label: 'Farmacia',
      fields: [
        { nombre: 'nombre', label: 'Nombre Medicamento', tipo: 'texto', fijo: true, requerido: true },
        { nombre: 'laboratorio', label: 'Laboratorio', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'precio_compra', label: 'Precio Compra ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'precio_venta', label: 'Precio Venta ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock', label: 'Stock', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock_minimo', label: 'Stock Mínimo', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'fecha_vencimiento', label: 'Fecha Vencimiento', tipo: 'fecha', fijo: false, requerido: false },
        { nombre: 'lote', label: 'Lote', tipo: 'texto', fijo: false, requerido: false }
      ],
      sampleRows: [
        { nombre: 'Acetaminofén 500mg (Caja x 100)', laboratorio: 'Genfar', precio_compra: 8500, precio_venta: 16000, stock: 50, stock_minimo: 10, fecha_vencimiento: '2027-12-31', lote: 'LOT-9982' },
        { nombre: 'Amoxicilina 500mg Cápsulas', laboratorio: 'Lafrancol', precio_compra: 12000, precio_venta: 22500, stock: 25, stock_minimo: 5, fecha_vencimiento: '2027-08-15', lote: 'LOT-4412' }
      ]
    },
    tienda_barrio: {
      label: 'Tienda de barrio / abarrotes',
      fields: [
        { nombre: 'nombre', label: 'Nombre del Producto', tipo: 'texto', fijo: true, requerido: true },
        { nombre: 'categoria', label: 'Categoría', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'precio_compra', label: 'Precio Compra ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'precio_venta', label: 'Precio Venta ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock', label: 'Stock Actual', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock_minimo', label: 'Stock Mínimo', tipo: 'numerico', fijo: true, requerido: true }
      ],
      sampleRows: [
        { nombre: 'Arroz Diana 500g', categoria: 'abarrotes', precio_compra: 2100, precio_venta: 2800, stock: 100, stock_minimo: 20 },
        { nombre: 'Aceite Gourmet 900ml', categoria: 'abarrotes', precio_compra: 12500, precio_venta: 16200, stock: 24, stock_minimo: 6 }
      ]
    },
    ropa_calzado: {
      label: 'Almacén de ropa y calzado',
      fields: [
        { nombre: 'nombre', label: 'Nombre Prenda / Calzado', tipo: 'texto', fijo: true, requerido: true },
        { nombre: 'categoria', label: 'Categoría', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'talla', label: 'Talla', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'color', label: 'Color', tipo: 'texto', fijo: false, requerido: false },
        { nombre: 'precio_compra', label: 'Precio Compra ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'precio_venta', label: 'Precio Venta ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock', label: 'Stock Actual', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock_minimo', label: 'Stock Mínimo', tipo: 'numerico', fijo: true, requerido: true }
      ],
      sampleRows: [
        { nombre: 'Tenis Deportivos Running Pro', categoria: 'Calzado', talla: '40', color: 'Negro/Azul', precio_compra: 85000, precio_venta: 145000, stock: 18, stock_minimo: 5 },
        { nombre: 'Camiseta Algodón Premium', categoria: 'Ropa', talla: 'M', color: 'Blanco', precio_compra: 22000, precio_venta: 45000, stock: 25, stock_minimo: 8 }
      ]
    },
    personalizado: {
      label: 'Otro / Personalizado',
      fields: [
        { nombre: 'nombre', label: 'Nombre del Producto', tipo: 'texto', fijo: true, requerido: true },
        { nombre: 'precio_compra', label: 'Precio Compra ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'precio_venta', label: 'Precio Venta ($)', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock', label: 'Stock Actual', tipo: 'numerico', fijo: true, requerido: true },
        { nombre: 'stock_minimo', label: 'Stock Mínimo', tipo: 'numerico', fijo: true, requerido: true }
      ],
      sampleRows: [
        { nombre: 'Producto Ejemplo', precio_compra: 10000, precio_venta: 18000, stock: 20, stock_minimo: 5 }
      ]
    }
  }
};

window.CONFIG = CONFIG;
