// Archivo: src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const documentRoutes = require("./routes/documentRoutes");
const noteRoutes = require("./routes/noteRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/documents", documentRoutes);
app.use("/api/notes", noteRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor funcionando correctamente" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
