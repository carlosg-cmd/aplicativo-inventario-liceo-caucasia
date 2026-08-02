/* ==========================================================================
   CONTA-SMART SENA - Mock Data Seed
   ========================================================================== */

const MockData = {
  products: [
    {
      id: 'prod-001',
      nombre: 'Tenis Deportivos Running Pro',
      categoria: 'Calzado',
      precio_compra: 85000,
      precio_venta: 145000,
      stock: 18,
      stock_minimo: 5,
      talla: '40',
      color: 'Negro/Azul',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    },
    {
      id: 'prod-002',
      nombre: 'Zapatos Casuales de Cuero',
      categoria: 'Calzado',
      precio_compra: 95000,
      precio_venta: 169000,
      stock: 4,
      stock_minimo: 6, // Alerta Stock Bajo
      talla: '41',
      color: 'Marrón',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    },
    {
      id: 'prod-003',
      nombre: 'Camiseta Algodón Premium',
      categoria: 'Ropa',
      precio_compra: 22000,
      precio_venta: 45000,
      stock: 25,
      stock_minimo: 8,
      talla: 'M',
      color: 'Blanco',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    },
    {
      id: 'prod-004',
      nombre: 'Jean Clásico Slim Fit',
      categoria: 'Ropa',
      precio_compra: 55000,
      precio_venta: 110000,
      stock: 0, // Agotado
      stock_minimo: 5,
      talla: '32',
      color: 'Azul Oscuro',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    },
    {
      id: 'prod-005',
      nombre: 'Chaqueta Impermeable Urbana',
      categoria: 'Ropa',
      precio_compra: 78000,
      precio_venta: 155000,
      stock: 12,
      stock_minimo: 4,
      talla: 'L',
      color: 'Gris',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    }
  ],

  getTodaySales() {
    const today = Formatters.getTodayString();
    const now = new Date();
    return [
      {
        id: 'sale-101',
        producto_id: 'prod-001',
        nombre_producto: 'Tenis Deportivos Running Pro',
        cantidad: 2,
        precio_unitario: 145000,
        valor_total: 290000,
        fecha: new Date(now.setHours(9, 30, 0)).toISOString(),
        fecha_corta: today,
        sync_status: 'synced'
      },
      {
        id: 'sale-102',
        producto_id: 'prod-003',
        nombre_producto: 'Camiseta Algodón Premium',
        cantidad: 3,
        precio_unitario: 45000,
        valor_total: 135000,
        fecha: new Date(now.setHours(11, 15, 0)).toISOString(),
        fecha_corta: today,
        sync_status: 'synced'
      }
    ];
  },

  getTodayExpenses() {
    const today = Formatters.getTodayString();
    const now = new Date();
    return [
      {
        id: 'exp-201',
        descripcion: 'Pago de servicio de internet de banda ancha',
        categoria: 'servicios',
        empleado: '',
        valor: 95000,
        fecha: new Date(now.setHours(10, 0, 0)).toISOString(),
        fecha_corta: today,
        sync_status: 'synced'
      },
      {
        id: 'exp-202',
        descripcion: 'Pago quincenal de nómina a Auxiliar de Tienda',
        categoria: 'nomina',
        empleado: 'Carlos Mario Restrepo',
        valor: 350000,
        fecha: new Date(now.setHours(12, 30, 0)).toISOString(),
        fecha_corta: today,
        sync_status: 'synced'
      }
    ];
  },

  /**
   * Sembra SOLAMENTE la configuración básica del negocio si no existe.
   * Se ejecuta automáticamente al abrir la aplicación.
   */
  async seedConfigIfEmpty() {
    const savedConfig = await IDB.getById('configuracion', 'business_config');
    if (!savedConfig) {
      const defaultTemplate = CONFIG.BUSINESS_TEMPLATES.ropa_calzado;
      await IDB.put('configuracion', {
        id: 'business_config',
        tipo_negocio: 'ropa_calzado',
        campos_producto: JSON.parse(JSON.stringify(defaultTemplate.fields)),
        updated_at: new Date().toISOString()
      });
    }
  },

  /**
   * Sembra TODOS los datos mock (configuración, productos, ventas, gastos).
   * Solo se ejecuta manualmente desde el botón de configuración.
   */
  async seedAllData() {
    await this.seedConfigIfEmpty();

    console.log('Sembrando datos mock de prueba (Manual)...');
    for (const p of this.products) {
      await IDB.put('productos', p);
    }
    for (const s of this.getTodaySales()) {
      await IDB.put('ventas', s);
    }
    for (const e of this.getTodayExpenses()) {
      await IDB.put('gastos', e);
    }
    console.log('Sembrado de datos iniciales completado.');
  }
};

window.MockData = MockData;
