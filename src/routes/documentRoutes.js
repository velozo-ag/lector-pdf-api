const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const upload = require("../config/multer");
const { uploadLimiter } = require("../middleware/rateLimiters");

router.post(
  "/",
  uploadLimiter,
  (req, res, next) => {
    upload.single("pdfFile")(req, res, function (err) {
      if (err) {
        return res
          .status(400)
          .json({ error: "Error al subir el archivo: " + err.message });
      }
      next();
    });
  },
  documentController.uploadDocument,
);

router.get("/", documentController.getAllDocuments);
router.delete("/:id", documentController.deleteDocument);

router.patch("/:id/favorite", documentController.toggleFavorite);
router.patch("/:id/move", documentController.moveToFolder);

module.exports = router;
