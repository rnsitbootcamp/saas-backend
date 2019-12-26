import { Application } from "express";

import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";
import UserController from "./UserController";
import * as UserValidator from "./UserValidator";

export default class UserRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /users/index Index
         * @apiName UserList
         * @apiGroup Users
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "q": String, // the general search term
         *    "_id": String,
         *    "name": String,
         *    "email": String,
         *    "contact": String,
         *    "city": String,
         *    "country": String,
         *    "street": String,
         *    "preferredCompany": String,
         *    "verified": Boolean,
         *    "approved": Boolean,
         *    "page": Number, // 1
         *    "per_page": Number, // 20
         *    "sort_order": -1 or 1, // desc or asc,
         *    "sort_by": String, // name
         *    "include_deleted": Boolean,
         *    "userType": String
         * }
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {Object} data  Paginate and Users.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *          "users": [
         *              "_id": String,
         *              "approved": Boolean,
         *              "verified": Boolean,
         *              "loginAt": Date,
         *              "deleted": Boolean,
         *              "name": String,
         *              "email": String,
         *              "street": String,
         *              "country": String,
         *              "preferredCompany": {
         *                "_id": String,
         *                "name": String,
         *              },
         *              "createdAt": Date,
         *              "updatedAt": Date,
         *              "avatar": String|null
         *            }
         *          ],
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
        app.post(
            "/users/index",
            AuthService.isAuthenticated(),
            UserValidator.companyRequired,
            ResponseService.checkValidationErrors,
            PaginateMiddleware,
            UserController.index);

        /**
         * @api {post} /users Create
         * @apiName UserCreate
         * @apiGroup Users
         *
         * @apiParam {String} name Name of the user.
         * @apiParam {String} email Email of the user.
         * @apiParam {String="viewers", "admins", "auditors"} userType Role of the user for the company.
         * @apiParam {Boolean} notifyUser If to notify the user via email?
         * @apiParam {String} zip_code Zip_code
         * @apiParam {String} country Country of the user
         * @apiParam {String} street Address
         * @apiParam {String} contact Contact
         * @apiParam {String} avatar Avatar
         * @apiParamExample {json} Request-Example:
         *        {
         *          "name": String,
         *          "email": String,
         *        }
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number,
         *        "data": Object,
         *        "message": String
         *      }
         *
         */
        app.post(
            "/users",
            AuthService.isAuthenticated(),
            UserValidator.companyRequired,
            ResponseService.checkValidationErrors,
            UserValidator.create,
            ResponseService.checkValidationErrors,
            AuthService.isAdminOfCompany,
            UserController.create,
        );

        /**
         * @api {get} /users/:id Show
         * @apiName UserShow
         * @apiGroup Users
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {Object} data  User data.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *           "_id": String,
         *           "approved": Boolean,
         *           "verified": Boolean,
         *           "loginAt": Date,
         *           "deleted": Boolean,
         *           "name": String,
         *           "email": String,
         *           "street": String,
         *           "country": String,
         *           "preferredCompany": {
         *              "_id": String,
         *              "name": String,
         *           },
         *           "createdAt": Date,
         *           "updatedAt": Date,
         *           "avatar": String|null
         *        }
         *    }
         *
         */
        app.get(
            "/users/:id",
            AuthService.isAuthenticated(),
            UserValidator.companyRequired,
            ResponseService.checkValidationErrors,
            UserValidator.checkUserExistsInCompany,
            ResponseService.checkValidationErrors,
            UserController.show,
        );

        /**
         * @api {put} /users/:id Update
         * @apiName UserUpdate
         * @apiGroup Users
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {String} message The response message.
         * @apiSuccess {Object} data  User data.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "message": String,
         *        "data": null | {
         *           "_id": String,
         *           "approved": Boolean,
         *           "verified": Boolean,
         *           "loginAt": Date,
         *           "deleted": Boolean,
         *           "name": String,
         *           "email": String,
         *           "street": String,
         *           "country": String,
         *           "preferredCompany": {
         *              "_id": String,
         *              "name": String,
         *           },
         *           "createdAt": Date,
         *           "updatedAt": Date,
         *           "avatar": String|null
         *        }
         *    }
         *
         */
        app.put("/users/:id",
            AuthService.isAuthenticated(),
            UserValidator.companyRequired,
            ResponseService.checkValidationErrors,
            AuthService.isAdminOfCompany,
            UserValidator.checkUserExistsInCompany,
            ResponseService.checkValidationErrors,
            UserController.update,
        );

        /**
         * @api {delete} /users/:id Delete
         * @apiName UserDelete
         * @apiGroup Users
         *
         * @apiSuccess {Boolean} error If expected error occurred.
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
            "/users/:id",
            AuthService.isAuthenticated(),
            UserValidator.companyRequired,
            ResponseService.checkValidationErrors,
            AuthService.isAdminOfCompany,
            UserValidator.checkUserExistsInCompany,
            ResponseService.checkValidationErrors,
            UserController.destroy,
        );
    }
}
