// Archivo: src/controllers/calendarCategoryController.js
const prisma = require("../config/prisma");

const DEFAULT_CATEGORIES = [
  { name: "Personal", color: "#0891b2" },
  { name: "Work", color: "#ea580c" },
  { name: "Meeting", color: "#7c3aed" },
  { name: "Important", color: "#be123c" },
  { name: "Holiday", color: "#b45309" },
];

/**
 * Crea las categorías por defecto para un usuario recién registrado.
 * Se llama desde authController tras crear el usuario.
 */
const createDefaultCategories = async (userId) => {
  await prisma.calendarCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({ ...cat, userId })),
    skipDuplicates: true,
  });
};

// GET /api/calendar/categories
// Si el usuario no tiene ninguna categoría (ej: se registró antes del módulo de calendario),
// las crea automáticamente antes de responder.
const getCategories = async (req, res) => {
  try {
    let categories = await prisma.calendarCategory.findMany({
      where: { userId: req.userId },
      orderBy: { id: "asc" },
    });

    if (categories.length === 0) {
      await createDefaultCategories(req.userId);
      categories = await prisma.calendarCategory.findMany({
        where: { userId: req.userId },
        orderBy: { id: "asc" },
      });
    }

    res.json(categories);
  } catch (error) {
    console.error("Error en getCategories:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// POST /api/calendar/categories
const createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: "Nombre y color son obligatorios." });
    }
    const category = await prisma.calendarCategory.create({
      data: { name: name.trim(), color, userId: req.userId },
    });
    res.status(201).json(category);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre." });
    }
    console.error("Error en createCategory:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// PUT /api/calendar/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const existing = await prisma.calendarCategory.findFirst({
      where: { id: Number(id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Categoría no encontrada." });

    const updated = await prisma.calendarCategory.update({
      where: { id: Number(id) },
      data: { name: name?.trim() ?? existing.name, color: color ?? existing.color },
    });
    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre." });
    }
    console.error("Error en updateCategory:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// DELETE /api/calendar/categories/:id
// Los eventos de la categoría eliminada se reasignan a "Personal"
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.calendarCategory.findFirst({
      where: { id: Number(id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Categoría no encontrada." });
    if (existing.name === "Personal") {
      return res.status(400).json({ error: "No puedes eliminar la categoría Personal." });
    }

    // Reasignar eventos al color y nombre de Personal
    const personal = await prisma.calendarCategory.findFirst({
      where: { userId: req.userId, name: "Personal" },
    });

    if (personal) {
      await prisma.calendarEvent.updateMany({
        where: { userId: req.userId, categoryName: existing.name },
        data: { categoryName: "Personal", color: personal.color },
      });
    }

    await prisma.calendarCategory.delete({ where: { id: Number(id) } });
    res.json({ message: "Categoría eliminada correctamente." });
  } catch (error) {
    console.error("Error en deleteCategory:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = {
  createDefaultCategories,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
