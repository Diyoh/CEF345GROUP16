import multer from 'multer';
import path from 'path';
import { storage } from '../config/cloudinary.js';

// File Filter (Images Only)
const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;

    // BOTH must match. Using OR meant a file only had to satisfy one check, so
    // "payload.exe" with a spoofed image/png mime type — or any file simply renamed
    // to .png — got through.
    const hasImageMime = filetypes.test(file.mimetype);
    const hasImageExtension = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (hasImageMime && hasImageExtension) {
        return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 20 }, // 20MB per file (comment previously said 50MB)
    fileFilter: fileFilter
});
