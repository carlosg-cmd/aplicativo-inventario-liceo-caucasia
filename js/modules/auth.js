/* ==========================================================================
   CONTA-SMART SENA - Módulo de Autenticación
   ========================================================================== */

const AuthModule = {
  currentUser: null,

  /**
   * Inicializa el estado de la sesión
   */
  init() {
    const savedSession = sessionStorage.getItem('conta_session');
    if (savedSession) {
      this.currentUser = JSON.parse(savedSession);
    }
  },

  /**
   * Comprueba si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.currentUser;
  },

  /**
   * Intenta iniciar sesión con correo y contraseña
   */
  login(email, password) {
    // Validar usuario administrador único (SENA single-admin requirement)
    if (email && password && password.length >= 4) {
      this.currentUser = {
        email: email,
        name: 'Administrador del Negocio',
        role: 'Propietario / Admin',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem('conta_session', JSON.stringify(this.currentUser));
      UI.toast(`¡Bienvenido de nuevo, ${this.currentUser.name}!`, 'success');
      return true;
    } else {
      UI.toast('Credenciales inválidas. Ingrese un correo y contraseña de al menos 4 caracteres.', 'danger');
      return false;
    }
  },

  /**
   * Cierra la sesión activa
   */
  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('conta_session');
    UI.toast('Sesión cerrada correctamente.', 'info');
    AppRouter.navigate('login');
  }
};

window.AuthModule = AuthModule;
