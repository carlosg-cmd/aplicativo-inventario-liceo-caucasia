/* ==========================================================================
   CONTA-SMART SENA - Módulo de Cierre de Caja Diario
   ========================================================================== */

const CashCloseModule = {
  closures: [],

  /**
   * Carga el historial de cierres diarios desde IndexedDB
   */
  async loadClosures() {
    this.closures = await IDB.getAll('cierres_diarios');
    this.closures.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    this.renderClosuresTable();
    this.updateDailyCloseBanner();
  },

  /**
   * Verifica si una fecha específica (YYYY-MM-DD) ya fue cerrada contablemente
   */
  async isDateClosed(dateShortStr) {
    const record = await IDB.getByIndex('cierres_diarios', 'fecha', dateShortStr);
    return record && record.length > 0 && record[0].estado === 'cerrado';
  },

  /**
   * Obtiene la consolidación de ventas, gastos y saldo para una fecha dada
   */
  async getDailyTotals(dateShortStr = Formatters.getTodayString()) {
    const allSales = await IDB.getAll('ventas');
    const allExpenses = await IDB.getAll('gastos');

    const daySales = allSales.filter(s => s.fecha_corta === dateShortStr);
    const dayExpenses = allExpenses.filter(e => e.fecha_corta === dateShortStr);

    const totalSales = daySales.reduce((sum, s) => sum + (Number(s.valor_total) || 0), 0);
    const totalExpenses = dayExpenses.reduce((sum, e) => sum + (Number(e.valor) || 0), 0);
    const netBalance = totalSales - totalExpenses;

    return {
      date: dateShortStr,
      salesCount: daySales.length,
      expensesCount: dayExpenses.length,
      totalSales,
      totalExpenses,
      netBalance
    };
  },

  /**
   * Actualiza los elementos UI del botón y banner de cierre diario en el Dashboard
   */
  async updateDailyCloseBanner() {
    const todayStr = Formatters.getTodayString();
    const isClosed = await this.isDateClosed(todayStr);

    const closeBtnHeader = document.getElementById('btn-close-day-header');
    const closeBannerState = document.getElementById('cash-close-banner-state');

    if (closeBtnHeader) {
      if (isClosed) {
        closeBtnHeader.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Día Cerrado`;
        closeBtnHeader.className = 'btn btn-secondary btn-sm';
        closeBtnHeader.disabled = true;
      } else {
        closeBtnHeader.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Cerrar el Día`;
        closeBtnHeader.className = 'btn btn-success btn-sm';
        closeBtnHeader.disabled = false;
      }
    }

    if (closeBannerState) {
      if (isClosed) {
        closeBannerState.innerHTML = `<span class="badge badge-danger">Día Cerrado e Inmutable</span>`;
      } else {
        closeBannerState.innerHTML = `<span class="badge badge-success">Caja Abierta (Operando)</span>`;
      }
    }
  },

  /**
   * Abre la modal/drawer de confirmación para ejecutar el Cierre de Caja Diario
   */
  async openCloseDayModal() {
    const todayStr = Formatters.getTodayString();
    const isClosed = await this.isDateClosed(todayStr);

    if (isClosed) {
      UI.toast(`La caja del día de hoy (${todayStr}) ya se encuentra CERRADA.`, 'warning');
      return;
    }

    const totals = await this.getDailyTotals(todayStr);

    document.getElementById('close-modal-date').textContent = Formatters.dateReadable(new Date());
    document.getElementById('close-modal-sales').textContent = Formatters.currency(totals.totalSales);
    document.getElementById('close-modal-sales-count').textContent = `${totals.salesCount} ventas realizadas`;
    document.getElementById('close-modal-expenses').textContent = Formatters.currency(totals.totalExpenses);
    document.getElementById('close-modal-expenses-count').textContent = `${totals.expensesCount} egresos/nómina`;

    const netEl = document.getElementById('close-modal-net');
    netEl.textContent = Formatters.currency(totals.netBalance);
    netEl.style.color = totals.netBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';

    document.getElementById('close-modal-notes').value = '';

    UI.openModal('cash-close-modal');
  },

  /**
   * Ejecuta y guarda el cierre contable del día
   */
  async executeCloseDay() {
    const todayStr = Formatters.getTodayString();
    const totals = await this.getDailyTotals(todayStr);
    const notes = document.getElementById('close-modal-notes').value.trim();

    const closureRecord = {
      id: Formatters.generateUUID(),
      fecha: todayStr,
      hora_cierre: new Date().toISOString(),
      total_ventas: totals.totalSales,
      total_gastos: totals.totalExpenses,
      saldo_neto: totals.netBalance,
      estado: 'cerrado',
      observaciones: notes || 'Cierre de caja manual de fin de jornada.',
      sync_status: 'pending'
    };

    await IDB.put('cierres_diarios', closureRecord);
    await SyncManager.queueSyncOperation('cierres_diarios', 'INSERT', closureRecord);

    UI.toast(`¡Cierre diario del ${todayStr} ejecutado con éxito! Registro inmutable guardado.`, 'success');
    UI.closeModal('cash-close-modal');

    await this.loadClosures();
    if (window.AppRouter) AppRouter.refreshCurrentView();
  },

  /**
   * Renderiza la tabla de cierres históricos
   */
  renderClosuresTable() {
    const tbody = document.getElementById('closures-table-body');
    if (!tbody) return;

    if (this.closures.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <h3>No hay cierres de caja registrados</h3>
              <p>Realiza tu primer cierre del día en el Dashboard.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.closures.map(c => `
      <tr>
        <td>
          <div style="font-weight: 700;">${Formatters.dateReadable(c.fecha)}</div>
          <div style="font-size: 0.725rem; color: var(--text-subtle);">Cierre: ${Formatters.dateTime(c.hora_cierre)}</div>
        </td>
        <td style="font-weight: 700; color: var(--accent-emerald);">${Formatters.currency(c.total_ventas)}</td>
        <td style="font-weight: 700; color: var(--accent-rose);">${Formatters.currency(c.total_gastos)}</td>
        <td style="font-weight: 800; font-family: var(--font-heading); color: ${c.saldo_neto >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
          ${Formatters.currency(c.saldo_neto)}
        </td>
        <td><span class="badge badge-success">Cerrado e Inmutable</span></td>
        <td>
          <button class="btn btn-sm btn-outline" title="Exportar Comprobante PDF" onclick="ReportsModule.generateDailyClosePDF('${c.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> PDF
          </button>
        </td>
      </tr>
    `).join('');
  }
};

window.CashCloseModule = CashCloseModule;
