const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: {
    error:
      "Demasiados intentos de inicio de sesión. Por favor, intenta de nuevo en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 15,
  message: {
    error:
      "Has alcanzado el límite de subida de documentos por hora. Intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 200,
  message: {
    error:
      "Tráfico inusual detectado. Por favor, reduce la velocidad de tus peticiones.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, uploadLimiter, apiLimiter };
