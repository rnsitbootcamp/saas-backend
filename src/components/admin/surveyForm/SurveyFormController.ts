import { Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import { Types, connection } from "mongoose";
import Tracking from "../../../events/Tracking";
import logger from "../../../services/LoggerService";
import PaginateService from "../../../services/PaginateService";
import ResponseService from "../../../services/ResponseService";
import SurveyFormService from "./SurveyFormService";


const S = "[surveyFormController]";

export default class SurveyFormController {
    public static async index(req: Request, res: Response) {
        const {
            page,
            per_page,
            sort_by,
            sort_order
        } = req.query;

        const { id } = req.params;

        const sortBy = sort_by || 'updatedAt';
        const sortOrder = sort_order || -1;
        const perPage = per_page || 10;
        const _page = page || 1;

        const sortAndLimit = [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: perPage * (_page - 1) },
            { $limit: perPage }
        ];

        const match: any = {
            $match: {
                active: true
            }
        };

        id && (match.$match._id = Types.ObjectId(id))

        const project = {
            $project: {
                title: 1,
                description: 1,
                mode: 1,
                sections: 1,
                createdAt: 1,
                updatedAt: 1
            }
        };

        try {

            const { data, count }: any = await SurveyFormService.getSurveyForms({
                match,
                project,
                sortAndLimit
            }, req.companyConnection);

            const paginate = PaginateService(count, data.length, perPage, _page);

            return res.json({ error: false, data: { surveyForms: data, paginate } });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async create(req: Request, res: Response) {
        const M = `${S}[create]`;
        const {
            sections,
            versions,
            root,
            active,
            ...bodyData
        } = matchedData(req, { locations: ["body"] });
        logger.debug(`${M} bodyData:`, JSON.stringify(req.body));

        Tracking.log({
            data: bodyData,
            type: "surveyForm.create",
            message: "Creating a new survey form",
        }, req);
        try {

            // Create
            const surveyForm = await SurveyFormService.createSurveyForm(
                bodyData, req.companyConnection
            );

            return ResponseService.success(
                res,
                surveyForm,
                "Survey form added successfully"
            );
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async putUpdate(req: Request, res: Response) {
        const M = `${S}[putUpdate]`;
        const {
            versions,
            root,
            active,
            ...bodyData
        } = req.body;

        const { id } = req.params;

        logger.debug(`${M} bodyData:`, JSON.stringify(req.body));

        Tracking.log({
            data: bodyData,
            type: "surveyForm.putUpdate",
            message: "Updating a survey form",
        }, req);

        const finder = {
            _id: Types.ObjectId(id),
        };

        const set = {
            $set: bodyData
        };

        try {

            // Update
            const surveyForm = await SurveyFormService.updateSurveyForm(
                {
                    finder,
                    set
                }, req.companyConnection
            );

            return ResponseService.success(
                res,
                surveyForm,
                "Survey form updated successfully"
            );
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async patchUpdate(req: Request, res: Response) {
        const M = `${S}[patchUpdate]`;
        const {
            title,
            mode,
            description,
            sections
        } = req.body;
        logger.debug(`${M} bodyData:`, JSON.stringify(req.body));

        Tracking.log({
            data: req.body,
            type: "surveyForm.patchUpdate",
            message: "Updating a survey form",
        }, req);
        try {

            // Create
            const surveyForm = await SurveyFormService.createSurveyForm(
                {
                    title,
                    mode,
                    description,
                    sections
                }, req.companyConnection
            );

            return ResponseService.success(
                res,
                surveyForm,
                "Survey form updated successfully"
            );
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async delete(req: Request, res: Response) {
        const M = `${S}[delete]`;
        const {
            id
        } = req.params;

        logger.debug(`${M} bodyData:`, JSON.stringify(req.params));

        Tracking.log({
            data: id,
            type: "surveyForm.delete",
            message: "Deleting a survey form",
        }, req);
        try {

            // Delete
            const surveyForm = await SurveyFormService.deleteSurveyForm(
                {
                    _id: Types.ObjectId(id)
                }, req.companyConnection
            );

            return ResponseService.success(
                res,
                surveyForm,
                "Survey form deleted successfully"
            );
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
