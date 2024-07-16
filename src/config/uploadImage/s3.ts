const s3Configs = {
    bucket: process.env.S3_BUCKET,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    region: process.env.S3_REGION,
    imageUploadSizeLimit: parseInt(process.env.S3_IMAGE_UPLOAD_SIZE_LIMIT)
};

export default s3Configs;