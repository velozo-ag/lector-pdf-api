// Archivo: src/controllers/noteController.js
const prisma = require("../config/prisma");

// [Sidebar] Obtener notas de un documento excluyendo contenido pesado
const getNotesByDocumentId = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);

    if (isNaN(documentId)) {
      return res
        .status(400)
        .json({ error: "El ID del documento debe ser un número válido." });
    }

    const notes = await prisma.note.findMany({
      where: { documentId: documentId },
      // OPTIMIZACIÓN CLAVE: Excluimos 'content' y 'highlights'
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notes);
  } catch (error) {
    console.error("Error obteniendo notas:", error);
    res.status(500).json({ error: "Error interno al obtener las notas." });
  }
};

// [Editor] Crear una nota vacía asociada a un documento
const createNote = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);

    if (isNaN(documentId)) {
      return res
        .status(400)
        .json({ error: "El ID del documento debe ser un número válido." });
    }

    // Verificamos que el documento exista antes de atarle una nota
    const documentExists = await prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!documentExists) {
      return res.status(404).json({ error: "El documento no existe." });
    }

    const nuevaNota = await prisma.note.create({
      data: {
        documentId: documentId,
        title: "Nueva Nota",
        content: "",
        highlights: [], // Array nativo vacío
      },
    });

    res.status(201).json(nuevaNota);
  } catch (error) {
    console.error("Error creando nota:", error);
    res.status(500).json({ error: "Error interno al crear la nota." });
  }
};

// [Visor] Obtener una nota específica con todo su contenido
const getNoteById = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);

    if (isNaN(noteId)) {
      return res
        .status(400)
        .json({ error: "El ID de la nota debe ser un número válido." });
    }

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return res.status(404).json({ error: "Nota no encontrada." });
    }

    res.status(200).json(note);
  } catch (error) {
    console.error("Error obteniendo la nota:", error);
    res.status(500).json({ error: "Error interno al obtener la nota." });
  }
};

// [Auto-Guardado] Actualizar título, contenido y subrayados
const updateNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { title, content, highlights } = req.body;

    if (isNaN(noteId)) {
      return res
        .status(400)
        .json({ error: "El ID de la nota debe ser un número válido." });
    }

    const notaActualizada = await prisma.note.update({
      where: { id: noteId },
      data: {
        title,
        content,
        // Prisma inyecta el JSON de forma nativa a MySQL sin necesitar stringify
        highlights,
      },
    });

    res.status(200).json(notaActualizada);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Nota no encontrada para actualizar." });
    }
    console.error("Error actualizando nota:", error);
    res.status(500).json({ error: "Error interno al actualizar la nota." });
  }
};

module.exports = {
  getNotesByDocumentId,
  createNote,
  getNoteById,
  updateNote,
};
