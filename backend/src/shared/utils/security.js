const bcrypt = require('bcrypt');

/**
 * Utilidades de seguridad para gestión de usuarios
 */
const Security = {
  /**
   * Crea un hash seguro para la contraseña
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  },

  /**
   * Compara una contraseña plana con el hash de la base de datos
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  },

  // Nota: Implementar JWT aquí en el futuro para autenticación de API
};

module.exports = Security;