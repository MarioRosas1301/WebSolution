const express = require('express');
const cors = require('cors');
const path = require('path');
const carouselRoutes = require('./routes/carousel');
const contactoRoutes = require('./routes/contacto');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir imágenes estáticas desde la carpeta images/carousel
app.use('/images/carousel', express.static(path.join(__dirname, '..', 'images', 'carousel')));

// Servir assets de Autodesk (iconos, poster, videos)
app.use('/images/autodesk', express.static(path.join(__dirname, '..', 'images', 'autodesk')));

// ==========================
// RUTAS API
// ==========================
app.use('/api', carouselRoutes);
app.use('/api/contacto', contactoRoutes);

// Endpoint de verificación del backend
app.get('/api', (req, res) => {
    res.json({
        message: 'Wefsolution Backend API',
        version: '1.0.0',
        endpoints: {
            carousel: {
                'GET /api/carousel': 'Obtener todas las imágenes del carrusel',
                'POST /api/carousel': 'Agregar una nueva imagen al carrusel (multipart/form-data)',
                'DELETE /api/carousel/:filename': 'Eliminar una imagen del carrusel'
            },
            contacto: {
                'GET /api/contacto': 'Obtener todos los contactos',
                'POST /api/contacto': 'Guardar un nuevo contacto'
            }
        }
    });
});

// ==========================
// SERVIR FRONTEND REACT
// ==========================
app.use(express.static(path.join(__dirname, 'public')));

// Soporte para React Router (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================
// INICIAR SERVIDOR
// ==========================
async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`========================================`);
            console.log(`  Backend + Frontend corriendo en:`);
            console.log(`  http://localhost:${PORT}`);
            console.log(`  Base de datos MySQL conectada`);
            console.log(`========================================`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();