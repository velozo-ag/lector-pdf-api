require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const documentRoutes = require("./routes/documentRoutes");
const noteRoutes = require("./routes/noteRoutes");
const authRoutes = require("./routes/authRoutes");
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
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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

app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/notes", authMiddleware, noteRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Servidor seguro y funcionando correctamente",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
