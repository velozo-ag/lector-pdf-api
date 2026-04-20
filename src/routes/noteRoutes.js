const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");

router.get("/:id", noteController.getNoteById);
router.put("/:id", noteController.updateNote);

module.exports = router;
