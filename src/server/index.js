// src/server/index.js
import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs/promises";

const app = express();
const PORT = 5300;

app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.post("/upload", upload.array("images", 50), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files uploaded" });

    const ocrPromises = files.map(async (file) => {
      try {
        const result = await Tesseract.recognize(file.path, "eng");
        await fs.unlink(file.path);
        return result.data.text;
      } catch (err) {
        console.error(`OCR failed for ${file.filename}:`, err);
        await fs.unlink(file.path);
        return "";
      }
    });

    const results = await Promise.all(ocrPromises);
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