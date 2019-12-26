import { Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import * as _ from "lodash";
import { Types } from "mongoose";

import File from "../../../models/File";
import Store from "../../../models/Store";
import Survey from "../../../models/Survey";
import User from "../../../models/User";
import UserAssignment from "../../../models/UserAssignment";

import Tracking from "../../../events/Tracking";
import AssignmentService from "../assignments/AssignmentService";

import SurveyService from "./SurveyService";

import Db from "../../../services/Db";
import FileService from "../../../services/FileService";
import logger from "../../../services/LoggerService";
import pushNotification from "../../../services/NotificationService";
import NotificationService from "../../../services/NotificationService/NotificationService";
import PaginateService from "../../../services/PaginateService";
import ResponseService from "../../../services/ResponseService";

const S = "[surveyController]";

export default class SurveyController {
    public static async index(req: Request, res: Response) {
        const {
            page,
            per_page
        } = req.body;

        const sortBy = req.body.sort_by || 'survey_added_at';
        const sortOrder = req.body.sort_order || -1;

        const $match: any = SurveyService.getFinder(req.body);
        let countMatcher = _.clone($match);
        let aggregate: any = [
            { $match }
        ];
        const sortAndLimit = [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: per_page * (page - 1) },
            { $limit: per_page }
        ];
        const storeLookup = [
            {
                $lookup: {
                    from: "stores",
                    localField: "store_id",
                    foreignField: "_id",
                    as: "store",
                },
            },
            { $unwind: "$store" },
        ];

        const otherLookupAndProject = [
            {
                $lookup: {
                    from: "user_assignments",
                    localField: "assignment_id",
                    foreignField: "_id",
                    as: "assignment",
                },
            },
            { $unwind: "$assignment" },
            {
                $project: {
                    _id: 1,
                    gps: 1,
                    temp_id: 1,
                    questions: 1,
                    pocs: 1,
                    audios: { id: 1 },
                    date: 1,
                    survey_added_at: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    is_editable: 1,
                    store: {
                        _id: 1,
                        name: 1,
                        channel: 1,
                        sub_channel: 1,
                        region: 1,
                        sub_region: 1,
                        gps: 1,
                        image: 1,
                    },
                    assignment: {
                        _id: 1,
                        assigned_by: 1,
                        user_id: 1,
                        expires_at: 1,
                        createdAt: 1,
                    },
                    addedBy: 1,
                    lastUpdatedBy: 1,
                    approved: 1,
                    disapproval_reason: 1
                },
            },
        ];

        if (req.body.q && typeof req.body.q === 'string') {
            const otherMatchers = SurveyService.otherMatchers(req.body);
            countMatcher = [
                { $match: countMatcher }, ...storeLookup,
                {$match: otherMatchers}, { $group: { _id: null, count: { $sum: 1 } } }
            ];
            aggregate = [...aggregate, ...storeLookup, { $match: otherMatchers },
            ...sortAndLimit, ...otherLookupAndProject];
        } else {
            countMatcher = [
                { $match: countMatcher }, { $group: { _id: null, count: { $sum: 1 } } }
            ];
            aggregate = [...aggregate, ...sortAndLimit, ...storeLookup, ...otherLookupAndProject];
        }

        try {
            Store(req.companyConnection);
            UserAssignment(req.companyConnection);
            let count = await Survey(req.companyConnection).aggregate(countMatcher);
            count = count && count.length && count[0].count ? count[0].count : 0;
            let surveys = await Survey(req.companyConnection).aggregate(aggregate);
            surveys = await Survey(req.companyConnection)
                .populate(surveys,
                    [
                        { path: "addedBy", model: User, select: "name" },
                        { path: "lastUpdatedBy", model: User, select: "name" },
                        { path: "assignment.assigned_by", model: User, select: "name" },
                        { path: "assignment.user_id", model: User, select: "name" },
                    ]);

            const paginate = PaginateService(count, surveys.length, per_page, page);
            return res.json({ error: false, data: { surveys, paginate } });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async store(req: Request, res: Response) {
        const M = `${S}[store]`;
        const { user } = req;
        const bodyData = matchedData(req, { locations: ["body"] });
        logger.debug(`${M} bodyData:`, JSON.stringify(req.body));
        bodyData.company_id = req.company._id;
        bodyData.addedBy = user._id;
        bodyData.lastUpdatedBy = user._id;
        Tracking.log({
            data: bodyData,
            type: "survey.create",
            message: "Creating a new survey",
        }, req);
        try {
            // Create
            const store = await Store(req.companyConnection).findOne({ _id: bodyData.store_id });
            if (!store) {
                return ResponseService.validationError(res, [{ path: "store_id", msg: "Store not exists" }]);
            }
            // Need to remove after demo. Remove below 2 lines after jan 30 2019
            if (store.gps) {
                bodyData.gps = store.gps;
            }
            const survey = await SurveyService.createSurvey(
                bodyData, req.companyConnection
            );
            let addedToQueue;
            if (_.find((store.authorizedUsers || []), (authorizedUser) => {
                return authorizedUser.equals(user._id);
            })) {
                /*(store.authorizedUsers || []).includes(user._id) */
                // Add To Queue
                addedToQueue = await SurveyService.pushToQueueForProcessing(
                    survey
                );
                await Survey(req.companyConnection).findByIdAndUpdate(survey._id, {
                    approved: true
                });
                await AssignmentService.addNextAutomaticAssignment({
                    assignment_id: survey.assignment_id
                }, req.companyConnection);
            } else {
                logger.info(M, `survey not processing reason: user is not authorized for store`);
            }
            if (!addedToQueue) {
                Tracking.log({
                    data: survey,
                    type: "queue.failedToAdd",
                    message: "Adding survey to queue",
                }, req);
            }
            return res.status(200).json({ error: false, message: "Survey added successfully", data: survey });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async show(req: Request, res: Response) {
        try {
            Db.registerSchemas(["Store"], req.companyConnection);
            const aggregate = [
                { $match: { _id: Types.ObjectId(req.params.id) } },
                {
                    $lookup: {
                        from: "stores",
                        localField: "store_id",
                        foreignField: "_id",
                        as: "store",
                    },
                },
                { $unwind: "$store" },
                {
                    $lookup: {
                        from: "user_assignments",
                        localField: "assignment_id",
                        foreignField: "_id",
                        as: "assignment",
                    },
                },
                { $unwind: "$assignment" },
                { $sort: { date: 1 } },
                {
                    $project: {
                        _id: 1,
                        gps: 1,
                        temp_id: 1,
                        questions: 1,
                        pocs: 1,
                        date: 1,
                        survey_added_at: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        store: {
                            _id: 1,
                            name: 1,
                            channel: 1,
                            sub_channel: 1,
                            region: 1,
                            sub_region: 1,
                            gps: 1,
                            image: 1,
                        },
                        assignment: {
                            _id: 1,
                            assigned_by: 1,
                            user: "$assignment.user_id",
                            expires_at: 1,
                            createdAt: 1,
                        },
                        addedBy: 1,
                        lastUpdatedBy: 1,
                        approved: 1,
                        disapproval_reason: 1,
                        signature: 1
                    },
                },
            ];
            let surveys = await Survey(req.companyConnection).aggregate(aggregate);
            surveys = await Survey(req.companyConnection)
                .populate(surveys,
                    [
                        { path: "addedBy", model: User, select: "name" },
                        { path: "lastUpdatedBy", model: User, select: "name" },
                        { path: "assignment.assigned_by", model: User, select: "name" },
                        { path: "assignment.user", model: User, select: "name" },
                    ]);
            const survey = surveys[0];
            if (!survey) {
                return ResponseService.notFoundError(res, "Survey not found.");
            }

            for (const question of survey.questions) {
                let fileNames = [...(question.audio || []), ...(question.audios || []),
                ...(question.image || []), ...((question.images || []))
                ];
                if (question.type === "file") {
                    fileNames = [...fileNames, ...question.answer];
                }
                fileNames = _.uniq(fileNames);
                const fileIds = fileNames.filter((x) => {
                    return x.length === 12 || x.length === 24;
                });
                const files: any = await File.find({
                    $or: [
                        { name: { $in: fileNames } },
                        { _id: { $in: fileIds } }
                    ]
                }).lean();
                question.audio = files.filter((x) => {
                    return x && (/audio/).test(x.contentType);
                }).map((x) => {
                    return FileService.map(x);
                });

                question.images = files.filter((x) => {
                    return x && (/image/).test(x.contentType);
                }).map((x) => {
                    return FileService.map(x);
                });

                if (question.type === "file") {
                    const answer: any = files.filter((x) => {
                        return question.answer.includes(x._id) || question.answer.includes(x.name);
                    });
                    question.answer = answer.map((x) => {
                        return FileService.map(x);
                    });
                }
            }
            if (survey.store && !_.isEmpty(survey.store.image)) {
                let fileNames = survey.store.image;
                fileNames = _.uniq(fileNames);
                const fileIds = fileNames.filter((x) => {
                    return x.length === 12 || x.length === 24;
                });
                const files: any = await File.find({
                    $or: [
                        { name: { $in: fileNames } },
                        { _id: { $in: fileIds } }
                    ]
                }).lean();
                survey.store.image = files.filter((x) => {
                    return x && (/image/).test(x.contentType);
                }).map((x) => {
                    return FileService.map(x);
                });
            }

            if (survey.signature) {
                let fileNames = [survey.signature];
                const fileIds = fileNames.filter((x) => {
                    return x.length === 12 || x.length === 24;
                });
                const files: any = await File.find({
                    $or: [
                        { name: { $in: fileNames } },
                        { _id: { $in: fileIds } }
                    ]
                }).lean();
                survey.signature = files.filter((x) => {
                    return x && (/signature/).test(x.contentType);
                }).map((x) => {
                    return FileService.map(x);
                })[0];
            }

            return res.status(200).json({ error: false, data: survey });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async update(req: Request, res: Response) {
        const M = `[${S}][update]`;
        try {
            let bodyData = matchedData(req, { locations: ["body"] });
            logger.debug(`${M} bodyData:`, JSON.stringify(req.body));
            const surveyId = req.params.id;
            const userId = req.user._id;
            bodyData.lastUpdatedBy = userId;
            bodyData = _.omitBy(bodyData, (x) => x === undefined || x === null);
            if (req.user && req.user.isAuditor) {
                bodyData.approved = undefined;
                bodyData.disapproval_reason = "";
            }
            const survey = await Survey(req.companyConnection).findByIdAndUpdate(surveyId, {
                $set: bodyData
            }, { new: true });
            if (bodyData.approved) {
                const addedToQueue = await SurveyService.pushToQueueForProcessing(
                    survey
                );
                await AssignmentService.addNextAutomaticAssignment({
                    assignment_id: survey.assignment_id
                }, req.companyConnection);
                if (!addedToQueue) {
                    Tracking.log({
                        data: survey,
                        type: "queue.failedToAdd",
                        message: "Adding survey to queue",
                    }, req);
                }
            } else if (bodyData.approved === false && bodyData.disapproval_reason) {
                // Send survey disapproval_reason to Auditor.
                const notification: NotificationService = await pushNotification(survey.addedBy);
                notification.addMessage({
                    // tslint:disable-next-line:max-line-length
                    body: `Store you surveyed got disapproved, reason for disapproval is ${bodyData.disapproval_reason}`,
                    data: {
                        store_id: survey.store_id,
                        survey_id: survey._id
                    }
                });
                const result = await notification.send();
                logger.info(`${S}[update]`, result);
            }
            return res.status(200).json({ error: false, message: "Survey updated successfully", data: survey });
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async destroy(req: Request, res: Response) {
        await Survey(req.companyConnection).findByIdAndUpdate(req.params.id, {
            $set: { deleted: true, deletedAt: new Date() },
        });
        return ResponseService.success(res, null, "Survey deleted successfully");
    }
}
