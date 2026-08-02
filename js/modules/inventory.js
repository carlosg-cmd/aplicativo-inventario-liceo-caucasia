/* ==========================================================================
   CONTA-SMART SENA - Módulo de Inventario Dinámico
   ========================================================================== */

const InventoryModule = {
  products: [],
  categories: [],

  /**
   * Carga los productos desde IndexedDB
   */
  async loadProducts() {
    this.products = await IDB.getAll('productos');
    this.extractCategories();
    this.renderProductTable();
    this.renderStockAlertsWidget();
  },

  /**
   * Extrae la lista única de categorías disponibles
   */
  extractCategories() {
    const cats = new Set(CONFIG.DEFAULT_PRODUCT_CATEGORIES);
    this.products.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    this.categories = Array.from(cats);
    this.populateCategorySelects();
  },

  /**
   * Llena los elementos <select> de categorías en los modales
   */
  populateCategorySelects() {
    const selects = ['filter-category-select'];
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) return;

      const currentValue = select.value;
      let html = '<option value="">Todas las Categorías</option>';
      this.categories.forEach(cat => {
        html += `<option value="${cat}">${cat}</option>`;
      });
      select.innerHTML = html;
      if (currentValue) select.value = currentValue;
    });
  },

  /**
   * Renderiza dinámicamente el encabezado y cuerpo de la tabla según los campos del negocio
   */
  renderProductTable(searchQuery = '', selectedCategory = '') {
    const thead = document.getElementById('inventory-table-head');
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody || !thead) return;

    const fields = BusinessConfigModule.getActiveFields();

    // Renderizar Encabezados dinámicos
    let headerHTML = '<tr>';
    fields.forEach(f => {
      headerHTML += `<th>${f.label}</th>`;
    });
    headerHTML += '<th>Margen %</th><th>Estado Stock</th><th>Acciones</th></tr>';
    thead.innerHTML = headerHTML;

    // Filtrar Productos
    let filtered = [...this.products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        return fields.some(f => {
          const val = p[f.nombre];
          return val && String(val).toLowerCase().includes(q);
        });
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.categoria === selectedCategory);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${fields.length + 3}">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <h3>No se encontraron productos</h3>
              <p>Crea un producto o importa tu inventario desde Excel.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Renderizar Filas dinámicas
    tbody.innerHTML = filtered.map(p => {
      // Estado de Stock
      const stockVal = Number(p.stock) || 0;
      const minStockVal = Number(p.stock_minimo) || 1;
      let statusBadge = `<span class="badge badge-success">Stock Normal</span>`;
      if (stockVal === 0) {
        statusBadge = `<span class="badge badge-danger">Agotado</span>`;
      } else if (stockVal <= minStockVal) {
        statusBadge = `<span class="badge badge-warning">Stock Bajo</span>`;
      }

      // Margen de Ganancia
      const pCompra = Number(p.precio_compra) || 0;
      const pVenta = Number(p.precio_venta) || 0;
      const margin = pVenta > 0 ? ((pVenta - pCompra) / pVenta) * 100 : 0;

      // Celdas dinámicas
      let rowHTML = '<tr>';
      fields.forEach(f => {
        const val = p[f.nombre];
        let displayVal = val !== undefined && val !== null && val !== '' ? val : '-';

        if (f.nombre === 'precio_compra') {
          displayVal = `<span style="font-weight: 600; color: var(--text-muted);">${Formatters.currency(pCompra)}</span>`;
        } else if (f.nombre === 'precio_venta') {
          displayVal = `<span style="font-weight: 700; color: var(--accent-emerald);">${Formatters.currency(pVenta)}</span>`;
        } else if (f.nombre === 'stock') {
          displayVal = `<span style="font-family: var(--font-heading); font-weight: 700;">${stockVal}</span>`;
        } else if (f.nombre === 'nombre') {
          displayVal = `<div style="font-weight: 600;">${val}</div><div style="font-size: 0.725rem; color: var(--text-subtle);">ID: ${p.id.slice(0, 8)}</div>`;
        } else if (f.tipo === 'fecha') {
          displayVal = Formatters.dateReadable(val);
        }

        rowHTML += `<td>${displayVal}</td>`;
      });

      // Margen, Estado Stock y Acciones
      rowHTML += `
        <td style="font-size: 0.85rem; font-weight: 600; color: var(--accent-purple);">${Formatters.percentage(margin)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Reabastecer Stock" onclick="InventoryModule.openRestockModal('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button class="action-btn" title="Editar Producto" onclick="InventoryModule.openEditProductModal('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="action-btn delete" title="Eliminar Producto" onclick="InventoryModule.confirmDeleteProduct('${p.id}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`;

      return rowHTML;
    }).join('');
  },

  /**
   * Renderiza los inputs dinámicos en el modal de "+ Nuevo / Editar Producto"
   */
  renderDynamicForm(product = null) {
    const container = document.getElementById('dynamic-product-fields');
    if (!container) return;

    const fields = BusinessConfigModule.getActiveFields();
    let html = '';

    fields.forEach(f => {
      const val = product ? (product[f.nombre] !== undefined ? product[f.nombre] : '') : '';
      const inputType = f.tipo === 'numerico' ? 'number' : (f.tipo === 'fecha' ? 'date' : 'text');
      const reqAttr = f.requerido ? 'required' : '';

      html += `
        <div class="form-group">
          <label for="dyn-field-${f.nombre}">${f.label} ${f.requerido ? '<span style="color: var(--danger);">*</span>' : ''}</label>
          <input type="${inputType}" id="dyn-field-${f.nombre}" name="${f.nombre}" class="form-control" value="${val}" ${reqAttr} placeholder="${f.label}">
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Renderiza el widget de Alertas de Stock en el Dashboard principal
   */
  renderStockAlertsWidget() {
    const widget = document.getElementById('dashboard-stock-alerts');
    if (!widget) return;

    const lowStock = this.products.filter(p => Number(p.stock) <= Number(p.stock_minimo));

    if (lowStock.length === 0) {
      widget.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="margin-bottom: 0.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div style="font-weight: 600; font-size: 0.9rem;">¡Inventario Óptimo!</div>
          <div style="font-size: 0.75rem;">Todos los productos están por encima del stock mínimo.</div>
        </div>
      `;
      return;
    }

    widget.innerHTML = `
      <div class="stock-alert-list">
        ${lowStock.map(p => `
          <div class="stock-alert-item">
            <div class="stock-item-info">
              <span class="stock-item-name">${p.nombre}</span>
              <span class="stock-item-cat">${p.categoria || 'General'} (Mín: ${p.stock_minimo})</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge ${Number(p.stock) === 0 ? 'badge-danger' : 'badge-warning'}">
                ${Number(p.stock) === 0 ? 'Agotado' : `${p.stock} unid.`}
              </span>
              <button class="btn btn-sm btn-outline" onclick="InventoryModule.openRestockModal('${p.id}')">+ Stock</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * Abre modal para nuevo producto
   */
  openNewProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
    this.renderDynamicForm(null);
    UI.openModal('product-modal');
  },

  /**
   * Abre modal para editar producto existente
   */
  openEditProductModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('product-id').value = product.id;
    document.getElementById('product-modal-title').textContent = 'Editar Producto';
    this.renderDynamicForm(product);
    UI.openModal('product-modal');
  },

  /**
   * Guarda o actualiza un producto extrayendo valores del formulario dinámico
   */
  async saveProduct() {
    const id = document.getElementById('product-id').value || Formatters.generateUUID();
    const existing = this.products.find(p => p.id === id);
    const fields = BusinessConfigModule.getActiveFields();

    const productObj = {
      id,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    };

    // Recopilar valores de los campos dinámicos
    fields.forEach(f => {
      const input = document.getElementById(`dyn-field-${f.nombre}`);
      if (input) {
        if (f.tipo === 'numerico') {
          productObj[f.nombre] = Number(input.value) || 0;
        } else {
          productObj[f.nombre] = input.value ? input.value.trim() : '';
        }
      }
    });

    if (!productObj.nombre) {
      UI.toast('El nombre del producto es obligatorio.', 'danger');
      return;
    }

    await IDB.put('productos', productObj);
    await SyncManager.queueSyncOperation('productos', existing ? 'UPDATE' : 'INSERT', productObj);

    UI.toast(`Producto "${productObj.nombre}" guardado con éxito.`, 'success');
    UI.closeModal('product-modal');
    await this.loadProducts();
  },

  /**
   * Abre modal para registrar entrada de mercancía (Reabastecer stock)
   */
  openRestockModal(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('restock-product-id').value = product.id;
    document.getElementById('restock-product-name').textContent = product.nombre;
    document.getElementById('restock-current-stock').textContent = product.stock;
    document.getElementById('restock-qty').value = '10';
    document.getElementById('restock-cost').value = product.precio_compra || 0;
    document.getElementById('restock-supplier').value = '';
    document.getElementById('restock-auto-expense').checked = true;

    UI.openModal('restock-modal');
  },

  /**
   * Procesa la entrada de mercancía a inventario y registra el gasto opcional
   */
  async processRestock(formData) {
    const product = this.products.find(p => p.id === formData.productId);
    if (!product) return;

    const addedQty = Number(formData.qty) || 0;
    const unitCost = Number(formData.unitCost) || Number(product.precio_compra) || 0;
    const totalCost = addedQty * unitCost;

    product.stock = Number(product.stock || 0) + addedQty;
    product.precio_compra = unitCost;
    product.updated_at = new Date().toISOString();
    product.sync_status = 'pending';

    await IDB.put('productos', product);
    await SyncManager.queueSyncOperation('productos', 'UPDATE', product);

    if (formData.registerExpense && totalCost > 0) {
      await ExpensesModule.addExpenseDirect({
        descripcion: `Compra mercancía: ${addedQty}x ${product.nombre} (Prov: ${formData.supplier || 'General'})`,
        categoria: 'proveedores',
        valor: totalCost,
        fecha: new Date().toISOString()
      });
    }

    UI.toast(`Se sumaron +${addedQty} unidades al inventario.`, 'success');
    UI.closeModal('restock-modal');
    await this.loadProducts();
  },

  /**
   * Confirma y elimina un producto
   */
  confirmDeleteProduct(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;

    UI.confirm({
      title: 'Eliminar Producto',
      message: `¿Estás seguro de eliminar el producto <strong>${product.nombre}</strong> de tu inventario? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      onConfirm: async () => {
        await IDB.delete('productos', id);
        await SyncManager.queueSyncOperation('productos', 'DELETE', { id });
        UI.toast('Producto eliminado correctamente.', 'info');
        await this.loadProducts();
      }
    });
  }
};

window.InventoryModule = InventoryModule;
