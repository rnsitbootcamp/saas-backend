import { Application } from "express";
import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";
import SurveyController from "./SurveyController";
import * as SurveyValidator from "./SurveyValidator";

export default class StoreRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /surveys/index Index
         * @apiName SurveyList
         * @apiGroup Survey
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "q": String // General search term
         *    "user_ids": [mongoId],
         *    "assignment_ids": [mongoId],
         *    "store_ids": [mongoId],
         *    "expires_at": Number,
         *    "date": Number,
         *    "page": Number,
         *    "per_page": Number,
         *    "sort_as": String, (desc, asc),
         *    "sort_by": String, (date)
         * }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Paginate and Surveys object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *          "surveys": [],
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
        app.post("/surveys/index", AuthService.isAuthenticated(), PaginateMiddleware, SurveyController.index);

        /**
         * @api {post} /surveys Create
         * @apiName SurveyCreate
         * @apiGroup Survey
         * @apiParam {Array} questions Questions of the survey.
         * @apiParam {Array} pocs POCs of the survey (if any).
         * @apiParam {Object} device Device details of the survey.
         * @apiParam {Object} gps GPS details.
         * @apiParam {String} assignment_id Assignment ID.
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
        app.post(
            "/surveys",
            AuthService.isAuthenticated(),
            SurveyValidator.create,
            ResponseService.checkValidationErrors,
            SurveyController.store);

        /**
         * @api {get} /surveys/:id Show
         * @apiName SurveyShow
         * @apiGroup Survey
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Survey object.
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
        app.get("/surveys/:id", AuthService.isAuthenticated(), SurveyController.show);

        /**
         * @api {put} /surveys/:id Update
         * @apiName SurveyUpdate
         * @apiGroup Survey
         * @apiParam {Array} questions Questions of the survey.
         * @apiParam {Array} pocs POCs of the survey (if any).
         * @apiParam {Object} device Device details of the survey.
         * @apiParam {Object} gps GPS details.
         * @apiParam {Boolean} approved If survey is approved or not
         * @apiParam {String} disapproval_reason If store is disapproved, the reason for disapproval.
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
        app.put("/surveys/:id",
            AuthService.isAuthenticated(),
            SurveyValidator.update,
            ResponseService.checkValidationErrors,
            SurveyController.update
        );

        /**
         * @api {delete} /surveys/:id Delete
         * @apiName SurveyDelete
         * @apiGroup Survey
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
            "/surveys/:id",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            SurveyController.destroy,
        );
    }
}
