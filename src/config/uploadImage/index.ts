export interface IUploadImage {
  local: {
    localStoragePath: string;
    imageUploadSizeLimit: number;
  };
  s3: {
    bucket: string;
    secretAccessKey: string;
    accessKeyId: string;
    region: string;
    imageUploadSizeLimit: number;
  };
}

export default (): IUploadImage => {
  return {
    local: {
      localStoragePath: process.env.LOCAL_IMAGE_SAVE_PATH,
      imageUploadSizeLimit: parseInt(process.env.LOCAL_IMAGE_UPLOAD_SIZE_LIMIT),
    },
    s3: {
      bucket: process.env.S3_BUCKET,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      region: process.env.S3_REGION,
      imageUploadSizeLimit: parseInt(process.env.S3_IMAGE_UPLOAD_SIZE_LIMIT),
    },
  };
};
