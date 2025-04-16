// src/server/index.js
import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs/promises";
import fsSync from "fs";

const app = express();
const PORT = 5300;

// Ensure the uploads folder exists
const UPLOAD_DIR = "uploads";
if (!fsSync.existsSync(UPLOAD_DIR)) {
  fsSync.mkdirSync(UPLOAD_DIR);
}

app.use(
  cors({
    origin: "contact-extractor-cckmgagqi-abhay-pals-projects-1bdaeb02.vercel.app",
    methods: ["POST"],
  })
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.post("/upload", upload.array("images", 50), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log("Processing files:", files.map(f => f.originalname));

    const results = [];

    for (const file of files) {
      try {
        const result = await Tesseract.recognize(file.path, "eng");
        await fs.unlink(file.path);
        results.push(result.data.text);
      } catch (err) {
        console.error(`OCR failed for ${file.filename}:`, err);
        await fs.unlink(file.path);
        results.push("");
      }
    }

    const allText = results
      .flatMap((text) => text.split("\n").map((line) => line.trim()))
      .filter(Boolean);

    const pairs = allText.map((item) => {
      const numberMatch = item.match(
        /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}/g
      );
      const number = numberMatch ? numberMatch.join(" ") : "";
      const name = item.replace(number, "").trim();
      return { name, number };
    });

    res.json(pairs.filter((pair) => pair.name || pair.number));
  } catch (err) {
    console.error("OCR Error:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});