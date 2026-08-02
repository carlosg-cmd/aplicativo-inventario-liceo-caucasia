/* ==========================================================================
   CONTA-SMART SENA - Módulo de Autenticación (Supabase Only)
   ========================================================================== */

const AuthModule = {
  currentUser: null,

  /**
   * Inicializa el estado de la sesión al arrancar la app.
   * Verifica el token de Supabase.
   */
  async init() {
    if (SyncManager.supabaseClient) {
      try {
        const { data: { session } } = await SyncManager.supabaseClient.auth.getSession();
        if (session && session.user) {
          this.currentUser = this._buildUserFromSupabase(session.user);
          sessionStorage.setItem('conta_session', JSON.stringify(this.currentUser));
          return;
        }
      } catch (err) {
        console.warn('Error verificando sesión en Supabase:', err);
      }
    }

    // Limpiar sesión residual si la verificación falló o no hay sesión
    this.currentUser = null;
    sessionStorage.removeItem('conta_session');
  },

  /**
   * Comprueba si el usuario está autenticado.
   */
  isAuthenticated() {
    return !!this.currentUser;
  },

  /**
   * Intenta iniciar sesión contra Supabase Auth.
   * Rechaza cualquier intento inválido o usuarios inexistentes.
   *
   * @returns {Promise<boolean>}
   */
  async login(email, password) {
    if (!email || !password) {
      UI.toast('Ingresa tu correo y contraseña.', 'danger');
      return false;
    }

    if (!SyncManager.supabaseClient) {
      UI.toast('Error: Cliente Supabase no inicializado. Contacte a soporte.', 'danger');
      return false;
    }

    // Mostrar estado de carga
    const loginBtn = document.getElementById('login-submit-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Verificando...';
    }

    try {
      const { data, error } = await SyncManager.supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        // Supabase devuelve error explícito → credenciales inválidas o usuario no existe
        console.warn('Supabase Auth error:', error.message);
        UI.toast(this._mapSupabaseError(error.message), 'danger');
        return false;
      }

      if (!data.user) {
        UI.toast('No se pudo verificar el usuario. Intenta nuevamente.', 'danger');
        return false;
      }

      this.currentUser = this._buildUserFromSupabase(data.user);
      sessionStorage.setItem('conta_session', JSON.stringify(this.currentUser));
      UI.toast(`¡Bienvenido, ${this.currentUser.name}!`, 'success');
      return true;

    } catch (err) {
      console.error('Error de conexión con Supabase Auth:', err);
      UI.toast('Error de conexión. Verifica tu acceso a internet e intenta nuevamente.', 'danger');
      return false;

    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
      }
    }
  },

  /**
   * Cierra la sesión activa en Supabase.
   */
  async logout() {
    if (SyncManager.supabaseClient) {
      try {
        await SyncManager.supabaseClient.auth.signOut();
      } catch (_) { /* ignorar errores de red al cerrar sesión */ }
    }

    this.currentUser = null;
    sessionStorage.removeItem('conta_session');
    UI.toast('Sesión cerrada correctamente.', 'info');
    AppRouter.navigate('login');
  },

  /**
   * Construye el objeto de usuario desde la respuesta de Supabase
   */
  _buildUserFromSupabase(supabaseUser) {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
      role: 'Propietario / Admin',
      mode: 'supabase',
      loginTime: new Date().toISOString()
    };
  },

  /**
   * Traduce mensajes de error de Supabase Auth al español
   */
  _mapSupabaseError(message) {
    if (!message) return 'Error desconocido al iniciar sesión.';
    const m = message.toLowerCase();
    if (m.includes('invalid login') || m.includes('invalid credentials')) {
      return 'Correo o contraseña incorrectos. Verifica tus credenciales de administrador.';
    }
    if (m.includes('email not confirmed')) {
      return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
    }
    if (m.includes('user not found')) {
      return 'El usuario no existe en el sistema. Contacta al administrador de Supabase.';
    }
    if (m.includes('too many requests')) {
      return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
    }
    if (m.includes('network') || m.includes('fetch')) {
      return 'Error de red. Verifica tu conexión a internet.';
    }
    return `Error de autenticación: ${message}`;
  }
};

window.AuthModule = AuthModule;
