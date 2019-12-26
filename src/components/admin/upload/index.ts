import { Application } from "express";
import multer = require("multer");

import AuthService from "../../../services/AuthService";
import ResponseService from "../../../services/ResponseService";
import S3Service from "../../../services/S3Service";
import UploadController from "./UploadController";

export default class UploadRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /uploads/any Upload Files (Any files)
         * @apiName UploadFiles
         * @apiGroup Uploads
         * @apiDescription This api does not return back the list
         * of files uploaded. It adds files to the Redis queue for processing and uploading to S3.
         *
         * @apiParam {files} files Files array.
         * @apiParamExample {form-data} Request-Example:
         *    {
         *      "files": [ ],
         *    }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {String} message Message.
         *
         * @apiSuccessExample Success:
         *    HTTP/1.1 200 Success
         *    {
         *      "error": false,
         *      "message": "Files uploaded successfully.",
         *    }
         *
         * @apiError UnauthorizedError Authorization error on server.
         * @apiErrorExample UnauthorizedError:
         *     HTTP/1.1 401 UnauthorizedError
         *     "Unauthorized"
         *
         * @apiError ServerError Unexpected error on server.
         * @apiErrorExample ServerError:
         *     HTTP/1.1 500 ServerError
         *     "An error occurred"
         */
        app.post(
            "/uploads/any",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            UploadRoutes.multerStorage(),
            UploadController.anyFilesS3,
        );

        /**
         * @api {post} /uploads/base64 Upload File (Base64 format)
         * @apiName UploadBase64
         * @apiGroup Uploads
         *
         * @apiParam {String} file Base64 file string.
         * @apiParam {String} name File name.
         * @apiParamExample {form-data} Request-Example:
         *    {
         *      "file": String,
         *      "name": String,
         *    }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {String} message Message.
         *
         * @apiSuccessExample Success:
         *    HTTP/1.1 200 Success
         *    {
         *      "error": false,
         *      "message": "File uploaded successfully.",
         *      "data": {
         *        id: string;
         *        name: string;
         *        contentType: string;
         *        url: string;
         *      }
         *    }
         *
         * @apiError UnauthorizedError Authorization error on server.
         * @apiErrorExample UnauthorizedError:
         *     HTTP/1.1 401 UnauthorizedError
         *     "Unauthorized"
         *
         * @apiError ServerError Unexpected error on server.
         * @apiErrorExample ServerError:
         *     HTTP/1.1 500 ServerError
         *     "An error occurred"
         */
        app.post(
            "/uploads/base64",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            UploadController.base64);
    }

    private static multerStorage() {
        // const storage = multer.diskStorage({
        //     destination(req, file, cb) {
        //         cb(null, "./uploads");
        //     },
        //     filename(req, file, cb) {
        //         cb(null, file.originalname);
        //     },
        // });
        // return multer({ storage }).array("files");
        return S3Service.upload().array("files");
    }
}
