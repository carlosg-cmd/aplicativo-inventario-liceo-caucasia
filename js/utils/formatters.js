/* ==========================================================================
   CONTA-SMART SENA - Formateadores
   ========================================================================== */

const Formatters = {
  /**
   * Formatea un número como moneda COP/USD
   */
  currency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: CONFIG.DEFAULT_CURRENCY,
      maximumFractionDigits: 0
    }).format(num);
  },

  /**
   * Formatea fecha completa (ej: 1 de Agosto de 2026, 03:30 PM)
   */
  dateTime(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  },

  /**
   * Formatea fecha corta (YYYY-MM-DD)
   */
  dateShort(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Formatea fecha legible corta (ej: 01 Ago 2026)
   */
  dateReadable(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  },

  /**
   * Formatea porcentaje
   */
  percentage(value) {
    const num = Number(value) || 0;
    return `${num.toFixed(1)}%`;
  },

  /**
   * Genera un UUID v4 simple
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   */
  getTodayString() {
    return this.dateShort(new Date());
  }
};

window.Formatters = Formatters;
