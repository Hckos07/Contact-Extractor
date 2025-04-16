import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

const app = express();
const PORT = 5300;
const UPLOAD_DIR = "uploads";

// Ensure uploads directory exists
if (!fsSync.existsSync(UPLOAD_DIR)) {
  fsSync.mkdirSync(UPLOAD_DIR);
}

app.use(
  cors({
    origin: "https://contact-extractor-cckmgagqi-abhay-pals-projects-1bdaeb02.vercel.app", // ✅ Use full URL with protocol
    methods: ["POST"],
  })
);

// Multer storage config
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

    console.log("📥 Received files:", files.map((f) => f.originalname));

    const results = [];

    for (const file of files) {
      try {
        const result = await Tesseract.recognize(file.path, "eng", {
          logger: (m) => console.log(`🛠️ [${file.originalname}]`, m.status, m.progress),
        });

        const text = result.data.text.trim();
        console.log(`🔍 OCR result for ${file.originalname}:\n${text}\n---`);

        results.push(text);
      } catch (err) {
        console.error(`❌ OCR failed for ${file.filename}:`, err);
        results.push("");
      } finally {
        // Clean up image
        await fs.unlink(file.path);
      }
    }

    // Split all extracted text into lines
    const allTextLines = results
      .flatMap((text) => text.split("\n").map((line) => line.trim()))
      .filter(Boolean);

    // Extract name & number pairs
    const pairs = allTextLines.map((line) => {
      const numberMatch = line.match(/\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g); // ✅ Indian number format
      const number = numberMatch ? numberMatch.join(" ") : "";
      const name = number ? line.replace(number, "").trim() : line;
      return { name, number };
    });

    // Filter out empty results
    const filtered = pairs.filter((pair) => pair.name || pair.number);
    console.log("✅ Final extracted pairs:", filtered);

    res.json(filtered);
  } catch (err) {
    console.error("❌ Server error during processing:", err);
    res.status(500).json({ error: "Failed to process images" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});