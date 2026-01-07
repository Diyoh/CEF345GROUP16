import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveBase64Image = (base64String, subfolder = 'misc') => {
    if (!base64String) return null;

    try {
        // [SECURITY FIX] Strict Regex Check
        const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            console.error('Invalid base64 string format');
            return null;
        }

        const ext = matches[1].toLowerCase();
        const data = matches[2];

        // [SECURITY FIX] Whitelist extensions
        if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            console.error('Unsupported file type:', ext);
            return null;
        }

        const buffer = Buffer.from(data, 'base64');

        // [SECURITY FIX] Validate File Size (e.g., Max 5MB per file)
        if (buffer.length > 5 * 1024 * 1024) { 
            console.error('File too large > 5MB');
            return null; 
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const uploadDir = path.join(__dirname, '../public/uploads', subfolder);

        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        return `/uploads/${subfolder}/${fileName}`;

    } catch (error) {
        console.error('Error saving base64 image:', error);
        return null;
    }
};
