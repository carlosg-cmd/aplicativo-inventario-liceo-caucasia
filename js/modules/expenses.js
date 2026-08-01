/* ==========================================================================
   CONTA-SMART SENA - Módulo de Gastos y Nómina
   ========================================================================== */

const ExpensesModule = {
  expenses: [],

  /**
   * Carga los gastos desde IndexedDB
   */
  async loadExpenses() {
    this.expenses = await IDB.getAll('gastos');
    this.expenses.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    this.renderExpensesTable();
  },

  /**
   * Renderiza la tabla de egresos
   */
  renderExpensesTable(categoryFilter = '', searchQuery = '') {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    let filtered = [...this.expenses];

    if (categoryFilter) {
      filtered = filtered.filter(e => e.categoria === categoryFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.descripcion.toLowerCase().includes(q) || (e.empleado && e.empleado.toLowerCase().includes(q)));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <h3>No hay egresos ni gastos registrados</h3>
              <p>Haz clic en "+ Registrar Gasto" o "+ Registrar Nómina" para empezar.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(e => {
      let catBadgeClass = 'badge-info';
      if (e.categoria === 'nomina') catBadgeClass = 'badge-warning';
      if (e.categoria === 'proveedores') catBadgeClass = 'badge-success';

      const catLabel = CONFIG.EXPENSE_CATEGORIES.find(c => c.id === e.categoria)?.label || e.categoria;

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${e.descripcion}</div>
            ${e.empleado ? `<div style="font-size: 0.75rem; color: var(--accent-purple); font-weight: 600;">Empleado: ${e.empleado}</div>` : ''}
            <div style="font-size: 0.725rem; color: var(--text-subtle);">${Formatters.dateTime(e.fecha)}</div>
          </td>
          <td><span class="badge ${catBadgeClass}">${e.categoria.toUpperCase()}</span></td>
          <td style="font-weight: 800; color: var(--accent-rose); font-size: 0.95rem;">${Formatters.currency(e.valor)}</td>
          <td><span class="badge badge-success">Pagado</span></td>
          <td>
            <button class="action-btn delete" title="Eliminar Gasto" onclick="ExpensesModule.confirmDeleteExpense('${e.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Abre modal para registrar nuevo gasto general
   */
  openNewExpenseModal() {
    document.getElementById('expense-form').reset();
    document.getElementById('expense-id').value = '';
    UI.openModal('expense-modal');
  },

  /**
   * Abre modal dedicado para registrar nómina de empleados
   */
  openNewPayrollModal() {
    document.getElementById('payroll-form').reset();
    UI.openModal('payroll-modal');
  },

  /**
   * Agrega un gasto directamente (utilizado también por entradas de mercancía)
   */
  async addExpenseDirect(expenseData) {
    const todayStr = Formatters.dateShort(expenseData.fecha || new Date());
    const isClosed = await CashCloseModule.isDateClosed(todayStr);

    if (isClosed) {
      UI.toast(`No se pueden añadir egresos para la fecha ${todayStr} porque la caja del día ya está CERRADA.`, 'danger');
      return false;
    }

    const expenseObj = {
      id: Formatters.generateUUID(),
      descripcion: expenseData.descripcion.trim(),
      categoria: expenseData.categoria || 'otros',
      empleado: expenseData.empleado || '',
      valor: Number(expenseData.valor) || 0,
      fecha: expenseData.fecha || new Date().toISOString(),
      fecha_corta: todayStr,
      sync_status: 'pending'
    };

    await IDB.put('gastos', expenseObj);
    await SyncManager.queueSyncOperation('gastos', 'INSERT', expenseObj);
    return true;
  },

  /**
   * Procesa el formulario de gasto general
   */
  async processExpense(formData) {
    const success = await this.addExpenseDirect({
      descripcion: formData.descripcion,
      categoria: formData.categoria,
      valor: formData.valor,
      fecha: new Date().toISOString()
    });

    if (success) {
      UI.toast('Gasto/Egreso registrado correctamente.', 'success');
      UI.closeModal('expense-modal');
      await this.loadExpenses();
      if (window.AppRouter) AppRouter.refreshCurrentView();
    }
  },

  /**
   * Procesa el formulario de nómina de empleados
   */
  async processPayroll(formData) {
    const success = await this.addExpenseDirect({
      descripcion: `Pago de Nómina / Salario - ${formData.concept || 'Sueldo'}`,
      categoria: 'nomina',
      empleado: formData.employeeName,
      valor: formData.amount,
      fecha: new Date().toISOString()
    });

    if (success) {
      UI.toast(`¡Pago de Nómina a ${formData.employeeName} registrado con éxito!`, 'success');
      UI.closeModal('payroll-modal');
      await this.loadExpenses();
      if (window.AppRouter) AppRouter.refreshCurrentView();
    }
  },

  /**
   * Elimina un gasto tras verificar bloqueo de cierre
   */
  async confirmDeleteExpense(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return;

    const isClosed = await CashCloseModule.isDateClosed(expense.fecha_corta);
    if (isClosed) {
      UI.toast(`No se puede eliminar el gasto del ${expense.fecha_corta} porque el cierre de caja de esa fecha ya es inmutable.`, 'danger');
      return;
    }

    UI.confirm({
      title: 'Eliminar Registro de Egreso',
      message: `¿Eliminar el gasto <strong>"${expense.descripcion}"</strong> por valor de ${Formatters.currency(expense.valor)}?`,
      confirmText: 'Sí, Eliminar Gasto',
      onConfirm: async () => {
        await IDB.delete('gastos', id);
        await SyncManager.queueSyncOperation('gastos', 'DELETE', { id });
        UI.toast('Gasto eliminado correctamente.', 'info');
        await this.loadExpenses();
        if (window.AppRouter) AppRouter.refreshCurrentView();
      }
    });
  }
};

window.ExpensesModule = ExpensesModule;
