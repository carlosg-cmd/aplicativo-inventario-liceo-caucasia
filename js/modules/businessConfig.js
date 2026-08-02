/* ==========================================================================
   CONTA-SMART SENA - Módulo de Configuración de Negocio & Plantillas
   ========================================================================== */

const BusinessConfigModule = {
  config: null,

  /**
   * Inicializa la configuración del negocio desde IndexedDB
   */
  async init() {
    let savedConfig = await IDB.getById('configuracion', 'business_config');
    
    if (!savedConfig) {
      // Configuración predeterminada inicial (Ropa / Calzado)
      const defaultTemplate = CONFIG.BUSINESS_TEMPLATES.ropa_calzado;
      savedConfig = {
        id: 'business_config',
        tipo_negocio: 'ropa_calzado',
        campos_producto: JSON.parse(JSON.stringify(defaultTemplate.fields)),
        updated_at: new Date().toISOString()
      };
      await IDB.put('configuracion', savedConfig);
    }

    this.config = savedConfig;
    this.renderSettingsUI();
  },

  /**
   * Obtiene la lista actual de campos activos para productos
   */
  getActiveFields() {
    if (!this.config || !this.config.campos_producto) {
      return CONFIG.BUSINESS_TEMPLATES.ropa_calzado.fields;
    }
    return this.config.campos_producto;
  },

  /**
   * Obtiene el tipo de negocio actualmente seleccionado
   */
  getBusinessType() {
    return this.config ? this.config.tipo_negocio : 'ropa_calzado';
  },

  /**
   * Cambia el tipo de negocio y precarga la plantilla correspondiente
   */
  async changeBusinessType(typeKey) {
    if (!CONFIG.BUSINESS_TEMPLATES[typeKey]) return;

    const template = CONFIG.BUSINESS_TEMPLATES[typeKey];
    this.config.tipo_negocio = typeKey;
    this.config.campos_producto = JSON.parse(JSON.stringify(template.fields));
    this.config.updated_at = new Date().toISOString();

    await IDB.put('configuracion', this.config);
    await SyncManager.queueSyncOperation('configuracion', 'UPDATE', this.config);

    UI.toast(`Tipo de negocio actualizado a "${template.label}". Plantilla cargada.`, 'success');
    this.renderSettingsUI();

    // Actualizar Vistas afectadas
    if (window.InventoryModule) {
      await InventoryModule.loadProducts();
    }
  },

  /**
   * Agrega un nuevo campo personalizado a la plantilla del negocio
   */
  async addCustomField(fieldLabel, fieldType) {
    if (!fieldLabel || !fieldLabel.trim()) {
      UI.toast('Ingresa un nombre válido para el campo.', 'danger');
      return;
    }

    const key = fieldLabel.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');

    // Verificar si el campo ya existe
    const exists = this.config.campos_producto.some(f => f.nombre === key || f.label.toLowerCase() === fieldLabel.trim().toLowerCase());
    if (exists) {
      UI.toast(`El campo "${fieldLabel}" ya existe en la plantilla.`, 'warning');
      return;
    }

    const newField = {
      nombre: key,
      label: fieldLabel.trim(),
      tipo: fieldType, // 'texto' | 'numerico' | 'fecha'
      fijo: false,
      requerido: false
    };

    this.config.campos_producto.push(newField);
    this.config.updated_at = new Date().toISOString();

    await IDB.put('configuracion', this.config);
    await SyncManager.queueSyncOperation('configuracion', 'UPDATE', this.config);

    UI.toast(`Campo "${fieldLabel}" agregado correctamente a la plantilla.`, 'success');
    this.renderSettingsUI();

    if (window.InventoryModule) {
      await InventoryModule.loadProducts();
    }
  },

  /**
   * Elimina un campo personalizado de la plantilla (solo si no es fijo)
   */
  async removeCustomField(fieldKey) {
    const field = this.config.campos_producto.find(f => f.nombre === fieldKey);
    if (!field) return;

    if (field.fijo) {
      UI.toast(`El campo base "${field.label}" no se puede eliminar.`, 'danger');
      return;
    }

    UI.confirm({
      title: 'Eliminar Campo de Plantilla',
      message: `¿Eliminar el campo <strong>"${field.label}"</strong> de la plantilla? Los datos existentes de productos conservarán su información local.`,
      confirmText: 'Sí, Eliminar Campo',
      onConfirm: async () => {
        this.config.campos_producto = this.config.campos_producto.filter(f => f.nombre !== fieldKey);
        this.config.updated_at = new Date().toISOString();

        await IDB.put('configuracion', this.config);
        await SyncManager.queueSyncOperation('configuracion', 'UPDATE', this.config);

        UI.toast(`Campo "${field.label}" eliminado.`, 'info');
        this.renderSettingsUI();

        if (window.InventoryModule) {
          await InventoryModule.loadProducts();
        }
      }
    });
  },

  /**
   * Renderiza la sección visual del selector de negocio y constructor de campos en la vista Configuración
   */
  renderSettingsUI() {
    const select = document.getElementById('config-business-type-select');
    if (select && this.config) {
      select.value = this.config.tipo_negocio;
    }

    const container = document.getElementById('custom-fields-list-container');
    if (!container || !this.config) return;

    const fields = this.config.campos_producto;

    container.innerHTML = fields.map(f => {
      let badgeClass = 'badge-info';
      if (f.tipo === 'numerico') badgeClass = 'badge-success';
      if (f.tipo === 'fecha') badgeClass = 'badge-warning';

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <strong style="font-size: 0.9rem;">${f.label}</strong>
            <span style="font-size: 0.725rem; color: var(--text-subtle);">(${f.nombre})</span>
            <span class="badge ${badgeClass}">${f.tipo.toUpperCase()}</span>
            ${f.fijo ? '<span class="badge badge-secondary" style="font-size: 0.65rem;">CAMPO BASE FIJO</span>' : '<span class="badge badge-primary" style="font-size: 0.65rem;">PERSONALIZADO</span>'}
          </div>
          <div>
            ${!f.fijo ? `
              <button class="action-btn delete" title="Eliminar Campo" onclick="BusinessConfigModule.removeCustomField('${f.nombre}')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            ` : '<span style="font-size: 0.75rem; color: var(--text-subtle);">Requerido</span>'}
          </div>
        </div>
      `;
    }).join('');
  }
};

window.BusinessConfigModule = BusinessConfigModule;
