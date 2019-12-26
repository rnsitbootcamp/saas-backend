import { Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import * as _ from "lodash";

import StoreEvents from "../../../events/StoreEvents";

import Company from "../../../models/Company";
import Store from "../../../models/Store";
import Survey from "../../../models/Survey";

import ResponseService from "../../../services/ResponseService";

import AssignmentService from "../assignments/AssignmentService";
import StoreService from "./StoreService";

export default class StoreController {
    public static async index(req: Request, res: Response) {
        try {
            const data = await StoreService.getStoresPaginated(req);
            return ResponseService.success(res, data);
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async store(req: Request, res: Response) {
        const storeData: {
            addedBy: string,
            lastUpdatedBy: string,
            questions: any[],
            approved?: boolean,
            disapproval_reason?: string,
        } = {
            addedBy: req.user._id,
            lastUpdatedBy: req.user._id,
            questions: req.body.questions,
        };
        if (!req.user.isAdmin && !req.user.approved) {
            return ResponseService.Forbidden(res, 'Only approved user can create store!');
        }
        try {
            const company: any = await Company.findById({ _id: req.query.company_id });
            const companyQuestions = company.questions;
            const map = await StoreService.mapQuestions(storeData.questions, companyQuestions);
            _.merge(storeData, map);
            delete storeData.questions;
            // Store Approval
            if (req.user.isAdmin) {
                req.body.approved = typeof (req.body.approved) === "boolean" ? req.body.approved : true;
                storeData.approved = Boolean(req.body.approved);
                if (!storeData.approved && req.body.disapproval_reason) {
                    storeData.disapproval_reason = req.body.disapproval_reason;
                } else if (storeData.approved) {
                    storeData.disapproval_reason = "";
                }
            } else {
                storeData.approved = false;
            }

            const store = await Store(req.companyConnection).create(storeData);
            await AssignmentService.auditorAutoAssignOnStoreCreate(req.user, store, req.companyConnection);
            return res.status(200).json({ error: false, message: "Store added successfully", data: store });
        } catch (e) {
            if (e.name === "ValidationError") {
                return ResponseService.validationError(res, [{ path: "*", message: e.message }]);
            }
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async show(req: Request, res: Response) {
        try {
            const store = await StoreService.getStore(req);
            const storeQuestions = req.company.questions.filter((x) => {
                return x.is_store;
            });
            storeQuestions.map((q) => {
                q.type = q.type.key;
                if (q.mapped_to && q.mapped_to.key) {
                    q.answer = store[q.mapped_to.key];
                }
                return q;
            });
            store.questions = storeQuestions;
            if (!store) {
                return ResponseService.notFoundError(res, "Store not found.");
            }
            return res.json({ error: false, data: store });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async update(req: Request, res: Response) {
        const bodyData = matchedData(req, { locations: ["body"] });
        let storeData: {
            lastUpdatedBy: string,
            questions?: any[],
            approved?: boolean,
            enabled?: boolean,
            disapproval_reason?: string,
            authorizedUsers?: any
        } = {
            lastUpdatedBy: req.user._id,
            questions: bodyData.questions,
            enabled: bodyData.enabled
        };
        if (_.isArray(bodyData.authorizedUsers)) {
            storeData.authorizedUsers = bodyData.authorizedUsers;
        }

        if (typeof (bodyData.approved) === "boolean" && req.user.isAdmin) {
            storeData.approved = Boolean(bodyData.approved);
            if (!storeData.approved && bodyData.disapproval_reason) {
                storeData.disapproval_reason = bodyData.disapproval_reason;
            } else {
                storeData.disapproval_reason = "";
            }
        }

        try {
            const oldStore = await Store(req.companyConnection).findOne({
                _id: req.params.id,
            }).lean();
            const company: any = await Company.findById({ _id: req.query.company_id });
            const companyQuestions = company.questions;
            if (storeData.questions) {
                const map = await StoreService.mapQuestions(storeData.questions, companyQuestions);
                _.merge(storeData, map);
            } else {
                delete storeData.questions;
            }

            // @ts-ignore
            storeData = _.omitBy(storeData, (x) => x === undefined);
            const store = await Store(req.companyConnection).findByIdAndUpdate(req.params.id,
                {
                    $set: storeData,
                }, {
                    new: true, fields: { deleted: 0, offline: 0 }
                }
            );
            if (typeof (bodyData.approved) === "boolean" && oldStore.approved &&
                bodyData.approved === false && req.user.isAdmin) {
                const storeEvent = new StoreEvents(oldStore);
                await storeEvent.storeDisapproved({
                    admin: req.user,
                    disapproval_reason: storeData.disapproval_reason,
                });
                await storeEvent.storeDisapprovedSendPushNotification(
                    store._id, storeData.disapproval_reason, store.user_id
                );
            }
            return ResponseService.success(res, store, "Store updated successfully");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async destroy(req: Request, res: Response) {
        await Store(req.companyConnection).findByIdAndUpdate(
            req.params.id, { $set: { deleted: true, deletedAt: new Date() } }
        );
        await Survey(req.companyConnection).updateMany(
            { store_id: req.params.id }, { $set: { deleted: true, deletedAt: new Date() } }
        );
        return ResponseService.success(res, null, "Store deleted successfully");
    }
}
