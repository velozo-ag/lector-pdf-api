// Archivo: src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. Token faltante o formato inválido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Inyectamos el userId en la request para que los controladores aíslen los datos
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Acceso denegado. Token inválido o expirado." });
  }
};

module.exports = authMiddleware;
