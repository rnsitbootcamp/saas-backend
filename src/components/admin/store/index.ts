import { Application } from "express";
import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";
import StoreController from "./StoreController";
import * as StoreValidator from "./StoreValidator";
export default class StoreRoutes {
    public static init(app: Application) {

        /**
         * @api {post} /stores/index Index
         * @apiName StoreList
         * @apiGroup Store
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "q": String, // the general search term, name, address, email,
         *                //disapproval_reason, region, sub region, channel, sub_channel names etc.
         *    "_id": String, // expecting mongo id.
         *    "addedBy": String, // expecting mongo id.
         *    "lastUpdatedBy": String, // expecting mongo id.
         *    "approved": Boolean, // To get only approved stores or disapproved stores.
         *    "channel": Number, // id of item
         *    "sub_channel": Number, // id of item
         *    "region": Number, // id of item
         *    "sub_region": Number, // id of item
         *    "include_deleted": Boolean
         *    "page": Number, // 1
         *    "per_page": Number, // 20
         *    "sort_order": -1 or 1, // desc or asc,
         *    "sort_by": String, // name
         * }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Paginate and Stores object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *          "stores": [],
         *          "paginate": {
         *            "total_item": 25,
         *            "showing": 20,
         *            "first_page": 1,
         *            "previous_page": 1,
         *            "current_page": 1,
         *            "next_page": 2,
         *            "last_page": 2
         *          }
         *        }
         *    }
         *
         */
        app.post("/stores/index", AuthService.isAuthenticated(), PaginateMiddleware, StoreController.index);

        /**
         * @api {post} /stores Create
         * @apiName StoreCreate
         * @apiGroup Store
         * @apiParam {Array} questions Questions of the store.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": {}
         *      }
         *
         */
        app.post("/stores",
            AuthService.isAuthenticated(),
            StoreValidator.create,
            ResponseService.checkValidationErrors,
            StoreController.store
        );

        /**
         * @api {get} /stores/:id show
         * @apiName StoreShow
         * @apiGroup Store
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Store object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *        }
         *    }
         *
         */
        app.get("/stores/:id", AuthService.isAuthenticated(), StoreController.show);

        /**
         * @api {put} /stores/:id Update
         * @apiName StoreUpdate
         * @apiGroup Store
         * @apiParam {Array} questions Questions of the store.
         * @apiParam {Boolean} approved Store is approved or not.
         * @apiParam {String} disapproval_reason Reason for disapproval
         * @apiParam {Array} authorizedUsers Authorized users for the stores.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": {}
         *      }
         *
         */
        app.put(
            "/stores/:id",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            StoreValidator.update,
            ResponseService.checkValidationErrors,
            StoreController.update);

        /**
         * @api {delete} /stores/:id Delete
         * @apiName StoreDelete
         * @apiGroup Store
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number,
         *        "message": String,
         *      }
         */
        app.delete(
            "/stores/:id",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            StoreController.destroy,
        );
    }
}
