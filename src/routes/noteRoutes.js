const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");

router.get("/", noteController.getNotes); // ?documentId=X o ?folderId=X
router.post("/", noteController.createNote);
router.get("/:id", noteController.getNoteById);
router.put("/:id", noteController.updateNote);
router.delete("/:id", noteController.deleteNote);

router.post("/:id/link", noteController.linkNoteToDocument);
router.delete("/:id/unlink/:documentId", noteController.unlinkNoteFromDocument);

module.exports = router;
