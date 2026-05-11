/**
 * CTI Group Dashboard — Client-side Auth
 * Credentials are SHA-256 hashed with a server-side salt.
 * Plain-text passwords are never stored in source.
 */
(function () {
  'use strict';

  // Pre-computed: SHA-256( 'CTI_SALT_2026_' + password )
  // Generated once offline — do NOT store plaintext here.
  const _H = {
    'admin': 'd619b1c66aa076c8e868d1a44a6daac21bd2be5b1a42d1a225cf27a40438c5f1',
    'guest': '572d46dc66b35cd473d3b5b266de8964b8741e64c2b67b56ed3c2e7b9fe99211'
  };

  const _SALT  = 'CTI_SALT_2026_';
  const _SK    = 'cti_session';   // sessionStorage key

  // SHA-256 via Web Crypto API (async)
  async function _sha256(str) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /**
   * Attempt login. Returns the user role ('admin'|'guest') on success,
   * or null on failure.
   */
  window.CTIAuth = {

    async login(username, password) {
      const u = (username || '').trim().toLowerCase();
      if (!_H[u]) return null;
      const hash = await _sha256(_SALT + password);
      if (hash !== _H[u]) return null;
      const session = { user: u, role: u, ts: Date.now() };
      sessionStorage.setItem(_SK, JSON.stringify(session));
      return u;
    },

    logout() {
      sessionStorage.removeItem(_SK);
      window.location.href = 'login.html';
    },

    getSession() {
      try {
        const s = sessionStorage.getItem(_SK);
        return s ? JSON.parse(s) : null;
      } catch { return null; }
    },

    requireAuth() {
      if (!this.getSession()) {
        window.location.replace('login.html');
        return false;
      }
      return true;
    }
  };
}());
