import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    // 100 MB in bytes
    fileSize: 100 * 1024 * 1024,
  },
});

// upload single image
const uploadSingle = upload.single('file');

// upload multiple image
const uploadMultiple = upload.fields([
  { name: 'singleImage', maxCount: 1 },
  { name: 'multipleImage', maxCount: 10 },
]);

export const fileUploader = {
  upload,
  uploadSingle,
  uploadMultiple,
};
