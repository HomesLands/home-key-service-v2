import * as multer from "multer";
import * as AWS from "aws-sdk";
import * as path from "path";
import * as q from "q";
import * as fs from "fs";

// Accepted upload image type
const acceptedImageType =
  "image/jpg, image/jpeg, image/jps, image/png, image/gif";

export default class ImageService {
  private uploadInstance: any;
  private uploadDestination: string;
  private s3Configs: any;
  private localConfigs: any;
  private s3Instance: any;
  private multerInstance: any;

  constructor(type: string, isMultiple?: boolean) {
    const { s3, local } = global.configs.uploadImage;

    this.uploadDestination = type === "any" ? "local" : type;
    this.s3Configs = s3;
    this.localConfigs = local;

    // File filter, only accept specific image files
    const fileFilter = (req, file, cb) => {
      if (acceptedImageType.indexOf(file.mimetype) === -1) {
        cb(new Error("Accept only file types: " + acceptedImageType));
      } else {
        cb(null, true);
      }
    };

    // Init upload instance
    switch (type) {
      case "any": {
        this.multerInstance = multer({
          fileFilter: fileFilter,
          limits: {
            fileSize: this.s3Configs.imageUploadSizeLimit * (10 * 1024 * 1024), // [Limit size] x 1MB (1*1024*1024)
          },
        });
        this.uploadInstance = this.multerInstance.any();
        break;
      }

      case "local": {
        this.multerInstance = multer({
          fileFilter,
          limits: {
            fileSize: this.s3Configs.imageUploadSizeLimit * (10 * 1024 * 1024), // [Limit size] x 10MB (10*1024*1024)
          },
        });

        this.uploadInstance = isMultiple
          ? this.multerInstance.array("file", 10)
          : this.multerInstance.single("file");
        break;
      }

      case "s3": {
        this.s3Instance = new AWS.S3({
          secretAccessKey: this.s3Configs.secretAccessKey,
          accessKeyId: this.s3Configs.accessKeyId,
          region: this.s3Configs.region,
        });

        // Init upload instance
        this.uploadInstance = multer({
          fileFilter,
          limits: {
            fileSize: this.s3Configs.imageUploadSizeLimit * (1024 * 1024), // [Limit size] x 1MB (1*1024*1024)
          },
        }).single("file");
        break;
      }
    }
  }

  // Process form data from request
  public async processFormData(req: any, res: any): Promise<any> {
    let defer = q.defer();

    // Start to upload images
    this.uploadInstance(req, res, (err) => {
      if (err) {
        // Error
        defer.resolve({
          error: true,
          message: err.message,
        });
      } else {
        defer.resolve();
      }
    });
    return defer.promise;
  }

  // Upload multiple file
  public async uploads(files: any): Promise<any> {
    let resData = [];
    for (let i = 0; i < files.length; i++) {
      const image = await this.upload(files[i]);
      resData.push(image);
    }
    return resData;
  }

  // Upload file
  public async upload(file: any): Promise<any> {
    let defer = q.defer();


    const fileName = `${path.basename(file.name).split(".")[0]
      }-${new Date().getTime()}${path.extname(file.name)}`;

    const writeFilePath = `${this.localConfigs.localStoragePath}/${fileName}`;
    const saveFileUrl = `${global.env.protocol}://${global.env.basePath}images/${fileName}`;
    console.log({writeFilePath})
    console.log({saveFileUrl})


    const { image: imageModel } = global.mongoModel;

    // Local Upload
    if (this.uploadDestination === "local") {
      // Create image data
      const imageData = await imageModel.create({
        type: this.uploadDestination,
        fileName,
        path: `images/${fileName}`,
      });

      await fs.writeFile(writeFilePath, file.data, (err) => {
        if (err) {
          defer.resolve({
            error: true,
            message: err.message,
          });
        } else {
          defer.resolve({
            error: false,
            imageUrl: saveFileUrl,
            imageId: imageData._id,
          });
        }
      });
    }

    // S3 Upload
    if (this.uploadDestination === "s3") {
      // Create image data
      const imageData = await imageModel.create({
        type: this.uploadDestination,
        fileName,
        path: `images/${fileName}`,
      });

      const params = {
        Bucket: this.s3Configs.bucket,
        Key: `Avatar/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { fieldname: file.fieldname },
        ACL: "private",
      };

      await this.s3Instance.upload(params, (err, data) => {
        if (err) {
          defer.resolve({
            error: true,
            message: err.message,
          });
        } else {
          defer.resolve({
            error: false,
            imageUrl: data.Location,
            imageId: imageData._id,
          });
        }
      });
    }
    return defer.promise;
  }

  async remove(filePath: string): Promise<any> {
    let defer = q.defer();

    // fs.unlink(filePath, (err) => {
    //   if (err) {
    //     defer.resolve({
    //       error: true,
    //       message: err.message,
    //     });
    //   } else {
    //     defer.resolve({
    //       error: false,
    //       message: 'File removed successfully',
    //     });
    //   }
    // });
    const absoluteFilePath = `${global.env.protocol}://${global.env.basePath}${filePath}`;
    const absoluteFilePath2 =`C:\\Workspace\\HomeLand\\HomeLand_2024_v3\\home-key-service-v2\\public\\${filePath}`;
    const absoluteFilePath3 =``;
    const relativeFilePath = `/${filePath}`;
    console.log({absoluteFilePath2});
    console.log({absoluteFilePath});
    console.log({relativeFilePath});
    console.log("dấda", __dirname)

    fs.unlink(absoluteFilePath2, (err) => {
      if (err) {
        console.log("lỗi xóa img", err)
        defer.resolve({
          error: true,
          message: err.message,
        });
      } else {
        console.log("đã xóa img")
        defer.resolve({
          error: false,
          message: 'File removed successfully',
        });
      }
    });
    // try {
    //   fs.unlinkSync(absoluteFilePath);
    //   console.log('File is deleted.');
    // } catch (err) {
    //   console.error(err);
    // }

    return defer.promise;
  }
}
