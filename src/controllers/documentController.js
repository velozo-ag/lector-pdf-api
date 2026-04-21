// Archivo: src/controllers/documentController.js
const prisma = require("../config/prisma");
const pdfService = require("../services/pdfService");
const fs = require("fs").promises;
const path = require("path");

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo PDF." });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: "El userId es requerido." });
    }

    const originalName = Buffer.from(req.file.originalname, "latin1").toString(
      "utf8",
    );
    const inputFilePath = req.file.path;
    const tempUrl = `/uploads/${req.file.filename}`;

    const nuevoDocumento = await prisma.document.create({
      data: {
        title: originalName,
        filePath: tempUrl,
        ocrStatus: "PENDING",
        userId: userId,
      },
    });

    res.status(202).json({
      message: "Documento subido. Iniciando análisis en segundo plano...",
      document: nuevoDocumento,
    });

    procesarDocumentoBackground(
      nuevoDocumento.id,
      inputFilePath,
      originalName,
    ).catch((err) =>
      console.error(
        `[Background Task] Error no manejado en doc ${nuevoDocumento.id}:`,
        err,
      ),
    );
  } catch (error) {
    console.error("Error en uploadDocument:", error);
    res.status(500).json({ error: "Error interno al recibir el documento." });
  }
};

async function procesarDocumentoBackground(
  documentId,
  inputFilePath,
  originalName,
) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "PROCESSING" },
    });

    const result = await pdfService.analyzeAndProcessPdf(
      inputFilePath,
      originalName,
    );

    await prisma.document.update({
      where: { id: documentId },
      data: {
        filePath: result.finalPath,
        ocrStatus: result.status,
      },
    });
    console.log(
      `[Background Task] Documento ${documentId} finalizado con estado: ${result.status}`,
    );
  } catch (error) {
    console.error(
      `[Background Task] Fallo crítico procesando doc ${documentId}:`,
      error.message,
    );
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "FAILED" },
    });
  }
}

const getAllDocuments = async (req, res) => {
  try {
    const documentos = await prisma.document.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(documentos);
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    res.status(500).json({ error: "Error al obtener los documentos." });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return res
        .status(400)
        .json({ error: "El ID del documento debe ser un número válido." });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado." });
    }

    if (document.userId !== req.userId) {
      return res.status(403).json({
        error: "Acceso denegado. Este documento pertenece a otro usuario.",
      });
    }

    if (document.filePath) {
      const absolutePath = path.join(__dirname, "../..", document.filePath);

      try {
        await fs.unlink(absolutePath);
        console.log(`[Storage] Archivo eliminado del disco: ${absolutePath}`);
      } catch (fsError) {
        if (fsError.code === "ENOENT") {
          console.log(
            `[Storage] Advertencia: Archivo ya no existía en disco: ${absolutePath}`,
          );
        } else {
          console.error(
            `[Storage] Error al borrar archivo en disco: ${fsError.message}`,
          );
        }
      }
    }

    // 3. Limpieza Lógica (Base de datos + Cascada a Notas)
    await prisma.document.delete({
      where: { id: documentId },
    });

    res.status(200).json({
      message: "Documento y archivos asociados eliminados correctamente.",
    });
  } catch (error) {
    console.error("Error en deleteDocument:", error);
    res
      .status(500)
      .json({ error: "Error interno al intentar eliminar el documento." });
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  deleteDocument,
};
