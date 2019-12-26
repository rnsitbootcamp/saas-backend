import { Application } from "express";
import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";
import SurveyFormController from "./SurveyFormController";
import * as SurveyFormValidator from "./SurveyFormValidator";

export default class SurveyFormRoutes {
    public static init(app: Application) {
        /**
         * @api {get} /forms/:id? Index
         * @apiName SurveyFormList
         * @apiGroup SurveyForm
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "page": Number, -q
         *    "per_page": Number, -q
         *    "sort_as": String, (desc, asc), -q
         *    "sort_by": String, (date), -q
         *    "company_id": String, 5c00e9d43c92b511c794c127, -q
         *    "id": String, (Optional) 5d123e9d43c92b511c794c127 -p
         * }/
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Paginate and SurveyForms object.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *          "surveyForms": [],
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
        app.get(
            "/forms/:id?",
            AuthService.isAuthenticated(), 
            SurveyFormController.index
        );

        /**
         * @api {post} /forms Create
         * @apiName SurveyFormCreate
         * @apiGroup SurveyForm
         * @apiParam {String} title survey form title. -b
         * @apiParam {String} description survey form description. -b
         * @apiParam {Object} mode survey mode. -b
         * @apiParam {Object} sections survey form sections with questions. -b
         * @apiParam {String} company_id Eg: 5c00e9d43c92b511c794c127. -q
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
            "/forms",
            AuthService.isAuthenticated(),
            SurveyFormValidator.create,
            ResponseService.checkValidationErrors,
            SurveyFormController.create
        );

        /*
         * @api {patch} /forms Patch Update
         * @apiName SurveyFormPatchUpdate
         * @apiGroup SurveyForm
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
        // app.patch(
        //     "/forms/:id",
        //     AuthService.isAuthenticated(),
        //     SurveyFormController.patchUpdate
        // );

        /**
         * @api {put} /forms/:id Put Update
         * @apiName SurveyFormPutUpdate
         * @apiGroup SurveyForm
         * @apiParam {String} title survey form title. -b
         * @apiParam {String} description survey form description. -b
         * @apiParam {Object} mode survey mode. -b
         * @apiParam {Object} sections survey form sections with questions. -b
         * @apiParam {String} company_id Eg: 5c00e9d43c92b511c794c127. -q
         * @apiParam {String} id Eg: 5d123e9d43c92b511c794c127. -p
         * 
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
            "/forms/:id",
            AuthService.isAuthenticated(),
            SurveyFormController.putUpdate
        );

        /**
         * @api {delete} /forms/:id Delete
         * @apiName SurveyFormDelete
         * @apiGroup SurveyForm
         * @apiParam {String} company_id Eg: 5c00e9d43c92b511c794c127. -q
         * @apiParam {String} id Eg: 5d123e9d43c92b511c794c127. -p
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
        app.delete(
            "/forms/:id",
            AuthService.isAuthenticated(),
            SurveyFormController.delete
        );
    }
}
