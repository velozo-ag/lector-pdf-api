// Archivo: src/controllers/calendarEventController.js
const prisma = require("../config/prisma");

// GET /api/calendar/events
const getEvents = async (req, res) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: { userId: req.userId },
      orderBy: { start: "asc" },
    });
    res.json(events);
  } catch (error) {
    console.error("Error en getEvents:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// POST /api/calendar/events
const createEvent = async (req, res) => {
  try {
    const { title, description, start, end, allDay, color, categoryName } = req.body;

    if (!start || !end || !categoryName || !color) {
      return res.status(400).json({
        error: "Fecha de inicio, fin, categoría y color son obligatorios.",
      });
    }

    // Verificar que la categoría pertenece al usuario
    const category = await prisma.calendarCategory.findFirst({
      where: { userId: req.userId, name: categoryName },
    });
    if (!category) {
      return res.status(400).json({ error: "Categoría no válida." });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title: title?.trim() || "Sin título",
        description: description || null,
        start: new Date(start),
        end: new Date(end),
        allDay: allDay ?? false,
        color,
        categoryName,
        userId: req.userId,
      },
    });
    res.status(201).json(event);
  } catch (error) {
    console.error("Error en createEvent:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// PUT /api/calendar/events/:id — Actualización parcial (soporta drag&drop y edición inline)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: Number(id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Evento no encontrado." });

    const {
      title,
      description,
      start,
      end,
      allDay,
      color,
      categoryName,
    } = req.body;

    // Si se cambia la categoría, verificar que exista para el usuario
    if (categoryName && categoryName !== existing.categoryName) {
      const category = await prisma.calendarCategory.findFirst({
        where: { userId: req.userId, name: categoryName },
      });
      if (!category) {
        return res.status(400).json({ error: "Categoría no válida." });
      }
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: Number(id) },
      data: {
        title: title?.trim() ?? existing.title,
        description: description !== undefined ? description : existing.description,
        start: start ? new Date(start) : existing.start,
        end: end ? new Date(end) : existing.end,
        allDay: allDay !== undefined ? allDay : existing.allDay,
        color: color ?? existing.color,
        categoryName: categoryName ?? existing.categoryName,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error en updateEvent:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// DELETE /api/calendar/events/:id
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: Number(id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Evento no encontrado." });

    await prisma.calendarEvent.delete({ where: { id: Number(id) } });
    res.json({ message: "Evento eliminado correctamente." });
  } catch (error) {
    console.error("Error en deleteEvent:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
