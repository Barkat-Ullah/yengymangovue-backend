/* eslint-disable no-console */
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import config from '../../config';

const accessKey = config.do_space.access_key;
const bucket = config.do_space.bucket;
const endpoints = config.do_space.endpoints;
const secretKey = config.do_space.secret_key;
interface UploadResponse {
  Location: string;
}

const s3Client = new S3Client({
  region: 'us-east-1', // Set any valid region
  endpoint: `${endpoints}`,
  credentials: {
    accessKeyId: `${accessKey}`,
    secretAccessKey: `${secretKey}`,
  },
});

export const uploadToDigitalOceanAWS = async (
  file: Express.Multer.File,
): Promise<UploadResponse> => {
  try {
    // Ensure the file exists before uploading
    // await fs.promises.access(file.path, fs.constants.F_OK);

    // const fileStream: Readable = fs.createReadStream(file.path);

    // Prepare the upload command
    const command = new PutObjectCommand({
      Bucket: `${bucket}`,
      Key: `${file.originalname}`,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    });

    // Execute the upload
    await s3Client.send(command);

    // Construct the direct URL to the uploaded file
    const Location = `${endpoints}/${bucket}/${file.originalname}`;

    return { Location };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error uploading file`, error);
    throw error;
  }
};

export const deleteFromDigitalOceanAWS = async (
  fileUrl: string,
): Promise<void> => {
  try {
    // Extract the file key from the URL
    const key = fileUrl.replace(
      `${process.env.DO_SPACE_ENDPOINT}/${bucket}/`,
      '',
    );

    // Prepare the delete command
    const command = new DeleteObjectCommand({
      Bucket: `${bucket}`,
      Key: key,
    });

    // Execute the delete command
    await s3Client.send(command);

    console.log(`Successfully deleted file: ${fileUrl}`);
  } catch (error: any) {
    console.error(`Error deleting file: ${fileUrl}`, error);
    throw new Error(`Failed to delete file: ${error?.message}`);
  }
};

export const uploadMultipleToDigitalOceanAWS = async (
  files: Express.Multer.File[],
): Promise<{ name: string; url: string }[]> => {
  const uploaded = await Promise.all(
    files.map(async file => {
      const { Location } = await uploadToDigitalOceanAWS(file);
      return { name: file.originalname, url: Location };
    }),
  );
  return uploaded;
};

export const deleteMultipleFromDigitalOceanAWS = async (
  urls: string[],
): Promise<void> => {
  await Promise.all(urls.map(url => deleteFromDigitalOceanAWS(url)));
};
