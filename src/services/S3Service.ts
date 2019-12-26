import * as AWS from "aws-sdk";
import * as fs from "fs";
import multer = require("multer");
import * as multerS3 from "multer-s3";

const { S3_KEY, S3_SECRET, S3_REGION } = process.env;
if (!S3_KEY) { throw new Error(`S3_KEY is not defined in .env`); }
if (!S3_SECRET) { throw new Error(`S3_SECRET is not defined in .env`); }
if (!S3_REGION) { throw new Error(`S3_REGION is not defined in .env`); }

AWS.config.update({
    accessKeyId: S3_KEY,
    secretAccessKey: S3_SECRET,
    region: S3_REGION,
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.S3_BUCKET || "popprobe-saas";

export default class S3Service {

    public static upload() {
        const storage = multerS3({
            s3,
            bucket: S3_BUCKET,
            key: (req, file, cb) => {
                cb(null, S3Service.fileKey(file));
            },
            acl: "public-read",
        });
        return multer({ storage });
    }

    public static fileKey({ originalname }) {
        // Remove the extension from the name and save it;
        // Get the name, replaces chars and then prepare the key
        const names = originalname.split(".");
        const ext = names.pop();
        const name = names.join(".").replace(/[^a-zA-Z0-9]/g, "").split(" ").join("_");
        return `${name}-${Date.now()}.${ext}`;
    }

    public static uploadFile(fileObject) {
        const data = {
            Key: fileObject.key || S3Service.fileKey(fileObject),
            Bucket: S3_BUCKET,
            Body: fs.readFileSync(fileObject.path),
            Metadata: { name: fileObject.filename },
        };
        return S3Service.put(data);
    }

    public static uploadBase64({ fileBuffer, contentType }, fileName, Key) {
        const data = {
            Key,
            Bucket: S3_BUCKET,
            Body: fileBuffer,
            ContentEncoding: "base64",
            ContentType: contentType,
            Metadata: { name: fileName },
        };
        return S3Service.put(data);
    }

    public static put(data) {
        return new Promise((resolve, reject) => {
            // tslint:disable-next-line:only-arrow-functions
            s3.putObject(data, function(err, result) {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    }

    public static getUrl(Key, Bucket = null) {
        const params = {
            Bucket: Bucket || S3_BUCKET,
            Key,
            Expires: 90000,
        };
        return s3.getSignedUrl("getObject", params);
    }
}
