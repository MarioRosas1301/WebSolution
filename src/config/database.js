const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQLPORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  try {
    // Crear pool directamente (Railway ya tiene la DB creada)
    pool = mysql.createPool(dbConfig);

    // Verificar conexión
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL exitosa');
    connection.release();

    // Crear tabla si no existe (esto sí es válido en Railway)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100),
        telefono VARCHAR(15) NOT NULL,
        email VARCHAR(100) NOT NULL,
        producto VARCHAR(200),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        procesado TINYINT(1) DEFAULT 0,
        INDEX idx_fecha (fecha_creacion),
        INDEX idx_procesado (procesado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tabla contactos verificada/creada');

    return pool;

  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('El pool de base de datos no ha sido inicializado');
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool
};