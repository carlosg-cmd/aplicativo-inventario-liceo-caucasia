/* ==========================================================================
   CONTA-SMART SENA - IndexedDB Engine (v2)
   ========================================================================== */

const IDB = {
  db: null,

  /**
   * Inicializa y abre la base de datos IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store: Productos
        if (!db.objectStoreNames.contains('productos')) {
          const prodStore = db.createObjectStore('productos', { keyPath: 'id' });
          prodStore.createIndex('categoria', 'categoria', { unique: false });
          prodStore.createIndex('stock', 'stock', { unique: false });
        }

        // Store: Ventas
        if (!db.objectStoreNames.contains('ventas')) {
          const salesStore = db.createObjectStore('ventas', { keyPath: 'id' });
          salesStore.createIndex('fecha_corta', 'fecha_corta', { unique: false });
          salesStore.createIndex('producto_id', 'producto_id', { unique: false });
        }

        // Store: Gastos
        if (!db.objectStoreNames.contains('gastos')) {
          const expStore = db.createObjectStore('gastos', { keyPath: 'id' });
          expStore.createIndex('fecha_corta', 'fecha_corta', { unique: false });
          expStore.createIndex('categoria', 'categoria', { unique: false });
        }

        // Store: Cierres Diarios
        if (!db.objectStoreNames.contains('cierres_diarios')) {
          const closeStore = db.createObjectStore('cierres_diarios', { keyPath: 'id' });
          closeStore.createIndex('fecha', 'fecha', { unique: true });
        }

        // Store: Cola de Sincronización
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }

        // Store: Configuración del Negocio (Nueva en v2)
        if (!db.objectStoreNames.contains('configuracion')) {
          db.createObjectStore('configuracion', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('IndexedDB v2 inicializada correctamente.');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  /**
   * Obtiene todos los registros de un ObjectStore
   */
  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene un registro por su ID
   */
  async getById(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene registros por índice y valor
   */
  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Inserta o actualiza un registro en un ObjectStore
   */
  async put(storeName, item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Elimina un registro por ID
   */
  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Borra todos los registros de un Store
   */
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

window.IDB = IDB;
