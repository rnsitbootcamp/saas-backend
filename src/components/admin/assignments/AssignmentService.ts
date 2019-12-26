import * as dayjs from "dayjs";
import * as _ from "lodash";
import { Types } from "mongoose";
import User from "../../../models/User";
import UserAssignment from "../../../models/UserAssignment";
import logger from "../../../services/LoggerService";
import PaginateService from "../../../services/PaginateService";

const S = `[AssignmentService]`;

export default class AssignmentService {
    public static async auditorAutoAssignOnStoreCreate(
        user: { _id: any, isAuditor: boolean },
        store: { _id: any },
        connection: any
    ) {
        if (!user.isAuditor) {
            return false;
        }
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 4);
        const assignment = {
            user_id: user._id,
            store_id: store._id,
            assigned_by: user._id,
            expiresAt: expiryDate,
            startsAt: new Date(),
            is_editable: true,
            autoAssign: false
        };
        return await AssignmentService.createAssignment(assignment, connection);
    }

    public static async createAssignment(
        assignment: {
            user_id: any,
            store_id: any,
            assigned_by: any,
            expiresAt: Date,
            startsAt: Date,
            is_editable: boolean,
            autoAssign: boolean,
            autoAssignExpiresAt?: Date
        },
        connection: any) {
        const expiryMonth = Number(dayjs(assignment.expiresAt).format("YYYYMM"));

        return await UserAssignment(connection).create({
            user_id: assignment.user_id,
            store_id: assignment.store_id,
            assigned_by: assignment.assigned_by,
            expires_at: assignment.expiresAt,
            starts_at: assignment.startsAt,
            is_editable: assignment.is_editable,
            expiry_month: expiryMonth
        });
    }

    public static async addNextAutomaticAssignment(
        data: {
            assignment_id: any
        },
        connection: any) {
        const M = `${S}[addNextAutomaticAssignment]`;
        const assignment = await UserAssignment(connection).findOne({
            _id: data.assignment_id
        }).lean();

        const startDate = new Date(assignment.starts_at);
        startDate.setMonth(startDate.getMonth() + 1);

        if (!(
            assignment.autoAssign &&
            (assignment.autoAssignExpiresAt ? assignment.autoAssignExpiresAt < new Date() : true))) {
            logger.info(M,
                "autoAssignment creation Skipping reason: autoAssign not enabled or autoAssignExpireAt is expired",
                assignment.autoAssign, assignment.autoAssignExpiresAt);
            return;
        }

        const expireDate = new Date(assignment.expires_at);
        expireDate.setMonth(expireDate.getMonth() + 1);
        const isAssignmentExists = await AssignmentService.isAssignmentExists({
            store_id: assignment.store_id,
            starts_at: startDate,
            expires_at: expireDate
        }, connection);
        if (isAssignmentExists) {
            logger.info(M, "An assignment already exists in this period, isAssignmentExists: ", isAssignmentExists);
            return;
        }
        return await AssignmentService.createAssignment({
            user_id: assignment.user_id,
            store_id: assignment.store_id,
            assigned_by: assignment.assigned_by,
            expiresAt: expireDate,
            startsAt: startDate,
            is_editable: assignment.is_editable,
            autoAssign: assignment.autoAssign,
            autoAssignExpiresAt: assignment.autoAssignExpiresAt
        }, connection);
    }

    public static async isAssignmentExists(
        data: {
            store_id: any,
            starts_at: Date,
            expires_at: Date
        },
        connection: any
    ) {
        const isAssignmentExists = await UserAssignment(connection).findOne({
            store_id: data.store_id,
            $or: [
                {
                    // @ts-ignore
                    starts_at: { $gte: data.starts_at, $lte: data.expires_at }
                },
                {
                    // @ts-ignore
                    expires_at: { $gte: data.starts_at, $lte: data.expires_at }
                }
            ]
        });
        return isAssignmentExists;
    }

    public static async listStoreAssignmentsInPeriod(
        data: {
            filters?: {
                store_id?: any,
                user_id?: any
            },
            starts_at: Date,
            expires_at: Date,
            paginate: {
                page: number,
                per_page: number
            }
        },
        connection: any
    ) {
        let finder = {
            starts_at: { $gte: data.starts_at },
            expires_at: { $lte: data.expires_at },
        };
        if (data.filters) {
            if (data.filters.store_id) {
                data.filters.store_id = Types.ObjectId(data.filters.store_id);
            }
            if (data.filters.user_id) {
                data.filters.user_id = Types.ObjectId(data.filters.user_id);
            }
            finder = { ...finder, ...data.filters };
        }
        const {
            page, per_page
        } = data.paginate;
        const aggregate = [
            { $match: finder },
            { $sort: { expires_at: 1 } },
            { $skip: (page - 1) * per_page },
            { $limit: per_page },
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
                $project: {
                    _id: 1,
                    user: "$user_id",
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
                        authorizedUsers: 1
                    },
                    autoAssign: 1,
                    autoAssignExpiresAt: 1
                },
            },
        ];
        let assignments = await UserAssignment(connection).aggregate(aggregate);
        assignments = await UserAssignment(connection)
            .populate(assignments,
                [
                    { path: "user", model: User, select: { name: 1, email: 1 } },
                    { path: "assigned_by", model: User, select: { name: 1, email: 1 } },
                ]);

        const totalAssignments = await UserAssignment(connection).countDocuments(finder);
        const paginate = PaginateService(totalAssignments, assignments.length, per_page, page);
        return {
            assignments,
            paginate
        };
    }

    public static getFinder(body, user, connection) {
        const {
            store_ids, survey_ids, expires_at
        } = body;
        let { user_ids, status } = body;

        const finder: any = {};
        if (!user_ids) { user_ids = []; }
        if (expires_at) {
            finder.expires_at = { $lte: Number(expires_at) };
        }

        if (!user.isAdmin) {
            user_ids = [];
            user_ids.push(user._id);
        }

        // Should add mongo ObjectId filter in below maps
        if (user_ids && user_ids.length > 0) {
            finder.user_id = { $in: user_ids.map((x) => Types.ObjectId(x)) };
        }

        if (store_ids && store_ids.length > 0) {
            finder.store_id = { $in: store_ids.map((x) => Types.ObjectId(x)) };
        }

        if (survey_ids && survey_ids.length > 0) {
            finder.survey_id = { $in: survey_ids.map((x) => Types.ObjectId(x)) };
        }

        if (!["completed", "expired", "due"].includes(status)) {
            status = "all";
        }

        switch (status) {
            case "completed": {

                finder.survey_id = {
                    $exists: true
                };
                break;
            } case "expired": {
                finder.survey_id = {
                    $exists: false
                };
                finder.expires_at = {
                    $lte: new Date()
                };
                break;
            } case "due": {
                finder.survey_id = {
                    $exists: false
                };
                finder.expires_at = {
                    $gte: new Date()
                };
                break;
            } default:
                break;
        }

        return finder;

    }

    public static filterStores(body) {
        const { q } = body;
        const $match: any = {};
        const regExParams = [
            "store.name", "store.email",
            "store.region.title", "store.sub_region.title",
            "store.channel.title", "store.sub_channel.title"
        ];
        $match.$or = regExParams.map((k) => {
            return { [k]: new RegExp(q, "ig") };
        });
        return $match;

    }
}
