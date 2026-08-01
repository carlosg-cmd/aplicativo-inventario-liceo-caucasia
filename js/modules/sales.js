/* ==========================================================================
   CONTA-SMART SENA - Módulo de Ventas
   ========================================================================== */

const SalesModule = {
  sales: [],

  /**
   * Carga las ventas desde IndexedDB
   */
  async loadSales() {
    this.sales = await IDB.getAll('ventas');
    this.sales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    this.renderSalesTable();
    this.populateSaleProductSelect();
  },

  /**
   * Llena el selector de productos en la modal de venta
   */
  populateSaleProductSelect() {
    const select = document.getElementById('sale-product-select');
    if (!select) return;

    let html = '<option value="">-- Seleccionar Producto --</option>';
    InventoryModule.products.forEach(p => {
      const disabled = p.stock === 0 ? 'disabled' : '';
      const stockText = p.stock === 0 ? '(AGOTADO)' : `(Stock: ${p.stock})`;
      html += `<option value="${p.id}" ${disabled}>${p.nombre} - ${Formatters.currency(p.precio_venta)} ${stockText}</option>`;
    });
    select.innerHTML = html;
  },

  /**
   * Renderiza la tabla de historial de ventas
   */
  renderSalesTable(dateFilter = '', searchQuery = '') {
    const tbody = document.getElementById('sales-table-body');
    if (!tbody) return;

    let filtered = [...this.sales];

    if (dateFilter) {
      filtered = filtered.filter(s => s.fecha_corta === dateFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.nombre_producto.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <h3>No hay ventas registradas</h3>
              <p>Haz clic en "+ Registrar Venta" para añadir tu primera venta.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>
          <div style="font-weight: 600;">${s.nombre_producto}</div>
          <div style="font-size: 0.75rem; color: var(--text-subtle);">${Formatters.dateTime(s.fecha)}</div>
        </td>
        <td style="font-weight: 700; font-family: var(--font-heading);">${s.cantidad} unid.</td>
        <td style="color: var(--text-muted);">${Formatters.currency(s.precio_unitario)}</td>
        <td style="font-weight: 800; color: var(--accent-emerald); font-size: 0.95rem;">${Formatters.currency(s.valor_total)}</td>
        <td><span class="badge badge-success">Completada</span></td>
        <td>
          <button class="action-btn delete" title="Eliminar Venta" onclick="SalesModule.confirmDeleteSale('${s.id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `).join('');
  },

  /**
   * Abre modal para registrar nueva venta
   */
  openNewSaleModal() {
    document.getElementById('sale-form').reset();
    document.getElementById('sale-qty').value = 1;
    document.getElementById('sale-total-preview').textContent = Formatters.currency(0);
    this.populateSaleProductSelect();
    UI.openModal('sale-modal');
  },

  /**
   * Actualiza la vista previa del total de la venta cuando cambia el producto o cantidad
   */
  updateSalePreview() {
    const productId = document.getElementById('sale-product-select').value;
    const qty = Number(document.getElementById('sale-qty').value) || 1;
    const product = InventoryModule.products.find(p => p.id === productId);

    if (product) {
      const total = product.precio_venta * qty;
      document.getElementById('sale-total-preview').textContent = Formatters.currency(total);
    } else {
      document.getElementById('sale-total-preview').textContent = Formatters.currency(0);
    }
  },

  /**
   * Procesa el registro de la venta y descuenta stock automáticamente
   */
  async processSale(formData) {
    const product = InventoryModule.products.find(p => p.id === formData.productId);
    if (!product) {
      UI.toast('Selecciona un producto válido.', 'danger');
      return;
    }

    const qty = Number(formData.qty) || 1;
    if (qty <= 0) {
      UI.toast('La cantidad debe ser mayor a 0.', 'danger');
      return;
    }

    if (product.stock < qty) {
      UI.toast(`Stock insuficiente. Disponible: ${product.stock} unidades.`, 'danger');
      return;
    }

    const todayStr = Formatters.getTodayString();
    // Validar si la fecha ya está cerrada contablemente
    const isClosed = await CashCloseModule.isDateClosed(todayStr);
    if (isClosed) {
      UI.toast(`No se pueden registrar ventas para hoy (${todayStr}) porque la caja del día ya fue CERRADA.`, 'danger');
      return;
    }

    const saleObj = {
      id: Formatters.generateUUID(),
      producto_id: product.id,
      nombre_producto: product.nombre,
      cantidad: qty,
      precio_unitario: product.precio_venta,
      valor_total: product.precio_venta * qty,
      fecha: new Date().toISOString(),
      fecha_corta: todayStr,
      sync_status: 'pending'
    };

    // Descontar Stock
    product.stock -= qty;
    product.updated_at = new Date().toISOString();
    product.sync_status = 'pending';

    await IDB.put('productos', product);
    await IDB.put('ventas', saleObj);

    await SyncManager.queueSyncOperation('productos', 'UPDATE', product);
    await SyncManager.queueSyncOperation('ventas', 'INSERT', saleObj);

    UI.toast(`¡Venta registrada! Total: ${Formatters.currency(saleObj.valor_total)}`, 'success');
    UI.closeModal('sale-modal');

    await InventoryModule.loadProducts();
    await this.loadSales();
    if (window.AppRouter) AppRouter.refreshCurrentView();
  },

  /**
   * Elimina una venta y revierte el stock descontado
   */
  async confirmDeleteSale(id) {
    const sale = this.sales.find(s => s.id === id);
    if (!sale) return;

    // Verificar si el día de la venta está cerrado
    const isClosed = await CashCloseModule.isDateClosed(sale.fecha_corta);
    if (isClosed) {
      UI.toast(`No se puede eliminar la venta del ${sale.fecha_corta} porque el cierre de caja de esa fecha ya es inmutable.`, 'danger');
      return;
    }

    UI.confirm({
      title: 'Anular / Eliminar Venta',
      message: `¿Deseas anular la venta de <strong>${sale.nombre_producto}</strong> por ${Formatters.currency(sale.valor_total)}? El stock (${sale.cantidad} unid.) será reincorporado al inventario.`,
      confirmText: 'Sí, Anular Venta',
      onConfirm: async () => {
        // Revertir Stock
        const product = InventoryModule.products.find(p => p.id === sale.producto_id);
        if (product) {
          product.stock += sale.cantidad;
          product.updated_at = new Date().toISOString();
          await IDB.put('productos', product);
          await SyncManager.queueSyncOperation('productos', 'UPDATE', product);
        }

        await IDB.delete('ventas', id);
        await SyncManager.queueSyncOperation('ventas', 'DELETE', { id });

        UI.toast('Venta anulada y stock devuelto.', 'info');
        await InventoryModule.loadProducts();
        await this.loadSales();
        if (window.AppRouter) AppRouter.refreshCurrentView();
      }
    });
  }
};

window.SalesModule = SalesModule;
