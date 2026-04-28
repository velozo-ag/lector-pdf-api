const prisma = require("../config/prisma");

const createFolder = async (req, res) => {
  try {
    const { name, type } = req.body; // type debe ser "DOCUMENT" o "NOTE"

    if (!name || !type) {
      return res
        .status(400)
        .json({ error: "El nombre y el tipo son obligatorios." });
    }

    const nuevaCarpeta = await prisma.folder.create({
      data: {
        name,
        type,
        userId: req.userId,
      },
    });

    res.status(201).json(nuevaCarpeta);
  } catch (error) {
    console.error("Error creando carpeta:", error);
    res.status(500).json({ error: "Error interno al crear la carpeta." });
  }
};

const getFolders = async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(folders);
  } catch (error) {
    console.error("Error obteniendo carpetas:", error);
    res.status(500).json({ error: "Error interno al obtener las carpetas." });
  }
};

const updateFolder = async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (isNaN(folderId) || !name) {
      return res
        .status(400)
        .json({ error: "ID de carpeta inválido o nombre faltante." });
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== req.userId) {
      return res
        .status(404)
        .json({ error: "Carpeta no encontrada o acceso denegado." });
    }

    const carpetaActualizada = await prisma.folder.update({
      where: { id: folderId },
      data: { name },
    });

    res.status(200).json(carpetaActualizada);
  } catch (error) {
    console.error("Error actualizando carpeta:", error);
    res.status(500).json({ error: "Error interno al actualizar la carpeta." });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== req.userId) {
      return res
        .status(404)
        .json({ error: "Carpeta no encontrada o acceso denegado." });
    }

    await prisma.folder.delete({ where: { id: folderId } });

    res.status(200).json({ message: "Carpeta eliminada correctamente." });
  } catch (error) {
    console.error("Error eliminando carpeta:", error);
    res.status(500).json({ error: "Error interno al eliminar la carpeta." });
  }
};

module.exports = {
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder,
};
