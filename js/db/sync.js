/* ==========================================================================
   CONTA-SMART SENA - Motor de Sincronización (Sync Manager)
   ========================================================================== */

const SyncManager = {
  isOnline: navigator.onLine,
  supabaseClient: null,
  isSyncing: false,

  /**
   * Inicializa los listeners de conectividad y cliente Supabase si está disponible
   */
  init() {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));

    this.initSupabaseClient();
    this.updateStatusBadge();
  },

  /**
   * Inicializa el cliente Supabase utilizando las llaves guardadas o por defecto
   */
  initSupabaseClient() {
    const url = CONFIG.SUPABASE_DEFAULT_URL;
    const key = CONFIG.SUPABASE_DEFAULT_KEY;

    if (window.supabase && typeof window.supabase.createClient === 'function' && url && key) {
      try {
        this.supabaseClient = window.supabase.createClient(url, key);
        console.log('Cliente Supabase inicializado.');
      } catch (err) {
        console.warn('No se pudo inicializar Supabase Client (Modo Offline activo):', err);
      }
    }
  },

  /**
   * Maneja cambios en el estado de red
   */
  handleConnectionChange(online) {
    this.isOnline = online;
    this.updateStatusBadge();
    if (online) {
      UI.toast('Conexión reestablecida. Sincronizando con Supabase...', 'info');
      this.syncPendingData();
    } else {
      UI.toast('Modo Sin Conexión activo. Los datos se guardarán localmente.', 'warning');
    }
  },

  /**
   * Actualiza la insignia de estado de sincronización en el Header
   */
  async updateStatusBadge() {
    const badge = document.getElementById('sync-status-badge');
    const textEl = document.getElementById('sync-status-text');
    if (!badge || !textEl) return;

    const queue = await IDB.getAll('sync_queue');
    const pendingCount = queue.length;

    if (!this.isOnline) {
      badge.className = 'sync-badge offline';
      textEl.textContent = `Sin conexión (${pendingCount} pendientes)`;
    } else if (this.isSyncing) {
      badge.className = 'sync-badge syncing';
      textEl.textContent = 'Sincronizando...';
    } else if (pendingCount > 0) {
      badge.className = 'sync-badge offline';
      textEl.textContent = `Pendientes: ${pendingCount}`;
    } else {
      badge.className = 'sync-badge online';
      textEl.textContent = 'En línea & Sincronizado';
    }
  },

  /**
   * Registra una operación pendiente para sincronizar cuando se recupere la conexión
   */
  async queueSyncOperation(table, action, data) {
    const syncItem = {
      id: Formatters.generateUUID(),
      table,
      action,
      data,
      timestamp: new Date().toISOString()
    };
    await IDB.put('sync_queue', syncItem);
    this.updateStatusBadge();

    if (this.isOnline) {
      this.syncPendingData();
    }
  },

  /**
   * Procesa la cola de cambios hacia Supabase
   */
  async syncPendingData() {
    if (this.isSyncing || !this.isOnline || !this.supabaseClient) return;

    this.isSyncing = true;
    this.updateStatusBadge();

    try {
      const queue = await IDB.getAll('sync_queue');
      for (const item of queue) {
        try {
          if (item.action === 'INSERT' || item.action === 'UPDATE') {
            await this.supabaseClient.from(item.table).upsert(item.data);
          } else if (item.action === 'DELETE') {
            await this.supabaseClient.from(item.table).delete().eq('id', item.data.id);
          }
          // Remover de la cola local tras sincronización exitosa
          await IDB.delete('sync_queue', item.id);
        } catch (itemErr) {
          console.warn(`Fallback de sync para elemento ${item.id}:`, itemErr);
        }
      }
    } catch (err) {
      console.error('Error general en sincronización:', err);
    } finally {
      this.isSyncing = false;
      this.updateStatusBadge();
    }
  }
};

window.SyncManager = SyncManager;
