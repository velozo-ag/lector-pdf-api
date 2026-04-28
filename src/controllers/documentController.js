const prisma = require("../config/prisma");
const pdfService = require("../services/pdfService");
const fs = require("fs").promises;

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo PDF." });
    }

    const userId = req.userId;
    const originalName = Buffer.from(req.file.originalname, "latin1").toString(
      "utf8",
    );
    const inputFilePath = req.file.path;
    const tempUrl = `/uploads/${req.file.filename}`;

    // Si el frontend envía folderId en el FormData, lo capturamos
    const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;

    const nuevoDocumento = await prisma.document.create({
      data: {
        title: originalName,
        filePath: tempUrl,
        ocrStatus: "PENDING",
        userId: userId,
        folderId: folderId,
      },
    });

    res.status(202).json({
      message: "Documento subido. Procesamiento OCR en segundo plano.",
      document: nuevoDocumento,
    });

    // Proceso en segundo plano
    pdfService
      .analyzeAndProcessPdf(inputFilePath, req.file.filename)
      .then(async (result) => {
        await prisma.document.update({
          where: { id: nuevoDocumento.id },
          data: {
            filePath: result.finalPath,
            ocrStatus: result.status,
          },
        });
        console.log(
          `[Background Task] Documento ${nuevoDocumento.id} finalizado con estado: ${result.status}`,
        );
      })
      .catch(async (error) => {
        console.error(
          `[Background Task] Error procesando documento ${nuevoDocumento.id}:`,
          error,
        );
        await prisma.document.update({
          where: { id: nuevoDocumento.id },
          data: { ocrStatus: "FAILED" },
        });
      });
  } catch (error) {
    console.error("Error en uploadDocument:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al procesar la subida." });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const { folderId } = req.query;
    let filters = { userId: req.userId };

    // Permite filtrar documentos por carpeta
    if (folderId) {
      filters.folderId = parseInt(folderId, 10);
    }

    const documents = await prisma.document.findMany({
      where: filters,
      include: { folder: { select: { name: true } } }, // Trae el nombre de la carpeta si tiene
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(documents);
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    res.status(500).json({ error: "Error interno al obtener los documentos." });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    if (document.userId !== req.userId) {
      return res.status(403).json({ error: "Acceso denegado." });
    }

    const fileName = document.filePath.replace("/uploads/", "");
    const fullFilePath = require("path").join(
      __dirname,
      "../../uploads/",
      fileName,
    );

    try {
      await fs.access(fullFilePath);
      await fs.unlink(fullFilePath);
    } catch (fsError) {
      console.warn(
        `[Advertencia] No se pudo eliminar el archivo físico ${fullFilePath}:`,
        fsError.message,
      );
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    res
      .status(200)
      .json({ message: "Documento y archivo eliminados correctamente." });
  } catch (error) {
    console.error("Error eliminando documento:", error);
    res.status(500).json({ error: "Error interno al eliminar el documento." });
  }
};

// NUEVO: Alternar estado de favorito
const toggleFavorite = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const { isFavorite } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.userId !== req.userId) {
      return res
        .status(404)
        .json({ error: "Documento no encontrado o acceso denegado." });
    }

    const docActualizado = await prisma.document.update({
      where: { id: documentId },
      data: { isFavorite },
    });

    res.status(200).json(docActualizado);
  } catch (error) {
    console.error("Error actualizando favorito:", error);
    res.status(500).json({ error: "Error interno al actualizar favorito." });
  }
};

// NUEVO: Mover a una carpeta
const moveToFolder = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id, 10);
    const { folderId } = req.body; // Puede ser null para sacar de la carpeta

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.userId !== req.userId) {
      return res
        .status(404)
        .json({ error: "Documento no encontrado o acceso denegado." });
    }

    const docActualizado = await prisma.document.update({
      where: { id: documentId },
      data: { folderId: folderId ? parseInt(folderId, 10) : null },
    });

    res.status(200).json(docActualizado);
  } catch (error) {
    console.error("Error moviendo documento:", error);
    res.status(500).json({ error: "Error interno al mover documento." });
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
  toggleFavorite,
  moveToFolder,
};
