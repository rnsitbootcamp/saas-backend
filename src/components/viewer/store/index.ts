import { Router } from "express";
import AuthService from "../../../services/AuthService";
import PaginateMiddleware from "../../../services/PaginateMiddleware";
import ResponseService from "../../../services/ResponseService";
import ReportingController from "./ReportingController";

export default class ReportingRoutes {
    public static init(router: Router) {
        /**
         * @api {get} /v/reporting/filters API endpoints for getting filters for reporting.
         * @apiName Get Report filters
         * @apiGroup Reports
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  My companies.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *      "error": false,
         *      "message": "Reporting filters",
         *      "status": 200,
         *      "data": {
         *            "region": [
         *                {
         *                    "id": 1,
         *                   "title": "India",
         *                  "value": true
         *              }
         *          ],
         *          "sub_region": [
         *                {
         *                    "id": 1,
         *                  "title": "Kerala",
         *                  "customFields": [],
         *                  "is_fixed": false
         *              }
         *          ],
         *          "channel": [
         *                {
         *                    "id": 1,
         *                  "title": "HM",
         *                  "customFields": [],
         *                  "is_fixed": false
         *              }
         *          ],
         *          "sub_channel": [
         *                {
         *                    "id": 1,
         *                  "title": "Bakery",
         *                  "customFields": [],
         *                  "is_fixed": false
         *              }
         *          ]
         *      }
         *  }
         *
         */
        router.get(
            [
                "/reporting/filters", "/reporting/stores/filters",
                "/report/stores/filters"
            ],
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, ReportingController.getReportingFilters
        );

        /**
         * @api {post} /v/report/export API to export report to user email.
         * @apiName Export the report
         * @apiGroup Reports
         *
         * @apiParam {String} time_range Ex: 201812.
         * @apiParam {String} true To export stores
         * @apiParam {Number} region Region of the store.
         * @apiParam {Number} sub_region Sub Region of the store.
         * @apiParam {Number} channel Channel of the store.
         * @apiParam {Number} sub_channel Sub channel of the store.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  My companies.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        status:  xxx,
         *        error: false | true
         *     }
         *
         */

        router.post(
            ["/report/export"],
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            ReportingController.exportReport
        );

        router.post(
            ["/report/stores/:id", "/reporting/stores/:id"],
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            ReportingController.showStoreMapReducer
        );
        router.post(
            ["/month/aggregate", "/reporting/month", "/report/month"],
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, ReportingController.getMonthReports
        );
        /**
         * @api {post} /v/reports API endpoints for reporting.
         * @apiName Get Reports
         * @apiGroup Reports
         *
         * @apiParam {Number} region Region id.
         * @apiParam {Number} sub_region Sub Region id.
         * @apiParam {Number} channel channel id.
         * @apiParam {Number} sub_channel Sub channel id.
         * @apiParam {Number} time_range Ex: 201811
         * @apiParam {Boolean} stores To get stores data with above filters
         * @apiParam {Boolean} home_page to enable home page payload.
         * @apiParam {Number} page Pagination params.
         * @apiParam {Number} per_page Pagination params.
         * @apiParam {Number} sort_order Pagination params.
         * @apiParam {Boolean} sort_by Pagination params.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  My companies.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *      "status": "success",
         *      "data": {
         *          "cities": [], // if filtered with countries
         *          "countries"[], // if filtered only with time range
         *          "stores": [], // If stores: true or if region and sub_region filter exists.
         *          "paginate": {
         *               "total_item": 1,
         *               "showing": 1,
         *               "first_page": 1,
         *               "is_first_page": true,
         *               "previous_page": 1,
         *               "has_previous_page": false,
         *               "current_page": 1,
         *               "next_page": 2,
         *               "has_next_page": false,
         *               "last_page": 1,
         *               "is_last_page": true
         *           }
         *       },
         *     }
         *
         */
        router.post(
            ["/stores/aggregate", "/reporting/stores", "/report/stores"],
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, ReportingController.getReports
        );

        router.get(
            "/stores/map/reduced",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, ReportingController.listStoreMapReducer
        );

        router.get(
            "/stores/map/reduced/:id", AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            ReportingController.showStoreMapReducer
        );

        router.get(
            "/stores", AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            PaginateMiddleware, ReportingController.index
        );

        router.get(
            "/stores/:id",
            AuthService.isAuthenticated(),
            AuthService.isCompanyExists(),
            ResponseService.checkValidationErrors,
            ReportingController.show
        );

    }
}
