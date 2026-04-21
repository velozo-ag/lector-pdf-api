const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeName = utf8Name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .toLowerCase();
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    if (ext === '.pdf' && mimeType === 'application/pdf') {
        cb(null, true); 
    } else {
        cb(new Error('Formato inválido. Acceso denegado: solo se permiten archivos PDF.'), false); // Rechaza el archivo
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 
    }
});

module.exports = upload;