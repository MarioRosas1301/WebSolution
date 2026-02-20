const mysql = require('mysql2/promise');
const {config} = require("dotenv")

config();

// Configuración de la conexión a MySQL
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD, 
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
let pool;

async function initializeDatabase() {
  try {
    // Primero conectar sin especificar la base de datos
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    // Crear la base de datos si no existe
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Base de datos '${dbConfig.database}' verificada/creada`);

    // Usar la base de datos
    await connection.query(`USE ${dbConfig.database}`);

    // Crear la tabla de contactos si no existe
    const createTableQuery = `
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
    `;

    await connection.query(createTableQuery);
    console.log('Tabla contactos verificada/creada');

    await connection.end();

    // Crear el pool con la base de datos ya inicializada
    pool = mysql.createPool(dbConfig);
    console.log('Pool de conexiones MySQL creado exitosamente');

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
