import { Request, Response } from "express";
import { forEach } from "lodash";
import { Types } from "mongoose";
import File from "../../../models/File";

import Mimes from "../../../config/FileMimes";
import Tracking from "../../../events/Tracking";

import FileService from "../../../services/FileService";
import logger from "../../../services/LoggerService";
import Queue from "../../../services/Queue";
import ResponseService from "../../../services/ResponseService";
import S3Service from "../../../services/S3Service";

const S = "[UploadController]";

export default class UploadController {
    public static async anyFilesS3(req: Request, res: Response) {
        const M = `${S}[anyFiles][${req.request_id || ""}]`;
        let { user, } = req;
        const { files, company }: any = req;
        Tracking.log({
            data: { files },
            type: "upload.anyFilesS3",
            message: "Uploading filesS3",
            user: user ? user._id : null,
            company: company ? company._id : null,
        });
        if (!files || files.length === 0) {
            logger.error(M, `At least one file mut be uploaded, user_id=${user._id}`);
            return ResponseService.validationError(res, [
                { path: "files", message: "At least one file must be uploaded." },
            ]);
        }
        user = user && user._id ? user._id : null;

        for (const file of files) {
            file.company = company._id;
            file._id = Types.ObjectId();
            file.type = Mimes.types[file.mimetype] || undefined;
            file.addedBy = user;
            file.contentType = file.mimetype;
            file.name = file.originalname;
            file.filename = file.originalname;
        }
        File.insertMany(files, { ordered: false, rawResult: true }, (error, result) => {
            if (error && error.code === 11000 && error.writeErrors) {
                const errors = [];
                for (const e of error.writeErrors) {
                    errors.push({
                        param: e.err.op.name,
                        message: `File with same name already exists`
                    });
                }
                return ResponseService.validationError(res, errors);
            } else if (error) {
                return ResponseService.serverError(req, res, error);
            }
            return ResponseService.success(res, files, "Files uploaded successfully.");
        });
    }

    public static anyFiles(req: Request, res: Response) {
        const M = `${S}[anyFiles][${req.request_id || ""}]`;
        let { user, } = req;
        const { files, company } = req;
        Tracking.log({
            data: { files },
            type: "upload.anyFiles",
            message: "Uploading files",
            user: user ? user._id : null,
            company: company ? company._id : null,
        });
        if (!files || files.length === 0) {
            logger.error(M, `At least one file mut be uploaded, user_id=${user._id}`);
            return ResponseService.validationError(res, [
                { path: "files", message: "At least one file must be uploaded." },
            ]);
        }
        const mappedFiles = [];
        user = user && user._id ? user._id : null;

        forEach(files, (file: any) => {
            file._id = Types.ObjectId();
            file.type = Mimes.types[file.mimetype] || undefined;
            file.addedBy = user;
            mappedFiles.push(file);
        });

        Tracking.log({
            data: files,
            type: "files.queue",
            message: "Adding files to queue",
            user: user ? user._id : null,
            company: company ? company._id : null,
        });

        Queue
            .create("fileUpload", files)
            .priority("high")
            .attempts(5)
            .removeOnComplete(true)
            .save((error) => {
                if (error) {
                    logger.error(M, `Failed to add to queue`, error);
                    return ResponseService.serverError(req, res, error);
                }
                logger.debug(M, `Files added to queue for upload:`, mappedFiles);
                return ResponseService.success(res, mappedFiles, "Files uploaded successfully.");
            });
    }

    public static async base64(req: Request, res: Response) {
        try {
            const M = `${S}[base64][${req.request_id || ""}]`;
            const { file, name } = req.body;
            const { user, company } = req;
            Tracking.log({
                data: { name },
                type: "upload.base64",
                message: "Uploading a file",
                user: user ? user._id : null,
                company: company ? company._id : null,
            });

            if (!file) {
                logger.error(M, `File not found user_id=${user._id}`);
                return ResponseService.validationError(res, [
                    { path: "file", message: "The file is required." },
                ]);
            }

            // Process the file and get buffer and content type
            const fileData = FileService.process(file);
            // Key (Always needs to be unique - else old one will be replaced) | Name of file
            const key = new Date().getTime().toString() + `.${fileData.extension}`;

            // Upload the file to S3
            await S3Service.uploadBase64(fileData, name || key, key);

            // Save the file in DB
            const fileModel = {
                company: company._id,
                addedBy: user._id,
                contentType: fileData.contentType,
                name: name || key,
                key,
                bucket: process.env.S3_BUCKET || "popprobe-saas",
            };

            const uploadedFile = await File.create(fileModel);
            const data = await FileService.map(uploadedFile);
            return ResponseService.success(res, data, "File uploaded successfully");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
