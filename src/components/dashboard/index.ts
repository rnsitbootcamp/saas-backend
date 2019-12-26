import { Router } from "express";
import AuthService from "../../services/AuthService";
import PaginateMiddleware from "../../services/PaginateMiddleware";
import ResponseService from "../../services/ResponseService";
import DashboardController from "./DashboardController";

export default class DashboardRoutes {
    public static init(router: Router) {

        /**
         * @api {get} /dashboard/aggregate Dashboard data
         * @apiName dashboardAggregate
         * @apiGroup Dashboard
         *
         * @apiParam {String} company_id company to look for Eg: company_id=123abcdfffgh12
         * @apiParam {String} storeCount store count filter to choose from today, weekly, monthly, yearly Eg: storeCount=monthly.
         * @apiParam {String} surveyedStoreCount surveyed store count filter to choose from today, weekly, monthly, yearly Eg: surveyedStoreCount=yearly.
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
         *        "data": null | (status=200|null) {
         *
         *        }
         *      }
         *
         */
       
        router.get(
            "/dashboard/aggregate",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, 
            DashboardController.getMetrics
        );

    }
}
