require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const cookieParser = require("cookie-parser");

const documentRoutes = require("./routes/documentRoutes");
const noteRoutes = require("./routes/noteRoutes");
const authRoutes = require("./routes/authRoutes");
const folderRoutes = require("./routes/folderRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const { apiLimiter } = require("./middleware/rateLimiters");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// --- CORS ---
const allowedOrigins = [
  "http://localhost:5173",
  "https://lector-pdf.roosty.site",
  "https://www.lector-pdf.roosty.site",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite sin origen, orígenes exactos permitidos, o IPs de red local (192.168.* o 10.*)
    if (
      !origin || 
      allowedOrigins.indexOf(origin) !== -1 || 
      /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Acceso bloqueado por política CORS del servidor."));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiLimiter);

// Endpoint autenticado para servir PDFs — requiere JWT válido
app.get("/uploads/:filename", authMiddleware, (req, res) => {
  const filename = path.basename(req.params.filename); // evita path traversal
  const filePath = path.join(__dirname, "../uploads", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "Archivo no encontrado." });
    }
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/notes", authMiddleware, noteRoutes);
app.use("/api/folders", authMiddleware, folderRoutes);
app.use("/api/calendar", authMiddleware, calendarRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Servidor seguro y funcionando correctamente",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
