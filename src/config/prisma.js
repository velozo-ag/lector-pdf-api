// Archivo: src/config/prisma.js
const { PrismaClient } = require('@prisma/client');

// Instancia limpia y directa
const prisma = new PrismaClient();

module.exports = prisma;