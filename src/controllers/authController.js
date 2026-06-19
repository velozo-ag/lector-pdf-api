// Archivo: src/controllers/authController.js
const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createDefaultCategories } = require("./calendarCategoryController");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días en ms
    path: "/api/auth",
  });
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios." });
    }

    if (!JWT_SECRET) {
      console.error("CRÍTICO: JWT_SECRET no está definido en las variables de entorno.");
      return res.status(500).json({ error: "Error de configuración del servidor." });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "El email ya se encuentra registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const { accessToken, refreshToken } = generateTokens(newUser.id);
    setRefreshCookie(res, refreshToken);

    // Crear categorías de calendario por defecto (no bloquea la respuesta si falla)
    createDefaultCategories(newUser.id).catch((err) =>
      console.error("Error creando categorías por defecto:", err)
    );

    res.status(201).json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
      token: accessToken,
    });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios." });
    }

    if (!JWT_SECRET) {
      console.error("CRÍTICO: JWT_SECRET no está definido en las variables de entorno.");
      return res.status(500).json({ error: "Error de configuración del servidor." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email },
      token: accessToken,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({ error: "Sin refresh token. Iniciá sesión nuevamente." });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Verificar que el usuario aún existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado." });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
    setRefreshCookie(res, newRefreshToken); // Rotar el refresh token

    res.status(200).json({ token: accessToken, user });
  } catch (error) {
    // Token inválido o expirado
    res.clearCookie("refresh_token", { path: "/api/auth" });
    return res.status(401).json({ error: "Refresh token inválido o expirado. Iniciá sesión nuevamente." });
  }
};

const logout = (req, res) => {
  res.clearCookie("refresh_token", { path: "/api/auth" });
  res.status(200).json({ message: "Sesión cerrada correctamente." });
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error en getMe:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = { register, login, refresh, logout, getMe };

