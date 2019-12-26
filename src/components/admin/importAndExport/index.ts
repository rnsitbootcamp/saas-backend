import { Application } from "express";

import AuthService from "../../../services/AuthService";
import ResponseService from "../../../services/ResponseService";

import ImportAndExportController from "./ImportAndExportController";

export default class ImportAndExportRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /company/import Import xlsx
         * @apiName Import
         * @apiGroup Import And Export
         *
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
         *      "message": "imported successfully.",
         *      "data": {}
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
            "/company/import",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            ImportAndExportController.Import
        );


        /**
         * @api {get} /company/export Export company data to xlsx
         * @apiName Emport
         * @apiGroup Import And Export
         *
         * @apiSuccess {String} error If expected error occurred.
         *
         * @apiSuccessExample Success:
         *    HTTP/1.1 200 Success
         *    xlxsx file
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
        app.get(
            "/company/export",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            ImportAndExportController.Export
        );

    }
}
