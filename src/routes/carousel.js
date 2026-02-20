const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ruta de la carpeta de imágenes del carrusel
const CAROUSEL_DIR = path.join(__dirname, '..', '..', 'images', 'carousel');

// Asegurar que la carpeta existe
if (!fs.existsSync(CAROUSEL_DIR)) {
    fs.mkdirSync(CAROUSEL_DIR, { recursive: true });
}

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CAROUSEL_DIR);
    },
    filename: (req, file, cb) => {
        // Mantener el nombre original, sanitizando caracteres especiales
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/webp', 'image/png', 'image/jpeg', 'image/avif', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${allowedTypes.join(', ')}`));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
});

/**
 * GET /api/carousel
 * Devuelve la lista de imágenes del carrusel 100% dinámico.
 * Lee DIRECTAMENTE los archivos de la carpeta images/carousel.
 * 
 * - Si el archivo tiene config en carousel-config.json, usa nombre y link de ahí.
 * - Si es una imagen NUEVA (sin config), se le asigna "Producto nuevo 1", "Producto nuevo 2", etc.
 * - NO importa el JSON para decidir qué imágenes mostrar: solo importa lo que hay en la carpeta.
 */
router.get('/carousel', (req, res) => {
    try {
        const configPath = path.join(CAROUSEL_DIR, 'carousel-config.json');
        let config = {};

        // Cargar configuración si existe (solo para nombres/links personalizados)
        if (fs.existsSync(configPath)) {
            try {
                const configData = fs.readFileSync(configPath, 'utf-8');
                const configArray = JSON.parse(configData);
                configArray.forEach(item => {
                    config[item.filename] = item;
                });
            } catch (e) {
                // Si el JSON está corrupto, ignorar y seguir
                console.warn('carousel-config.json corrupto, se ignorará:', e.message);
            }
        }

        // Leer archivos de la carpeta
        const files = fs.readdirSync(CAROUSEL_DIR);
        const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.avif', '.svg'];

        // Contador para productos nuevos sin nombre configurado
        let newProductCounter = 0;

        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .map(file => {
                const backendPort = process.env.PORT || 3000;
                const imageUrl = `http://localhost:${backendPort}/images/carousel/${file}`;

                // Si hay configuración para este archivo, usarla
                if (config[file]) {
                    return {
                        url: imageUrl,
                        name: config[file].name,
                        link: config[file].link || `producto/${formatSlug(file)}`
                    };
                }

                // Imagen nueva sin config -> auto-numerar
                newProductCounter++;
                return {
                    url: imageUrl,
                    name: `Producto nuevo ${newProductCounter}`,
                    link: `producto/nuevo-${newProductCounter}`
                };
            });

        res.json(images);
    } catch (error) {
        console.error('Error al obtener imágenes del carrusel:', error);
        res.status(500).json({ error: 'Error al obtener las imágenes del carrusel' });
    }
});

/**
 * POST /api/carousel
 * Subir una nueva imagen al carrusel.
 * Body (multipart/form-data):
 *   - image: archivo de imagen
 *   - name: (opcional) nombre para mostrar
 *   - link: (opcional) ruta de enlace
 */
router.post('/carousel', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        }

        const { name, link } = req.body;

        // Actualizar configuración si se proporcionan metadatos
        if (name || link) {
            updateConfig(req.file.filename, { name, link });
        }

        const backendPort = process.env.PORT || 3000;
        res.status(201).json({
            message: 'Imagen subida exitosamente',
            image: {
                url: `http://localhost:${backendPort}/images/carousel/${req.file.filename}`,
                name: name || formatFileName(req.file.filename),
                link: link || `producto/${formatSlug(req.file.filename)}`,
                filename: req.file.filename
            }
        });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ error: 'Error al subir la imagen' });
    }
});

/**
 * DELETE /api/carousel/:filename
 * Eliminar una imagen del carrusel.
 */
router.delete('/carousel/:filename', (req, res) => {
    try {
        const filePath = path.join(CAROUSEL_DIR, req.params.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        fs.unlinkSync(filePath);

        // Remover de la configuración
        removeFromConfig(req.params.filename);

        res.json({ message: 'Imagen eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ error: 'Error al eliminar la imagen' });
    }
});

// ==================== UTILIDADES ====================

/**
 * Formatea un nombre de archivo a nombre legible
 * Ej: "AutodeskL.webp" -> "Autodesk L"
 */
function formatFileName(filename) {
    return path.basename(filename, path.extname(filename))
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}

/**
 * Genera un slug desde un nombre de archivo
 * Ej: "AutodeskL.webp" -> "autodesk-l"
 */
function formatSlug(filename) {
    return path.basename(filename, path.extname(filename))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Actualizar la configuración del carrusel
 */
function updateConfig(filename, data) {
    const configPath = path.join(CAROUSEL_DIR, 'carousel-config.json');
    let config = [];

    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    const existingIndex = config.findIndex(item => item.filename === filename);
    const entry = {
        filename,
        name: data.name || formatFileName(filename),
        link: data.link || `producto/${formatSlug(filename)}`
    };

    if (existingIndex >= 0) {
        config[existingIndex] = entry;
    } else {
        config.push(entry);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Remover un archivo de la configuración
 */
function removeFromConfig(filename) {
    const configPath = path.join(CAROUSEL_DIR, 'carousel-config.json');
    if (!fs.existsSync(configPath)) return;

    let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config = config.filter(item => item.filename !== filename);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = router;
