// Archivo: src/services/pdfService.js
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { PDFDocument } = require("pdf-lib");
const { createReadStream, createWriteStream } = require("fs");

const PDFParser = require("pdf2json");
const OCR_API_KEY = process.env.OCR_API_KEY || "helloworld";
const OCR_API_URL = "https://api.ocr.space/parse/image";

// Función de pausa para optimizar el límite de la API
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Función auxiliar para descargar un archivo desde una URL
 */
async function downloadFile(url, outputPath) {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  return new Promise((resolve, reject) => {
    const writer = createWriteStream(outputPath);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/**
 * Orquestador principal: Divide, procesa y une el PDF
 */
async function processPdfWithOCR(inputFilePath, originalName) {
  const outputFileName = `processed-${Date.now()}-${originalName}`;
  const outputFilePath = path.join(__dirname, "../../uploads/", outputFileName);

  const pdfBytes = await fs.readFile(inputFilePath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  const processedChunksPaths = [];

  console.log(`[OCR] Iniciando procesamiento de ${totalPages} páginas...`);

  for (let i = 0; i < totalPages; i += 3) {
    const chunkDoc = await PDFDocument.create();
    const pagesToCopy = [];

    for (let j = i; j < i + 3 && j < totalPages; j++) {
      pagesToCopy.push(j);
    }

    const copiedPages = await chunkDoc.copyPages(pdfDoc, pagesToCopy);
    copiedPages.forEach((page) => chunkDoc.addPage(page));

    const chunkBytes = await chunkDoc.save();
    const chunkPath = path.join(
      __dirname,
      "../../uploads/",
      `chunk-${Date.now()}-${i}.pdf`,
    );
    await fs.writeFile(chunkPath, chunkBytes);

    console.log(
      `[OCR] Enviando bloque páginas ${i + 1} a ${i + pagesToCopy.length}...`,
    );
    const formData = new FormData();
    formData.append("file", createReadStream(chunkPath));
    formData.append("language", "spa");
    formData.append("isCreateSearchablePdf", "true");
    formData.append("isSearchablePdfHideTextLayer", "true");

    try {
      const response = await axios.post(OCR_API_URL, formData, {
        headers: {
          apikey: OCR_API_KEY,
          ...formData.getHeaders(),
        },
      });

      const result = response.data;
      if (result.IsErroredOnProcessing) {
        throw new Error(`Error en OCR: ${result.ErrorMessage}`);
      }

      const processedChunkUrl = result.SearchablePDFURL;
      const processedChunkPath = path.join(
        __dirname,
        "../../uploads/",
        `processed-chunk-${Date.now()}-${i}.pdf`,
      );

      await downloadFile(processedChunkUrl, processedChunkPath);
      processedChunksPaths.push(processedChunkPath);

      await fs.unlink(chunkPath);

      // --- RETARDO ESTRATÉGICO ---
      // Si no es el último bloque, aplicamos la pausa de 6.1 segundos
      if (i + 3 < totalPages) {
        console.log(
          `[OCR] Lote completado. Esperando 6.1s para evitar límite de la API...`,
        );
        await delay(6100);
      }
    } catch (error) {
      console.error("[OCR] Fallo al procesar el bloque:", error.message);
      throw error;
    }
  }

  console.log("[OCR] Uniendo documento final...");
  const finalDoc = await PDFDocument.create();

  for (const chunkPath of processedChunksPaths) {
    const chunkBytes = await fs.readFile(chunkPath);
    const chunkPdf = await PDFDocument.load(chunkBytes, {
      ignoreEncryption: true,
    });
    const chunkPages = await finalDoc.copyPages(
      chunkPdf,
      chunkPdf.getPageIndices(),
    );
    chunkPages.forEach((page) => finalDoc.addPage(page));

    await fs.unlink(chunkPath);
  }

  const finalBytes = await finalDoc.save();
  await fs.writeFile(outputFilePath, finalBytes);
  await fs.unlink(inputFilePath);

  console.log("[OCR] ¡Procesamiento completo!");
  return `/uploads/${outputFileName}`;
}

function extractTextWithPdf2Json(filePath) {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser(this, 1);

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.warn(
        "[PDF Service] Advertencia extrayendo texto. Forzando OCR.",
        errData.parserError,
      );
      resolve("");
    });

    pdfParser.on("pdfParser_dataReady", () => {
      const text = pdfParser.getRawTextContent();
      resolve(text || "");
    });

    pdfParser.loadPDF(filePath);
  });
}

async function analyzeAndProcessPdf(inputFilePath, originalName) {
  try {
    // 1. Cargamos el PDF para saber exactamente cuántas páginas tiene
    const pdfBytes = await fs.readFile(inputFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    // 2. Extraemos el texto
    const extractedText = await extractTextWithPdf2Json(inputFilePath);
    const realTextLength = extractedText.replace(/\s+/g, "").length;

    // 3. Calculamos el promedio de caracteres por página
    const avgCharsPerPage = totalPages > 0 ? realTextLength / totalPages : 0;

    console.log(
      `[PDF Service] Análisis: ${totalPages} páginas, ${realTextLength} caracteres. Promedio: ${Math.round(avgCharsPerPage)} chars/pág.`,
    );

    // Un PDF mixto o escaneado tendrá un promedio muy bajo. Un libro digital supera los 1000 fácilmente.
    // Si el promedio es mayor a 200, lo damos por nativo.
    if (avgCharsPerPage > 200) {
      console.log(`[PDF Service] PDF nativo detectado. Omitiendo OCR.`);
      return {
        finalPath: `/uploads/${path.basename(inputFilePath)}`,
        status: "NOT_REQUIRED",
      };
    }

    console.log(
      `[PDF Service] PDF escaneado (o mixto) detectado. Iniciando pipeline OCR...`,
    );
    const finalPdfUrl = await processPdfWithOCR(inputFilePath, originalName);

    return {
      finalPath: finalPdfUrl,
      status: "COMPLETED",
    };
  } catch (error) {
    console.error(
      "[PDF Service] Error crítico en el pipeline del documento:",
      error,
    );
    throw error;
  }
}

module.exports = {
  processPdfWithOCR,
  analyzeAndProcessPdf,
};
