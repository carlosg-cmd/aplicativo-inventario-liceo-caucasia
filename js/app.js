/* ==========================================================================
   CONTA-SMART SENA - App Main Router & Controller v1.1
   ========================================================================== */

const AppRouter = {
  currentView: 'dashboard',

  /**
   * Inicializa la aplicación completa
   */
  async init() {
    console.log('Inicializando ContaSmart SENA v1.1...');

    // 1. Inicializar IndexedDB v2 y Configuración Básica
    await IDB.init();
    await MockData.seedConfigIfEmpty();

    // 2. Inicializar Sync Manager (necesario antes de AuthModule para que Auth detecte Supabase)
    SyncManager.init();

    // 3. Inicializar Auth (ahora async: verifica sesión Supabase si está configurado)
    await AuthModule.init();

    // 4. Inicializar Configuración de Negocio
    await BusinessConfigModule.init();

    // 5. Configurar Event Listeners Globales
    this.bindGlobalEvents();

    // 6. Determinar vista inicial
    if (!AuthModule.isAuthenticated()) {
      this.navigate('login');
    } else {
      this.navigate('dashboard');
    }

    UI.refreshIcons();
  },

  /**
   * Navega hacia una vista específica de la SPA
   */
  async navigate(viewId) {
    if (!AuthModule.isAuthenticated() && viewId !== 'login') viewId = 'login';
    if (AuthModule.isAuthenticated() && viewId === 'login') viewId = 'dashboard';

    this.currentView = viewId;

    const mainWrapper = document.getElementById('main-wrapper');
    const sidebar = document.getElementById('sidebar');
    const authView = document.getElementById('view-login');

    if (viewId === 'login') {
      if (mainWrapper) mainWrapper.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';
      if (authView) authView.style.display = 'flex';
    } else {
      if (mainWrapper) mainWrapper.style.display = 'flex';
      if (sidebar) sidebar.style.display = 'flex';
      if (authView) authView.style.display = 'none';

      document.querySelectorAll('.view-page').forEach(el => el.classList.remove('active'));
      const activeView = document.getElementById(`view-${viewId}`);
      if (activeView) activeView.classList.add('active');

      document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-view') === viewId);
      });

      this.updateHeaderTitle(viewId);
      await this.loadViewData(viewId);
    }

    UI.refreshIcons();
    window.scrollTo(0, 0);
  },

  /**
   * Actualiza el título del encabezado según la vista actual
   */
  updateHeaderTitle(viewId) {
    const titleEl = document.getElementById('header-page-title');
    const descEl = document.getElementById('header-page-desc');
    if (!titleEl || !descEl) return;

    const businessType = BusinessConfigModule.config?.tipo_negocio || 'ropa_calzado';
    const businessLabel = CONFIG.BUSINESS_TEMPLATES[businessType]?.label || 'Negocio';

    const titles = {
      dashboard: { title: 'Dashboard Principal', desc: 'Resumen de ventas, gastos y alertas de inventario del día' },
      inventario: { title: `Inventario — ${businessLabel}`, desc: 'Control de productos, precios y stock según tu tipo de negocio' },
      ventas: { title: 'Registro de Ventas', desc: 'Histórico de ventas y emisión de recibos' },
      gastos: { title: 'Egresos y Nómina', desc: 'Control de gastos operacionales y pago de salarios a empleados' },
      cierres: { title: 'Cierre de Caja Diario', desc: 'Registro inmutable de cierres contables y comprobantes' },
      contabilidad: { title: 'Contabilidad Mensual', desc: 'Estado de Resultados y gráficos de rendimiento' },
      configuracion: { title: 'Configuración del Negocio', desc: 'Tipo de negocio, plantillas de campos y conexión a la nube' }
    };

    const current = titles[viewId] || { title: 'ContaSmart SENA', desc: 'Sistema de Control Comercial' };
    titleEl.textContent = current.title;
    descEl.textContent = current.desc;
  },

  /**
   * Carga y refresca los datos específicos de cada vista
   */
  async loadViewData(viewId) {
    await InventoryModule.loadProducts();
    await SalesModule.loadSales();
    await ExpensesModule.loadExpenses();
    await CashCloseModule.loadClosures();

    if (viewId === 'dashboard') {
      await this.renderDashboardView();
    } else if (viewId === 'contabilidad') {
      await AccountingModule.init();
    } else if (viewId === 'configuracion') {
      BusinessConfigModule.renderSettingsUI();
    }
  },

  /**
   * Refresca la vista activa actual
   */
  async refreshCurrentView() {
    await this.loadViewData(this.currentView);
    this.updateHeaderTitle(this.currentView);
  },

  /**
   * Renderiza los KPIs y tablas del Dashboard
   */
  async renderDashboardView() {
    const todayStr = Formatters.getTodayString();
    const totals = await CashCloseModule.getDailyTotals(todayStr);

    const kpiSales = document.getElementById('kpi-today-sales');
    if (kpiSales) kpiSales.textContent = Formatters.currency(totals.totalSales);

    const kpiExpenses = document.getElementById('kpi-today-expenses');
    if (kpiExpenses) kpiExpenses.textContent = Formatters.currency(totals.totalExpenses);

    const kpiNet = document.getElementById('kpi-today-net');
    if (kpiNet) {
      kpiNet.textContent = Formatters.currency(totals.netBalance);
      kpiNet.style.color = totals.netBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    const now = new Date();
    const allSales = await IDB.getAll('ventas');
    const allExpenses = await IDB.getAll('gastos');

    const mSales = allSales.filter(s => {
      const d = new Date(s.fecha);
      return d.getFullYear() === now.getFullYear() && (d.getMonth() + 1) === now.getMonth() + 1;
    }).reduce((sum, s) => sum + (s.valor_total || 0), 0);

    const mExpenses = allExpenses.filter(e => {
      const d = new Date(e.fecha);
      return d.getFullYear() === now.getFullYear() && (d.getMonth() + 1) === now.getMonth() + 1;
    }).reduce((sum, e) => sum + (e.valor || 0), 0);

    const kpiMonthly = document.getElementById('kpi-monthly-profit');
    if (kpiMonthly) kpiMonthly.textContent = Formatters.currency(mSales - mExpenses);

    await this.renderRecentTransactions();
  },

  /**
   * Renderiza la lista de transacciones recientes en el Dashboard
   */
  async renderRecentTransactions() {
    const timeline = document.getElementById('dashboard-recent-transactions');
    if (!timeline) return;

    const sales = await IDB.getAll('ventas');
    const expenses = await IDB.getAll('gastos');

    const combined = [
      ...sales.map(s => ({ ...s, type: 'sale', title: `Venta: ${s.nombre_producto} (${s.cantidad}u)`, amount: s.valor_total })),
      ...expenses.map(e => ({ ...e, type: 'expense', title: `Gasto: ${e.descripcion}`, amount: e.valor }))
    ];

    combined.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const recent = combined.slice(0, 6);

    if (recent.length === 0) {
      timeline.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1rem;">No hay transacciones registradas aún.</div>';
      return;
    }

    timeline.innerHTML = recent.map(item => `
      <div class="timeline-item">
        <div class="timeline-left">
          <div class="timeline-icon ${item.type}">
            ${item.type === 'sale'
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'
            }
          </div>
          <div class="timeline-details">
            <span class="timeline-title">${item.title}</span>
            <span class="timeline-time">${Formatters.dateTime(item.fecha)}</span>
          </div>
        </div>
        <span class="timeline-amount ${item.type === 'sale' ? 'income' : 'expense'}">
          ${item.type === 'sale' ? '+' : '-'}${Formatters.currency(item.amount)}
        </span>
      </div>
    `).join('');
  },

  /**
   * Asigna eventos a formularios y botones
   */
  bindGlobalEvents() {
    // ── Login ──────────────────────────────────────────────
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const ok = await AuthModule.login(email, pass);
        if (ok) this.navigate('dashboard');
      });
    }

    // ── Navegación Sidebar ─────────────────────────────────
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        this.navigate(view);
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) sidebar.classList.remove('open');
      });
    });

    // ── Menú móvil ─────────────────────────────────────────
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
      });
    }

    // ── Logout ─────────────────────────────────────────────
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => AuthModule.logout());

    // ── Formulario de Producto (DINÁMICO) ──────────────────
    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        InventoryModule.saveProduct();
      });
    }

    // ── Reabastecimiento ───────────────────────────────────
    const restockForm = document.getElementById('restock-form');
    if (restockForm) {
      restockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        InventoryModule.processRestock({
          productId: document.getElementById('restock-product-id').value,
          qty: document.getElementById('restock-qty').value,
          unitCost: document.getElementById('restock-cost').value,
          supplier: document.getElementById('restock-supplier').value,
          registerExpense: document.getElementById('restock-auto-expense').checked
        });
      });
    }

    // ── Formulario de Venta ────────────────────────────────
    const saleForm = document.getElementById('sale-form');
    if (saleForm) {
      saleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        SalesModule.processSale({
          productId: document.getElementById('sale-product-select').value,
          qty: document.getElementById('sale-qty').value
        });
      });
    }

    // ── Formulario de Gasto ────────────────────────────────
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        ExpensesModule.processExpense({
          descripcion: document.getElementById('expense-desc').value,
          categoria: document.getElementById('expense-category').value,
          valor: document.getElementById('expense-amount').value
        });
      });
    }

    // ── Formulario de Nómina ───────────────────────────────
    const payrollForm = document.getElementById('payroll-form');
    if (payrollForm) {
      payrollForm.addEventListener('submit', (e) => {
        e.preventDefault();
        ExpensesModule.processPayroll({
          employeeName: document.getElementById('payroll-employee').value,
          amount: document.getElementById('payroll-amount').value,
          concept: document.getElementById('payroll-concept').value
        });
      });
    }

    // ── Buscar y Filtrar Inventario ────────────────────────
    const searchProd = document.getElementById('search-product-input');
    const filterCat = document.getElementById('filter-category-select');
    const updateInventory = () => {
      InventoryModule.renderProductTable(
        searchProd ? searchProd.value : '',
        filterCat ? filterCat.value : ''
      );
    };
    if (searchProd) searchProd.addEventListener('input', updateInventory);
    if (filterCat) filterCat.addEventListener('change', updateInventory);

    // ── Buscar y Filtrar Ventas ────────────────────────────
    const searchSales = document.getElementById('search-sales-input');
    const filterSalesDate = document.getElementById('filter-sales-date');
    const updateSales = () => {
      SalesModule.renderSalesTable(
        filterSalesDate ? filterSalesDate.value : '',
        searchSales ? searchSales.value : ''
      );
    };
    if (searchSales) searchSales.addEventListener('input', updateSales);
    if (filterSalesDate) filterSalesDate.addEventListener('change', updateSales);

    // ── Importar Excel: validar tipo de archivo en tiempo real ─
    const excelFileInput = document.getElementById('excel-file-input');
    if (excelFileInput) {
      excelFileInput.addEventListener('change', () => {
        const file = excelFileInput.files[0];
        if (file && !file.name.match(/\.(xlsx|xls)$/i)) {
          UI.toast('Por favor selecciona un archivo Excel (.xlsx o .xls).', 'warning');
          excelFileInput.value = '';
        }
      });
    }



    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // ── Tecla Escape para cerrar modales ───────────────────
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppRouter.init();
});

window.AppRouter = AppRouter;
