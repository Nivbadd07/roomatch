import express from 'express';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const storage = new Storage(); // No need to specify credentials on Cloud Run
const bucket = storage.bucket('roomatch-prod-static-site');

// Enable CORS for all origins (you can restrict to your domain later)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the html directory
app.use(express.static(path.join(__dirname, 'html')));

// Handle image uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Upload endpoint
app.post('/api/upload-to-gcp', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    const blob = bucket.file(req.body.filename);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: { contentType: req.file.mimetype }
    });

    blobStream.on('error', err => {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    });

    blobStream.on('finish', async () => {
      try {
        await blob.makePublic(); // Optional: depends on your use case
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${req.body.filename}`;
        res.status(200).json({ publicUrl });
      } catch (err) {
        console.error('Make public error:', err);
        res.status(500).json({ error: 'Upload succeeded but making public failed' });
      }
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error('General server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start the server (Cloud Run will use this)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Roomatch backend running on port ${PORT}`);
});
