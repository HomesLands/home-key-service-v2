const localConfigs = {
    localStoragePath: process.env.LOCAL_IMAGE_SAVE_PATH,
    imageUploadSizeLimit: parseInt(process.env.LOCAL_IMAGE_UPLOAD_SIZE_LIMIT)
};

export default localConfigs