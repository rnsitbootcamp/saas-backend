import { isNull, isUndefined } from "util";
import S3Service from "./S3Service";

export default class FileService {
    public static process(file: string) {
        // The content type of file
        const contentType = file.split(";")[0].split(":")[1];
        if (!contentType) { throw new Error("Invalid file."); }

        // Create the buffer from file by removing the base64 part
        const fileBuffer = Buffer.from(file.split("base64,")[1], "base64");

        // Extension of the file
        const extensions = file
            .split("/")[1]
            .split(";")[0]
            .split(".");

        return {
            contentType,
            fileBuffer,
            extension: extensions[extensions.length - 1],
        };
    }

    public static map(file) {
        const response = { id: null, name: null, contentType: null, url: null };

        if (isNull(file) || isUndefined(file)) {
            return response;
        }

        const bucket = file.bucket || process.env.S3_BUCKET || "popprobe-saas";
        response.id = file._id;
        response.name = file.name;
        response.contentType = file.contentType;
        response.url = file.key ? S3Service.getUrl(file.key, bucket) : null;
        return response;
    }
}
