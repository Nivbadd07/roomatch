const express = require('express');
const multer = require('multer');
const {Storage} = require('@google-cloud/storage');
const cors = require('cors');
const path = require('path');
const app = express();

// Enable CORS
app.use(cors());

// Serve static files from the html directory
app.use(express.static(path.join(__dirname, 'html')));

// Initialize GCP Storage
const storage = new Storage({
    projectId: 'roomatch-prod',
    keyFilename: path.join(__dirname, 'roomatch-prod-be3910f4f08d.json')
});

const bucket = storage.bucket('roomatch-prod-static-site');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Upload endpoint
app.post('/api/upload-to-gcp', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const filename = req.body.filename;
        
        // Create a new blob in the bucket
        const blob = bucket.file(filename);
        
        // Create a write stream
        const blobStream = blob.createWriteStream({
            resumable: false,
            public: true,
            metadata: {
                contentType: file.mimetype
            }
        });

        blobStream.on('error', (err) => {
            console.error('Upload error:', err);
            res.status(500).json({ error: err.message });
        });

        blobStream.on('finish', async () => {
            try {
                // Make the file public
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
                res.json({ publicUrl });
            } catch (error) {
                console.error('Error making file public:', error);
                res.status(500).json({ error: 'Failed to make file public' });
            }
        });

        blobStream.end(file.buffer);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Static files being served from: ${path.join(__dirname, 'html')}`);
}); 