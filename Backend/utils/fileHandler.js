import { v2 as cloudinary } from 'cloudinary';
import { storage } from '../config/cloudinary.js'; // Ensure config is loaded

export const saveBase64Image = async (base64String, subfolder = 'misc') => {
    if (!base64String) return null;

    try {
        // Validation: Verify it's a real Base64 image
        const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
            // It might be an already existing URL (e.g. from an update where image wasn't changed)
            if (base64String.startsWith('http')) {
                return base64String;
            }
            console.error('Invalid base64 string format');
            return null;
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64String, {
            folder: `buildright_uploads/${subfolder}`,
            resource_type: 'image'
        });

        return result.secure_url;

    } catch (error) {
        console.error('Error uploading base64 image to Cloudinary:', error);
        return null;
    }
};
