/* ==========================================================================
   CONTA-SMART SENA - Componentes de Interfaz (UI)
   ========================================================================== */

const UI = {
  /**
   * Muestra una notificación Toast flotante
   */
  toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'danger') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Abre un Modal especificado por su ID
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  /**
   * Cierra un Modal especificado por su ID
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Muestra un cuadro de diálogo modal de confirmación
   */
  confirm({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
    let confirmModal = document.getElementById('global-confirm-modal');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'global-confirm-modal';
      confirmModal.className = 'modal-overlay';
      confirmModal.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="confirm-modal-title" class="modal-title">Confirmación</h3>
            <button class="close-btn" onclick="UI.closeModal('global-confirm-modal')">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-msg" style="color: var(--text-muted); line-height: 1.6;"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="UI.closeModal('global-confirm-modal')" id="confirm-btn-cancel"></button>
            <button class="btn btn-primary" id="confirm-btn-ok"></button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-msg').innerHTML = message;
    document.getElementById('confirm-btn-cancel').textContent = cancelText;
    const okBtn = document.getElementById('confirm-btn-ok');
    okBtn.textContent = confirmText;

    // Clonar botón para remover event listeners previos
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.addEventListener('click', () => {
      UI.closeModal('global-confirm-modal');
      if (typeof onConfirm === 'function') onConfirm();
    });

    UI.openModal('global-confirm-modal');
  },

  /**
   * Renderiza íconos de Lucide si está cargado
   */
  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
};

window.UI = UI;
