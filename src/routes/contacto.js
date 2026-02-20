const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// POST - Guardar nuevo contacto
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, producto, mensaje } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!nombre || !telefono || !email) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, teléfono y email son obligatorios'
      });
    }

    // Validar formato de teléfono (10 dígitos, empieza con 09)
    if (!/^09\d{8}$/.test(telefono)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener 10 dígitos y empezar con 09'
      });
    }

    // Validar formato de email
    if (!email.includes('@') || !email.includes('.com')) {
      return res.status(400).json({
        success: false,
        message: 'El email debe contener @ y .com'
      });
    }

    const pool = getPool();
    const query = `
      INSERT INTO contactos (nombre, apellido, telefono, email, producto)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      nombre,
      apellido || null,
      telefono,
      email,
      producto || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Contacto guardado exitosamente',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error al guardar contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el contacto en la base de datos'
    });
  }
});

// GET - Obtener todos los contactos (opcional, para verificar)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM contactos ORDER BY fecha_creacion DESC'
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contactos'
    });
  }
});

module.exports = router;
