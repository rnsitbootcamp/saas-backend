import * as dayjs from "dayjs";
import { Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import * as _ from "lodash";

import User from "../../../models/User";
import UserAssignment from "../../../models/UserAssignment";

import logger from "../../../services/LoggerService";
import PaginateService from "../../../services/PaginateService";
import ResponseService from "../../../services/ResponseService";

import AssignmentService from "./AssignmentService";

const S = "[AssignmentController]";

export default class AssignmentController {
    public static async index(req: Request, res: Response) {
        try {
            const {
                page, per_page,
                include_survey_questions
            } = req.body;
            const sortBy = req.body.sort_by || 'expires_at';
            const sortOrder = req.body.sort_order || -1;
            const { user } = req;
            const $match: any = AssignmentService.getFinder(req.body, user, req.companyConnection);
            let countMatcher = _.clone($match);
            const sortAndLimit = [
                { $sort: { [sortBy]: sortOrder } },
                { $skip: (page - 1) * per_page },
                { $limit: per_page }
            ];
            let aggregate: any = [
                { $match }
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
                { $unwind: "$store" }
            ];
            const otherLookupAndProject = [
                {
                    $lookup: {
                        from: "surveys",
                        localField: "survey_id",
                        foreignField: "_id",
                        as: "survey",
                    },
                },
                {
                    $unwind: {
                        path: "$survey",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        assigned_by: 1,
                        expires_at: 1,
                        starts_at: 1,
                        createdAt: 1,
                        is_editable: 1,
                        updatedAt: 1,
                        store: {
                            _id: 1,
                            name: 1,
                            channel: 1,
                            region: 1,
                            gps: 1,
                            authorizedUsers: 1,
                            approved: 1,
                            enabled: 1
                        },
                        survey: {
                            _id: 1,
                            date: 1,
                            survey_added_at: 1,
                            questions: include_survey_questions ? 1 : undefined,
                            pocs: include_survey_questions ? 1 : undefined,
                            approved: 1,
                            disapproval_reason: 1
                        },
                        autoAssign: 1,
                        autoAssignExpiresAt: 1
                    },
                },
            ];
            if (req.body.q && typeof req.body.q === 'string') {
                const storeMatcher = AssignmentService.filterStores(req.body);
                countMatcher = [
                    { $match: countMatcher }, ...storeLookup,
                    { $match: storeMatcher }, { $group: { _id: null, count: { $sum: 1 } } }
                ];
                aggregate = [...aggregate, ...storeLookup, { $match: storeMatcher },
                ...sortAndLimit, ...otherLookupAndProject];
            } else {
                countMatcher = [
                    { $match: countMatcher }, { $group: { _id: null, count: { $sum: 1 } } }
                ];
                aggregate = [...aggregate, ...sortAndLimit, ...storeLookup, ...otherLookupAndProject];
            }
            // Get the assignments and total (for pagination)
            let assignments = await UserAssignment(req.companyConnection).aggregate(aggregate);
            let totalAssignments = await UserAssignment(req.companyConnection).aggregate(countMatcher);
            totalAssignments = (totalAssignments &&
                totalAssignments.length && totalAssignments[0].count) ? totalAssignments[0].count : 0;
            // Get the user ids for each (in order to add more data)
            // Because we have users in different db, so can't lookup
            // We also need to check if the assignment has been completed, so note storeIds
            const userIds = [];
            const storeIds = [];

            assignments.forEach((x) => {
                userIds.push(x.user_id);
                userIds.push(x.assigned_by);
                storeIds.push(x.store._id);
            });

            // Get the users, stores and map them to the assignments
            const users = await User.find({ _id: { $in: userIds } }, { _id: 1, name: 1 }).lean();

            assignments = assignments.map((x) => {
                x.user = _.find(users, { _id: x.user_id });
                x.assigned_by = _.find(users, { _id: x.assigned_by });
                const expireDate = dayjs(x.expires_at);
                x.expires_at = expireDate.format('YYYYMMDD');

                const startDate = dayjs(x.starts_at);
                x.starts_at = startDate.format('YYYYMMDD');

                if (x.survey && x.survey._id) {
                    x.completed = true;
                } else {
                    delete x.survey;
                    x.completed = false;
                }
                delete x.user_id;
                return x;
            });

            const paginate = PaginateService(totalAssignments, assignments.length, per_page, page);

            return ResponseService.success(res, { assignments, paginate });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async listStoreAssignmentsInPeriod(req: Request, res: Response) {
        const M = `${S}[listStoreAssignmentsInPeriod]`;
        try {
            const {
                page, per_page
            } = req.body;

            const bodyData = matchedData(req, { locations: ["body"] });
            // @ts-ignore
            bodyData.starts_at = dayjs(String(bodyData.starts_at)).$d;
            // @ts-ignore
            bodyData.expires_at = dayjs(String(bodyData.expires_at)).$d;
            const data = await AssignmentService.listStoreAssignmentsInPeriod({
                filters: bodyData.filters,
                starts_at: bodyData.starts_at,
                expires_at: bodyData.expires_at,
                paginate: { page, per_page }
            }, req.companyConnection);
            return ResponseService.success(res, data, "Assignments fetched successfully");
        } catch (error) {
            if (error && error.name === "CastError") {
                logger.error(M, error.message);
                return ResponseService.validationError(res, [
                    { path: 'date', msg: "Invalid date" }
                ]);
            }
            logger.error(M, error);
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async create(req: Request, res: Response) {
        const { user } = req;
        const { surveys } = req.body;

        if (!surveys || (surveys && surveys.length === 0)) {
            return ResponseService.validationError(res, [
                { path: "surveys", message: "Surveys is required" },
            ]);
        }

        const data = [];
        for (const survey of surveys) {
            const { user_id, store_id, expires_at, starts_at, autoAssign, is_editable } = survey;
            const repeat = Number(survey.repeat) || 30;
            let { autoAssignExpiresAt } = survey;
            const sixMonthLater = new Date();
            sixMonthLater.setMonth(sixMonthLater.getMonth() + 6);
            // @ts-ignore
            autoAssignExpiresAt = autoAssignExpiresAt ? dayjs(String(autoAssignExpiresAt)).$d : sixMonthLater;
            if (!user_id || !store_id || !expires_at) {
                return;
            }
            const dayjsExpireDate = dayjs(String(expires_at));
            const dayjsStartDate = dayjs(String(starts_at));
            // @ts-ignore
            const startDate = new Date(dayjsStartDate.$d);
            // @ts-ignore
            const expireDate = new Date(dayjsExpireDate.$d);

            if (startDate > expireDate) {
                return ResponseService.validationError(res, [
                    { path: "starts_at", msg: "Should be less than expire date" },
                    { path: "expires_at", msg: "Should be greater than start date" }
                ]);
            }
            if (expireDate > autoAssignExpiresAt) {
                return ResponseService.validationError(res, [
                    { path: "expires_at", msg: "Should be less than auto expire" }
                ]);
            }

            const isAssignmentExists = await AssignmentService.isAssignmentExists({
                store_id,
                // @ts-ignore
                starts_at: startDate,
                // @ts-ignore
                expires_at: expireDate
            }, req.companyConnection);

            if (isAssignmentExists) {
                continue;
            }
            data.push({
                user_id,
                store_id,
                autoAssign,
                repeat,
                // @ts-ignore
                autoAssignExpiresAt,
                assigned_by: user._id,
                // @ts-ignore
                expires_at: expireDate,
                // @ts-ignore
                starts_at: startDate,
                is_editable: Boolean(is_editable) || false,
                expiry_month: Number(dayjs(dayjsExpireDate).format("YYYYMM")),
            });
        }

        try {
            await UserAssignment(req.companyConnection).insertMany(data, { ordered: false, rawResult: true });
            return ResponseService.success(res, null, "Surveys assigned to the users.");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async update(req: Request, res: Response) {
        try {
            const { store_id, user_id, expires_at, starts_at, autoAssign, autoAssignExpiresAt, is_editable } = req.body;
            const update: any = {};
            if (store_id) {
                update.store_id = store_id;
            }
            if (user_id) {
                update.user_id = user_id;
            }

            if (typeof autoAssign === 'boolean') {
                update.autoAssign = autoAssign;
            }
            if (autoAssignExpiresAt) {
                // @ts-ignore
                update.autoAssignExpiresAt = dayjs(String(autoAssignExpiresAt)).$d;
            }
            if (expires_at && starts_at) {
                const expireDate = dayjs(String(expires_at));
                const startDate = dayjs(String(starts_at));
                const isAssignmentExists = await UserAssignment(req.companyConnection).findOne({
                    _id: { $ne: req.params.id },
                    store_id,
                    $or: [
                        {
                            // @ts-ignore
                            starts_at: { $gte: new Date(startDate.$d), $lte: new Date(expireDate.$d) }
                        },
                        {
                            // @ts-ignore
                            expires_at: { $gte: new Date(startDate.$d), $lte: new Date(expireDate.$d) }
                        }
                    ]
                });
                if (isAssignmentExists) {
                    return ResponseService.error(res, 'An assignment already exists for this user.');
                }
                // @ts-ignore
                update.expires_at = new Date(expireDate.$d);
                update.expiry_month = Number(dayjs(String(expires_at)).format("YYYYMM"));
            }
            if (is_editable) {
                update.is_editable = Boolean(is_editable);
            }
            await UserAssignment(req.companyConnection).findOneAndUpdate(
                { _id: req.params.id },
                { $set: update },
            );
            return ResponseService.success(res, null, "Survey updated.");
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async delete(req: Request, res: Response) {
        try {
            const assignment = await UserAssignment(req.companyConnection).findById(req.params.id);
            if (!assignment) {
                return ResponseService.notFoundError(res, "Assignment does not exist.");
            }

            if (assignment.survey_id) {
                return ResponseService.error(res, "Assignment has been surveyed and can not be deleted.");
            }

            await UserAssignment(req.companyConnection).findByIdAndRemove(req.params.id);
            return ResponseService.success(res, null, "Assignment deleted.");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
