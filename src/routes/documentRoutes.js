// Archivo: src/routes/documentRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../config/multer");
const documentController = require("../controllers/documentController");
const noteController = require("../controllers/noteController");

router.get("/", documentController.getAllDocuments);

router.post(
  "/",
  (req, res, next) => {
    upload.single("pdfFile")(req, res, function (err) {
      if (err) {
        console.error("Error de Multer:", err.message);
        return res
          .status(400)
          .json({ error: "Error al subir el archivo: " + err.message });
      }
      next();
    });
  },
  documentController.uploadDocument,
);

router.delete("/:id", documentController.deleteDocument);

router.get("/:id/notes", noteController.getNotesByDocumentId);
router.post("/:id/notes", noteController.createNote);

module.exports = router;
