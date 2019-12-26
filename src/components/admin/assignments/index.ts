import { Application } from "express";

import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";

import AssignmentController from "./AssignmentController";
import * as AssignmentValidator from "./AssignmentValidator";

export default class AssignmentRoutes {
    public static init(app: Application) {
        /**
         * @api {post} /assignments/index Index
         * @apiName AssignmentList
         * @apiGroup Assignments
         *
         * @apiParam {String} q General search term.
         * @apiParam {String} status Allowed values completed, expired, due, all.
         * @apiParam {Number} sort_order -1 or 1, // desc or asc,
         * @apiParam {String} sort_by Sort by key // name
         * @apiParam {Array} user_ids Ids of the users.
         * @apiParam {Number} per_page=20 Paginate page.
         * @apiParam {Number} page=1 Results per page.
         * @apiParam {Boolean} include_survey_questions To include survey questions with response.
         *
         * @apiParamExample {json} Request-Example:
         *        {
         *          "q": String,
         *          "user_ids": [String],
         *          "survey_ids": [String],
         *          "store_ids": [String],
         *          "expires_at": Number,
         *          "page": Number,
         *          "per_page": Number,
         *          "include_survey_questions": true|false
         *        }
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {String} message  Message.
         * @apiSuccess {Object} data  Assignments and Paginate object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number,
         *        "message": String,
         *        "data": {
         *          assignments: {},
         *          paginate: {}
         *        }
         *      }
         *
         */
        app.post(
            "/assignments/index",
            AuthService.isAuthenticated(),
            PaginateMiddleware,
            AssignmentController.index,
        );

        /**
         * @api {post} /assignments/stores List of assignments in a period
         * @apiName AssignmentListInPeriod
         * @apiGroup Assignments
         *
         * @apiParam {Number} per_page=20 Paginate page.
         * @apiParam {Number} page=1 Results per page.
         * @apiParam {Date} expires_at expires at.
         * @apiParam {Date} starts_at Assignment starts at.
         * @apiParam {Object} filters Ex: {user_id: "user mongo id"} or {store_id: "store mongo id"}
         * {store_id: "store mongo id", user_id: "user mongo id}
         *
         * @apiParamExample {json} Request-Example:
         *        {
         *          "page": Number,
         *          "per_page": Number,
         *          "include_survey_questions": true|false
         *        }
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {String} message  Message.
         * @apiSuccess {Object} data  Assignments and Paginate object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number,
         *        "message": String,
         *        "data": {
         *          assignments: {},
         *          paginate: {}
         *        }
         *      }
         *
         */
        app.post(
            "/assignments/stores",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            AssignmentValidator.listStoreAssignmentsInPeriod,
            ResponseService.checkValidationErrors,
            PaginateMiddleware,
            AssignmentController.listStoreAssignmentsInPeriod,
        );

        /**
         * @api {post} /assignments Create
         * @apiName AssignmentCreate
         * @apiGroup Assignments
         *
         * @apiParam {Array} surveys Surveys for the users.
         * @apiParam {String} surveys.user_id User for the survey.
         * @apiParam {String} surveys.store_id Store for the survey.
         * @apiParam {String} surveys.expires_at Time after which survey expires or has to be completed.
         * @apiParam {Boolean} is_editable If the survey can be updated after created by auditor.
         * @apiParam {Boolean} autoAssign Enable automatic assignments
         * @apiParam {Date} autoAssignExpiresAt automatic assignment expiry.
         *
         * @apiParamExample {json} Request-Example:
         *      [
         *        {
         *          "user_id": String,
         *          "store_id": String,
         *          "expires_at": Date,
         *          "is_editable": Boolean
         *        }
         *      ]
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number,
         *        "message": String
         *      }
         *
         */
        app.post(
            "/assignments",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            AssignmentController.create,
        );

        /**
         * @api {put} /assignments/:id Update
         * @apiName AssignmentUpdate
         * @apiGroup Assignments
         *
         * @apiParam {String} user_id User for the survey.
         * @apiParam {String} store_id Store for the survey.
         * @apiParam {String} expires_at Time after which survey expires or has to be completed.
         * @apiParam {Boolean} is_editable If the survey can be updated after created by auditor.
         * @apiParam {Boolean} autoAssign Enable automatic assignments
         * @apiParam {Date} autoAssignExpiresAt automatic assignment expiry.
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
         *
         */
        app.put(
            "/assignments/:id",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            AssignmentController.update,
        );

        /**
         * @api {delete} /assignments/:id Delete
         * @apiName AssignmentDelete
         * @apiGroup Assignments
         *
         * @apiSuccess {String} error If expected error occured.
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
            "/assignments/:id",
            AuthService.isAuthenticated(),
            AuthService.isAdminOfCompany,
            AssignmentController.delete,
        );
    }
}
