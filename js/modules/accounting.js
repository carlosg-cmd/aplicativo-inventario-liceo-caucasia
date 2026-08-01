/* ==========================================================================
   CONTA-SMART SENA - Módulo de Contabilidad Mensual y Estado de Resultados
   ========================================================================== */

const AccountingModule = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1, // 1-12
  incomeVsExpensesChart: null,
  expensesCategoryChart: null,

  /**
   * Inicializa la vista contable y llena los selectores de Mes/Año
   */
  async init() {
    this.populateMonthYearSelectors();
    await this.loadMonthlyReport();
  },

  /**
   * Llena los selectores de mes y año
   */
  populateMonthYearSelectors() {
    const monthSelect = document.getElementById('accounting-month-select');
    const yearSelect = document.getElementById('accounting-year-select');

    if (monthSelect) {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      monthSelect.innerHTML = months.map((m, idx) => `
        <option value="${idx + 1}" ${idx + 1 === this.currentMonth ? 'selected' : ''}>${m}</option>
      `).join('');
    }

    if (yearSelect) {
      const years = [2025, 2026, 2027];
      yearSelect.innerHTML = years.map(y => `
        <option value="${y}" ${y === this.currentYear ? 'selected' : ''}>${y}</option>
      `).join('');
    }
  },

  /**
   * Cambia el período seleccionado y recarga el reporte
   */
  async changePeriod(month, year) {
    this.currentMonth = Number(month);
    this.currentYear = Number(year);
    await this.loadMonthlyReport();
  },

  /**
   * Consolida y genera el Estado de Resultados simplificado
   */
  async loadMonthlyReport() {
    const allSales = await IDB.getAll('ventas');
    const allExpenses = await IDB.getAll('gastos');
    const allProducts = await IDB.getAll('productos');

    // Filtrar por mes y año
    const monthSales = allSales.filter(s => {
      const d = new Date(s.fecha);
      return d.getFullYear() === this.currentYear && (d.getMonth() + 1) === this.currentMonth;
    });

    const monthExpenses = allExpenses.filter(e => {
      const d = new Date(e.fecha);
      return d.getFullYear() === this.currentYear && (d.getMonth() + 1) === this.currentMonth;
    });

    // 1. Ingresos Totales (Ventas)
    const totalVentas = monthSales.reduce((sum, s) => sum + (Number(s.valor_total) || 0), 0);

    // 2. Costo de Ventas (Costo de adquisición de la mercancía vendida)
    let costoVentas = 0;
    monthSales.forEach(s => {
      const prod = allProducts.find(p => p.id === s.producto_id);
      const unitCost = prod ? prod.precio_compra : (s.precio_unitario * 0.6);
      costoVentas += unitCost * s.cantidad;
    });

    // 3. Utilidad Bruta
    const utilidadBruta = totalVentas - costoVentas;

    // 4. Desglose de Gastos Operativos por categoría
    const expensesByCategory = {
      proveedores: 0,
      servicios: 0,
      arriendo: 0,
      nomina: 0,
      otros: 0
    };

    let totalGastosOperativos = 0;
    monthExpenses.forEach(e => {
      const cat = e.categoria || 'otros';
      const val = Number(e.valor) || 0;
      if (expensesByCategory.hasOwnProperty(cat)) {
        expensesByCategory[cat] += val;
      } else {
        expensesByCategory.otros += val;
      }
      totalGastosOperativos += val;
    });

    // 5. Utilidad / Pérdida Neta Operacional
    const utilidadNeta = utilidadBruta - totalGastosOperativos;

    // Renderizar Estado de Resultados en DOM
    this.renderIncomeStatement({
      totalVentas,
      costoVentas,
      utilidadBruta,
      expensesByCategory,
      totalGastosOperativos,
      utilidadNeta
    });

    // Renderizar Gráficas de evolución y categoría
    this.renderCharts(monthSales, monthExpenses, expensesByCategory);
  },

  /**
   * Renderiza las filas del Estado de Resultados
   */
  renderIncomeStatement(data) {
    const container = document.getElementById('income-statement-rows');
    if (!container) return;

    container.innerHTML = `
      <div class="statement-row header">
        <span>(+) Ingresos Operacionales (Ventas Totales)</span>
        <span>${Formatters.currency(data.totalVentas)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1rem;">(-) Costo de Ventas (Mercancía Vendida)</span>
        <span style="color: var(--accent-rose);">${Formatters.currency(data.costoVentas)}</span>
      </div>
      <div class="statement-row subtotal">
        <span>(=) UTILIDAD BRUTA</span>
        <span style="color: var(--primary); font-weight: 700;">${Formatters.currency(data.utilidadBruta)}</span>
      </div>
      <div class="statement-row header" style="margin-top: 1rem;">
        <span>(-) Gastos Operativos</span>
        <span>${Formatters.currency(data.totalGastosOperativos)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1.5rem;">• Pago de Nómina / Salarios</span>
        <span>${Formatters.currency(data.expensesCategory.nomina)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1.5rem;">• Compras y Gastos a Proveedores</span>
        <span>${Formatters.currency(data.expensesCategory.proveedores)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1.5rem;">• Servicios Públicos</span>
        <span>${Formatters.currency(data.expensesCategory.servicios)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1.5rem;">• Arriendo de Local</span>
        <span>${Formatters.currency(data.expensesCategory.arriendo)}</span>
      </div>
      <div class="statement-row">
        <span style="color: var(--text-muted); padding-left: 1.5rem;">• Otros Egresos</span>
        <span>${Formatters.currency(data.expensesCategory.otros)}</span>
      </div>
      <div class="statement-row final">
        <span>(=) UTILIDAD (PÉRDIDA) NETA DEL EJERCICIO</span>
        <span style="color: ${data.utilidadNeta >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
          ${Formatters.currency(data.utilidadNeta)}
        </span>
      </div>
    `;
  },

  /**
   * Renderiza las gráficas dinámicas utilizando Chart.js
   */
  renderCharts(monthSales, monthExpenses, expensesByCategory) {
    if (!window.Chart) return;

    // 1. Gráfica de Ingresos vs Egresos por Día
    const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const daysLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const dailyIncome = Array(daysInMonth).fill(0);
    const dailyExpense = Array(daysInMonth).fill(0);

    monthSales.forEach(s => {
      const day = new Date(s.fecha).getDate();
      if (day <= daysInMonth) dailyIncome[day - 1] += s.valor_total;
    });

    monthExpenses.forEach(e => {
      const day = new Date(e.fecha).getDate();
      if (day <= daysInMonth) dailyExpense[day - 1] += e.valor;
    });

    const ctx1 = document.getElementById('incomeVsExpensesCanvas');
    if (ctx1) {
      if (this.incomeVsExpensesChart) this.incomeVsExpensesChart.destroy();
      this.incomeVsExpensesChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: daysLabels,
          datasets: [
            {
              label: 'Ventas ($)',
              data: dailyIncome,
              backgroundColor: '#10b981',
              borderRadius: 4
            },
            {
              label: 'Egresos ($)',
              data: dailyExpense,
              backgroundColor: '#f43f5e',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
          }
        }
      });
    }

    // 2. Gráfica de dona: Distribución de Gastos por Categoría
    const ctx2 = document.getElementById('expensesCategoryCanvas');
    if (ctx2) {
      if (this.expensesCategoryChart) this.expensesCategoryChart.destroy();
      this.expensesCategoryChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['Nómina', 'Proveedores', 'Servicios', 'Arriendo', 'Otros'],
          datasets: [{
            data: [
              expensesByCategory.nomina,
              expensesByCategory.proveedores,
              expensesByCategory.servicios,
              expensesByCategory.arriendo,
              expensesByCategory.otros
            ],
            backgroundColor: ['#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#f43f5e'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8' } }
          }
        }
      });
    }
  }
};

window.AccountingModule = AccountingModule;
