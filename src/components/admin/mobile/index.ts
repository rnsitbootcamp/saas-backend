import { Application } from "express";
import AuthService from "../../../services/AuthService";
import MobileController from "./MobileController";

export default class MobileRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /mobile/offline Store all offline data
         * @apiName OfflineData
         * @apiGroup Mobile
         *
         * @apiParam {Array} stores The list of added stores (store data including temp_id and company_id).
         * @apiParam {Array} surveys The list of created surveys
         * (survey data including temp_store_id, store_id and company_id).
         *
         * @apiParamExample {json} Request-Example:
         *    {
         *      "stores": [ { "company_id": "5a8e8badceed80364fe88601",
         *                    "name": "THe best store", "temp_id": "1234321275908" } ],
         *      "surveys": [ { "company_id": "5a8e8badceed80364fe88601",
         *                     "gps": {}, "data": {}, "temp_store_id": "1234321275908" } ],
         *    }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {String} message Message.
         *
         * @apiSuccessExample Success:
         *    HTTP/1.1 200 Success
         *    {
         *      "error": false,
         *      "message": "Data added.",
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
        app.post("/mobile/offline", AuthService.isAuthenticated(), MobileController.data);
    }
}
