const prisma = require("../config/prisma");

const verifyNoteOwnership = async (noteId, userId, res) => {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) {
    res.status(404).json({ error: "Nota no encontrada." });
    return null;
  }
  if (note.userId !== userId) {
    res.status(403).json({ error: "Acceso denegado." });
    return null;
  }
  return note;
};

const getNotes = async (req, res) => {
  try {
    const { documentId, folderId } = req.query;

    let filters = { userId: req.userId };
    if (folderId) filters.folderId = parseInt(folderId, 10);
    if (documentId) {
      filters.documents = {
        some: { id: parseInt(documentId, 10) }, 
      };
    }

    const notes = await prisma.note.findMany({
      where: filters,
      include: {
        documents: { select: { id: true, title: true } }, 
        folder: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json(notes);
  } catch (error) {
    console.error("Error obteniendo notas globales:", error);
    res.status(500).json({ error: "Error interno al obtener las notas." });
  }
};

const createNote = async (req, res) => {
  try {
    const { title, documentId, folderId } = req.body;

    let data = {
      title: title || "Nueva Nota",
      content: "",
      highlights: [],
      userId: req.userId,
      folderId: folderId ? parseInt(folderId, 10) : null,
    };

    if (documentId) {
      const docId = parseInt(documentId, 10);
      const doc = await prisma.document.findUnique({ where: { id: docId } });

      if (doc && doc.userId === req.userId) {
        data.documents = { connect: { id: docId } };
      }
    }

    const nuevaNota = await prisma.note.create({
      data,
      include: { documents: { select: { id: true } } },
    });

    res.status(201).json(nuevaNota);
  } catch (error) {
    console.error("Error creando nota global:", error);
    res.status(500).json({ error: "Error interno al crear la nota." });
  }
};

const getNoteById = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    if (isNaN(noteId)) return res.status(400).json({ error: "ID inválido." });

    const note = await verifyNoteOwnership(noteId, req.userId, res);
    if (!note) return;

    const notaCompleta = await prisma.note.findUnique({
      where: { id: noteId },
      include: { documents: { select: { id: true, title: true } } },
    });

    res.status(200).json(notaCompleta);
  } catch (error) {
    console.error("Error obteniendo la nota:", error);
    res.status(500).json({ error: "Error interno." });
  }
};

const updateNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { title, content, highlights, isFavorite, folderId } = req.body;

    if (!(await verifyNoteOwnership(noteId, req.userId, res))) return;

    const notaActualizada = await prisma.note.update({
      where: { id: noteId },
      data: {
        title,
        content,
        highlights,
        isFavorite,
        folderId: folderId !== undefined ? folderId : undefined,
      },
      include: { documents: { select: { id: true } } },
    });

    res.status(200).json(notaActualizada);
  } catch (error) {
    console.error("Error actualizando nota:", error);
    res.status(500).json({ error: "Error interno al actualizar la nota." });
  }
};

const linkNoteToDocument = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const { documentId } = req.body;

    if (!(await verifyNoteOwnership(noteId, req.userId, res))) return;

    const docId = parseInt(documentId, 10);
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc || doc.userId !== req.userId) {
      return res
        .status(403)
        .json({ error: "Documento no encontrado o acceso denegado." });
    }

    const notaVinculada = await prisma.note.update({
      where: { id: noteId },
      data: { documents: { connect: { id: docId } } },
    });

    res.status(200).json(notaVinculada);
  } catch (error) {
    console.error("Error vinculando nota:", error);
    res.status(500).json({ error: "Error al vincular." });
  }
};

const unlinkNoteFromDocument = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    const documentId = parseInt(req.params.documentId, 10);

    if (!(await verifyNoteOwnership(noteId, req.userId, res))) return;

    await prisma.note.update({
      where: { id: noteId },
      data: { documents: { disconnect: { id: documentId } } },
    });

    res.status(200).json({ message: "Nota desvinculada del documento." });
  } catch (error) {
    console.error("Error desvinculando nota:", error);
    res.status(500).json({ error: "Error al desvincular." });
  }
};

const deleteNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id, 10);
    if (!(await verifyNoteOwnership(noteId, req.userId, res))) return;

    await prisma.note.delete({ where: { id: noteId } });
    res.status(200).json({ message: "Nota eliminada globalmente." });
  } catch (error) {
    console.error("Error eliminando nota:", error);
    res.status(500).json({ error: "Error al eliminar." });
  }
};

module.exports = {
  getNotes,
  createNote,
  getNoteById,
  updateNote,
  linkNoteToDocument,
  unlinkNoteFromDocument,
  deleteNote,
};
