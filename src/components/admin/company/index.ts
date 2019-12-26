import { Application } from "express";
import AuthService from "../../../services/AuthService";
import CompanyController from "./CompanyController";

export default class CompanyRoutes {
    public static init(app: Application) {
        /**
         * @api {get} /companies/types Get Company types
         * @apiName companyTypes
         * @apiGroup Company
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Array} data  Companies type List.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": [{id: 1, title: "Restaurant"}]
         *    }
         *
         */
        app.get(
            "/companies/types",
            AuthService.isAuthenticated(),
            CompanyController.getCompanyTypes
        );
        /**
         * @api {get} /companies/templates Get templates
         * @apiName companyTemplates
         * @apiGroup Company
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Array} data  Companies template List.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": [{
         *              "kpis": [],
         *              "questions": [],
         *              "question_groups": [],
         *              "list": []
         *        }]
         *    }
         *
         */
        app.get(
            "/companies/templates",
            AuthService.isAuthenticated(),
            CompanyController.getTemplateForCompany
        );
        /**
         * @api {get} /companies Index
         * @apiName CompanyList
         * @apiGroup Company
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Array} data  Companies List.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": [{
         *          "_id": string,
         *          "name": string,
         *          "logo": {
         *              "url": string,
         *           },
         *          "is_ice": Boolean,
         *          "is_ra": Boolean,
         *          "admin": Boolean,
         *          "auditor": Boolean,
         *          "viewer": Boolean
         *        }]
         *    }
         *
         */
        app.get("/companies", AuthService.isAuthenticated(), CompanyController.index);

        /**
         * @api {post} /companies Create
         * @apiName CompanyCreate
         * @apiGroup Company
         *
         * @apiParam {String} name Name of the company.
         * @apiParam {String} type Type of the company.
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
         *        "data": {} | (status=422) [
         *            {path: String, message: String}
         *        ]
         *      }
         *
         */
        app.post("/companies", AuthService.isAuthenticated(), CompanyController.store);

        /**
         * @api {get} /companies/:id Show
         * @apiName CompanyShow
         * @apiGroup Company
         *
         * @apiParam {String} select Eg: ?select=questions,question_groups.
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  Company Data.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *          "_id": string,
         *          "name": string,
         *          "logo": {
         *              "url": string,
         *           },
         *          "is_ice": Boolean,
         *          "is_ra": Boolean,
         *          "admin": Boolean,
         *          "auditor": Boolean,
         *          "viewer": Boolean
         *          "data": Object
         *          "questions": Array
         *          "question_groups": Array
         *          "list": Array
         *        }
         *    }
         *
         */
        app.get("/companies/:id", AuthService.isAuthenticated(), CompanyController.show);
        /**
         * @api {put} /companies/:id Update
         * @apiName CompanyUpdate
         * @apiGroup Company
         *
         * @apiParam {String} name Name of the company.
         * @apiParam {String} logo ID of the file.
         * @apiParam {Boolean} is_ra If the company is RetailAudit?
         * @apiParam {Boolean} is_re If the company is ICE?.
         * @apiParam {Array} data Data of the company.
         * @apiParam {Array} questions Questions of the company.
         * @apiParam {Array} list Lists of the company.
         * @apiParam {Array} question_groups Question Groups of the company.
         * @apiParam {Array} kpis KPIs of the company.
         * @apiParam {Array} skus skus of the company.
         * @apiParam {Array} features features of the company.
         * @apiParam {Object} packages packages of the company.
         * @apiParam {Object} brands Brands of the company.
         * @apiParam {Array} categories Categories.
         * @apiParam {Array} pocs pocs of the company.
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
         *        "data": {} | (status=422) [
         *            {path: String, message: String}
         *        ]
         *      }
         *
         */
        app.put("/companies/:id", AuthService.isAuthenticated(), CompanyController.update);
        app.get("/getSkus" , AuthService.isAuthenticated() , CompanyController.getSkus);
    }
}
