import { Application } from "express";
import AuthService from "../../services/AuthService";
import PaginateMiddleware from "../../services/PaginateMiddleware";
import ResponseService from "../../services/ResponseService";
import MiscellaneousController from "./MiscellaneousController";
import * as MiscellaneousValidator from "./MiscellaneousValidator";
export default class MiscellaneousRoutes {
    public static init(app: Application) {
        /**
         * @api {get} /misc/current_time Get Current time in UTC in milliseconds
         * @apiName Get current
         * @apiGroup Miscellaneous.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "data": {
         *          time: 1543296221968
         *        }
         *      }
         *
         */
        app.all(
            "/misc/current_time",
            AuthService.isAuthenticated(),
            MiscellaneousController.getCurrentTime
        );

        /**
         * @api {post} /misc/notification/push-token Update token for the push token for the user.
         * @apiName Add/Update push token for client.
         * @apiGroup Miscellaneous.
         *
         * @apiParam {String} type Ex: expo.
         * @apiParam {String} push_token Client push token.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": "Boolean",
         *        "msg": "Status String"
         *      }
         *
         */
        app.post(
            "/misc/notification/push-token",
            AuthService.isAuthenticated(),
            MiscellaneousValidator.savePushToken,
            ResponseService.checkValidationErrors,
            MiscellaneousController.savePushToken
        );

        /**
         * @api {post} /misc/user/activity/index Get user activity.
         * @apiName Get User activities.
         * @apiGroup Miscellaneous.
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "filter": {},
         *    "page": Number,
         *    "per_page": Number,
         *    "sort_as": Number, (-1, 1),
         *    "sort_by": String, (time)
         * }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": "Boolean",
         *        "msg": "Status String"
         *      }
         *
         */
        app.post(
            "/misc/user/activity/index",
            PaginateMiddleware,
            AuthService.isAuthenticated(),
            MiscellaneousController.getUserActivity
        );

        /**
         * @api {post} /misc/leaderboard Get Auditor leaderboard..
         * @apiName Get Auditor leaderboard.
         * @apiGroup Miscellaneous.
         *
         * @apiParamExample {json} Request-Example:
         * {
         *    "filter": {}
         * }
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         * {
         *   "error": false,
         *   "message": "Leaderboard fetched successfully.",
         *   "status": 200,
         *   "data": [
         *    {
         *        "user_id": "5bee66820046d135c94558a0",
         *        "totalSurveys": 23,
         *        "totalCompleted": 0,
         *        "point": 0
         *    }
         *   ]
         * }
         */
        app.post(
            "/misc/leaderboard",
            PaginateMiddleware,
            AuthService.isAuthenticated(),
            MiscellaneousController.leaderBoard
        );

        /**
         * @api {post} /misc/user/activity Save user activity.
         * @apiName Add User activities.
         * @apiGroup Miscellaneous.
         *
         * @apiParamExample {json} Request-Example:
         * {
         *       "activities": [
         *           {
         *               "title": "openApp",
         *               "label": "Opened app ",
         *               "time": "1556700000000",
         *               "location": {
         *                   "latitude": 39.7392,
         *                   "longitude": -104.9903
         *                }
         *           }
         *      ]
         * }
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": "Boolean",
         *        "msg": "Status String"
         *      }
         *
         */
        app.post(
            "/misc/user/activity",
            AuthService.isAuthenticated(),
            MiscellaneousValidator.saveUserActivity,
            ResponseService.checkValidationErrors,
            MiscellaneousController.saveUserActivity
        );

        /**
         * @api {post} /misc/barcode/:id get barcode details
         * @apiName GEt details for barcode.
         * @apiGroup Miscellaneous.
         *
         * @apiParamExample {json} Request-Example:
         * {}
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": "Boolean",
         *        "msg": "Status String",
         *        "data": {
         *            // Barcode details
         *         }
         *      }
         *
         */
        app.get(
            "/misc/barcode/:id",
            // AuthService.isAuthenticated(),
            // MiscellaneousValidator.saveUserActivity,
            // ResponseService.checkValidationErrors,
            MiscellaneousController.barCodeInfo
        );

        /**
         * @api {get} /misc/home/stats get home page stats for website
         * @apiName GET Home Page Stats.
         * @apiGroup Miscellaneous.
         *
         * @apiParamExample {json} Request-Example:
         * {}
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": "Boolean",
         *        "msg": "Status String",
         *        "data": {
         *         }
         *      }
         *
         */
        app.get(
            "/misc/home/stats",
            MiscellaneousController.homePageStats
        );

    }
}
