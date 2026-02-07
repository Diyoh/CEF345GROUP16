import multer from 'multer';
import { storage } from '../config/cloudinary.js';

// File Filter (Images Only)
const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    // Check mime type and extension
    // mimetypes can be tricky, so rely on extension mostly or ensure valid mime types
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.toLowerCase());

    if (mimetype || extname) {
        return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 20 }, // 50MB limit
    fileFilter: fileFilter
});
