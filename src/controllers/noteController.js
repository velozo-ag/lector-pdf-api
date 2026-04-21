const prisma = require("../config/prisma");

const verifyDocumentOwnership = async (documentId, userId, res) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    res.status(404).json({ error: "Documento no encontrado." });
    return false;
  }
  if (doc.userId !== userId) {
    res.status(403).json({ error: "Acceso denegado." });
    return false;
  }
  return true;
};

const verifyNoteOwnership = async (noteId, userId, res) => {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: { document: true },
  });
  if (!note) {
    res.status(404).json({ error: "Nota no encontrada." });
    return null;
  }
  if (note.document.userId !== userId) {
    res.status(403).json({ error: "Acceso denegado." });
    return null;
  }
  return note;
};

const getNotesByDocumentId = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "El ID del documento debe ser un número válido." });
    }

    if (!(await verifyDocumentOwnership(documentId, req.userId, res))) return;

    const notes = await prisma.note.findMany({
      where: { documentId: documentId },
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

const createNote = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      return res.status(400).json({ error: "El ID del documento debe ser un número válido." });
    }

    if (!(await verifyDocumentOwnership(documentId, req.userId, res))) return;

    const nuevaNota = await prisma.note.create({
      data: {
        documentId: documentId,
        title: "Nueva Nota",
        content: "",
        highlights: [],
      },
    });

    res.status(201).json(nuevaNota);
  } catch (error) {
    console.error("Error creando nota:", error);
    res.status(500).json({ error: "Error interno al crear la nota." });
  }
};

const getNoteById = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    
    if (isNaN(noteId)) {
      return res.status(400).json({ error: "El ID de la nota debe ser un número válido." });
    }

    const note = await verifyNoteOwnership(noteId, req.userId, res);
    if (!note) return;

    delete note.document;
    res.status(200).json(note);
  } catch (error) {
    console.error("Error obteniendo la nota:", error);
    res.status(500).json({ error: "Error interno al obtener la nota." });
  }
};

const updateNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    
    if (isNaN(noteId)) {
      return res.status(400).json({ error: "El ID de la nota debe ser un número válido." });
    }

    const { title, content, highlights } = req.body;

    if (!(await verifyNoteOwnership(noteId, req.userId, res))) return;

    const notaActualizada = await prisma.note.update({
      where: { id: noteId },
      data: { title, content, highlights },
    });
    
    res.status(200).json(notaActualizada);

  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Nota no encontrada para actualizar." });
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