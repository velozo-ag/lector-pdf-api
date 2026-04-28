const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folderController");

router.post("/", folderController.createFolder);
router.get("/", folderController.getFolders);
router.put("/:id", folderController.updateFolder);
router.delete("/:id", folderController.deleteFolder);

module.exports = router;
