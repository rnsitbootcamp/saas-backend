import * as dayjs from "dayjs";
import { Request, Response } from "express";
import * as _ from "lodash";
import { createConnection } from "mongoose";

import Company from "../../../models/Company";
import Store from "../../../models/Store";
import UserAssignment from "../../../models/UserAssignment";

import Tracking from "../../../events/Tracking";
import StoreService from "../store/StoreService";
import SurveyService from "../survey/SurveyService";

import logger from "../../../services/LoggerService";
import ResponseService from "../../../services/ResponseService";

const S = "[MobileController]";
export default class MobileController {
    public static async data(req: Request, res: Response) {
        const data = req.body;
        Tracking.log({
            data,
            type: "offline.store",
            message: "Adding data via offline api",
        }, req);

        try {
            // Get the companies connections
            const connections = await MobileController.getCompanyDatabaseConnections(data);
            // Create the stores and get the corresponding map from temp_id to store_id
            const tempIdsToStores = await MobileController.insertStores(connections, data.stores, req);
            // Create assignments for the new stores that have been surveyed
            const storeIdsToAssignmentIds = await MobileController.createAssignments(
                connections, data.stores, tempIdsToStores, req);
            // Create surveys
            const insertedSurveys = await MobileController.insertSurveys(
                connections, data.surveys, tempIdsToStores, storeIdsToAssignmentIds, req);

            const response = {
                stores: Object.values(tempIdsToStores),
                surveys: insertedSurveys,
            };

            return ResponseService.success(res, response, "Data synced successfully.");
        } catch (e) {
            return res.json({ error: true, message: `Error occurred: ${e.message}` });
        }
    }

    private static async getCompanyDatabaseConnections(data) {
        // Since we may have stores for different companies, we need to have connections
        const companyConnections = {};
        let companyIds = [];

        if (data.stores && data.stores.length > 0) {
            companyIds = companyIds.concat(_.map(data.stores, (c: any) => c.company_id));
        }

        if (data.surveys && data.surveys.length > 0) {
            companyIds = companyIds.concat(_.map(data.surveys, (c: any) => c.company_id));
        }

        const companies = await Company.find({ _id: { $in: companyIds } }, { database: 1, questions: 1 });

        companies.forEach((c: any) => {
            const url = `${process.env.MONGO_BASE_URL}${c.database.path}`;
            companyConnections[c._id] = {
                connection: createConnection(url),
                company: c,
            };
        });

        return companyConnections;
    }

    private static async insertStores(connections, stores, req) {
        const failedStores = [];
        const tempIdToId = {};
        const promises = [];

        if (stores.length === 0) {
            return tempIdToId;
        }

        // Store will be mapped from the mobile app.
        for (const store of stores) {
            if (!connections[store.company_id]) {
                failedStores.push(store);
                continue;
            }
            store.addedBy = req.user._id;
            store.lastUpdatedBy = req.user._id;
            store.approved = false;
            store.offline = true;

            // Map the questions
            const map = await StoreService.mapQuestions(store.questions, connections[store.company_id].questions);
            _.merge(store, map);

            promises.push(Store(connections[store.company_id].connection).create(store));
        }

        if (failedStores.length > 0) {
            Tracking.log({
                data: failedStores,
                type: "offline.storesFailed",
                message: "Adding store via offline api failed",
            }, req);
        }

        const createdStores = await Promise.all(promises);
        createdStores.forEach((store) => {
            if (store.temp_id) {
                tempIdToId[store.temp_id] = store;
            }
        });
        return tempIdToId;
    }

    private static async createAssignments(connections, stores, tempIdsToStores, req) {
        const assignmentIds = {};
        const failedAssignments = [];
        const promises = [];
        const expiresAt = new Date();

        stores.forEach((store) => {
            if (!connections[store.company_id]) {
                failedAssignments.push(store);
            } else {
                const assignment = {
                    user_id: req.user._id,
                    store_id: tempIdsToStores[store.temp_id]._id,
                    assigned_by: req.user._id,
                    expires_at: expiresAt,
                    starts_at: new Date(),
                    is_editable: false,
                    expiry_month: Number(dayjs(expiresAt).format("YYYYMM")),
                    offline: true,
                };
                promises.push(UserAssignment(connections[store.company_id].connection).create(assignment));
            }
        });

        if (failedAssignments.length > 0) {
            Tracking.log({
                data: failedAssignments,
                type: "offline.assignmentsFailed",
                message: "Adding assignments via offline api failed",
            }, req);
        }

        const assignments = await Promise.all(promises);
        assignments.forEach((assignment) => {
            assignmentIds[assignment.store_id] = assignment._id;
        });
        return assignmentIds;
    }

    private static async insertSurveys(connections, surveys, tempIdsToStore, storeIdsToAssignmentIds, req) {
        const M = `${S}[insertSurveys]`;
        if (surveys.length === 0) {
            return [];
        }

        const failedSurveys = [];
        const failedToAddToQueue = [];
        const addedSurveys = [];

        for (const survey of surveys) {
            try {
                if (!connections[survey.company_id] || !tempIdsToStore[survey.temp_store_id]) {
                    failedSurveys.push(survey);
                    continue;
                }

                // Store ID from temp store ids
                survey.store_id = tempIdsToStore[survey.temp_store_id]._id;
                // Assignment ID from the previously found store id and store ids to assignments ids
                survey.assignment_id = storeIdsToAssignmentIds[survey.store_id];
                // From req
                survey.user_id = req.user._id;
                survey.offline = true;
                survey.addedBy = req.user._id;
                survey.lastUpdatedBy = req.user._id;

                // Add the survey
                const addedSurvey = await SurveyService.createSurvey(survey, connections[survey.company_id].connection);
                // Push to Queue for processing
                const addedToQueue = await SurveyService.pushToQueueForProcessing(addedSurvey);
                if (!addedToQueue) {
                    failedToAddToQueue.push(addedSurvey._id);
                }
                addedSurveys.push(addedSurvey.toJSON());
            } catch (error) {
                logger.error(M, "Error in adding survey:", error);
            }
        }

        if (failedSurveys.length > 0) {
            Tracking.log({
                data: failedSurveys,
                type: "offline.surveysFailed",
                message: "Adding survey via offline api failed",
            }, req);
        }

        if (failedToAddToQueue.length > 0) {
            Tracking.log({
                data: failedToAddToQueue,
                type: "offline.surveysToQueueFailed",
                message: "Adding survey to queue via offline api failed",
            }, req);
        }
        logger.debug(M, addedSurveys);

        return addedSurveys;
    }
}
