/* eslint-disable @typescript-eslint/no-explicit-any */
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }
    /**
     * Return a multer parser that accepts images in the given format,
     * stored in the given folder (or the default folder if not provided).
     * The parser will accept files up to the given size in bytes.
     * @param {Object} options
     * @param {string} options.folder cloudinary folder to store the images
     * @param {string} [options.format='webp'] format of the images
     * @param {string[]} [options.allowedFormat=['jpg', 'png', 'jpeg', 'webp']] allowed formats
     * @param {number} [options.fileSize=5 * 1024 * 1024] max file size in bytes
     * @returns {multer.Multer} multer parser
     */
    getParser({
        folder,
        format = 'webp',
        allowedFormat = ['jpg', 'png', 'jpeg', 'webp'],
        fileSize = 5 * 1024 * 1024,
    }: {
        folder?: string;
        format?: string;
        allowedFormat?: string[];
        fileSize?: number;
    }) {
        const folderName = `${process.env.CLOUDINARY_DEFAULT_FOLDER}/${folder}`;

        const storage = new CloudinaryStorage({
            cloudinary,
            params: {
                folder: folderName,
                allowed_format: allowedFormat,
                format,
            },
        } as any);

        const parser = multer({ storage: storage, limits: { fileSize: fileSize } });
        return parser;
    }

    async deleteImage(publicId: string) {
        try {
            const { result } = await cloudinary.uploader.destroy(publicId);
            return result === 'ok';
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    log() {
        console.log(cloudinary.config());
    }
}

export default new CloudinaryService();
