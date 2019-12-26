import * as bluebird from "bluebird";
import * as dayjs from "dayjs";
import { Request } from "express";
import * as _ from "lodash";
import File from "../../../models/File";

import Store from "../../../models/Store";
import UserAssignment from "../../../models/UserAssignment";
import FileService from "../../../services/FileService";
import PaginateService from "../../../services/PaginateService";
import S3Service from "../../../services/S3Service";
import UserService from "../user/UserService";


export default class StoreService {

    public static async getStoresPaginated(req: Request) {
        const $match = StoreService.getFinder(req.body);

        const { page, per_page, include_assignable_info } = req.body;
        const sortBy = req.body.sort_by || 'name';
        const sortOrder = req.body.sort_order || 1;

        const aggregate = [
            { $match },
            { $sort: { [sortBy]: sortOrder } },
            { $skip: per_page * (page - 1) },
            { $limit: per_page },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    channel: 1,
                    sub_channel: 1,
                    region: 1,
                    sub_region: 1,
                    contact: 1,
                    addedBy: 1,
                    approved: 1,
                    disapproval_reason: 1,
                    lastUpdatedBy: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    image: 1,
                    authorizedUsers: 1
                },
            },
        ];
        let stores = await Store(req.companyConnection).aggregate(aggregate);
        const images = await StoreService.getImagesForStores(stores);
        const involvedUserIds = stores.reduce((a, c) => {
            if (!a.includes(c.addedBy) && c.addedBy) { a.push(c.addedBy); }
            if (!a.includes(c.lastUpdatedBy) && c.lastUpdatedBy) { a.push(c.lastUpdatedBy); }
            return a;
        }, []);
        const involvedUsers: any = await UserService.getUsersByIds(involvedUserIds);
        const curDate = new Date();
        const curMonth = Number(String(curDate.getFullYear()) + String(curDate.getMonth()));
        if (include_assignable_info) {
            for (const store of stores) {
                store.assignable_info = [];
                continue;
                store.assignable_info = await UserAssignment(req.companyConnection).find(
                    { store_id: store._id, expiry_month: { $gt: curMonth } }, "expires_at"
                );
                store.assignable_info = store.assignable_info.map((x) => Number(
                    dayjs(String(x.expires_at)).format("YYYYMMDD")));
            }
        }

        // Map the stores to delete questions, add images
        stores = stores.map((store) => {
            store.lastUpdatedBy = _.find(involvedUsers, { _id: store.lastUpdatedBy });
            store.addedBy = _.find(involvedUsers, { _id: store.addedBy });
            store.image = store.image || [];
            if (!_.isArray(store.image)) { store.image = []; }
            store.image = store.image.map((name) => images[name]);
            store.image = store.image.filter((x) => x);
            return store;
        });

        const count = await Store(req.companyConnection).countDocuments($match);
        const paginate = PaginateService(count, stores.length, per_page, page);
        return { stores, paginate };
    }

    public static async getStore(req: Request) {
        const store = await Store(req.companyConnection)
            .findById(req.params.id)
            .populate({ path: "image", model: File })
            .lean();

        if (!store) {
            return false;
        }

        // User (addedBy and lastUpdatedBy)
        const userIds = [store.lastUpdatedBy, store.addedBy];
        const users: any = await UserService.getUsersByIds(userIds);

        store.lastUpdatedBy = users.find((x) => x._id === store.lastUpdatedBy);
        store.addedBy = users.find((x) => x._id === store.addedBy);
        store.image = (store.image || []).map((x) => {
            return FileService.map(x);
        });
        return store;
    }

    public static async mapQuestions(storeQuestions, companyQuestions) {
        const map = {};
        for (const storeQuestion of storeQuestions) {
            const question: any = _.find(companyQuestions, { id: storeQuestion.id });
            if (question && question.is_store && question.mapped_to) {
                if ([
                    "region", "sub_region", "channel", "sub_channel"
                ].includes(question.mapped_to.key)) {
                    map[question.mapped_to.key] = {
                        id: storeQuestion.answer.id,
                        title: storeQuestion.answer.title
                    };
                } else {
                    map[question.mapped_to.key] = storeQuestion.answer;
                }
                if (storeQuestion.type === "file" && question.mapped_to.key === "image") {
                    const result = await bluebird.map(map[question.mapped_to.key], async (file) => {
                        if (!file) { return null; }
                        const query: any = [{ name: file }, { key: file }];
                        if (file.length === 12 || file.length === 24) {
                            query.unshift({ _id: file });
                        }
                        const fileResult = await File.findOne({
                            $or: query,
                        });
                        if (fileResult) { return fileResult._id; }
                        return null;
                    });
                    map[question.mapped_to.key] = result.filter((x) => x);
                }
            }
        }
        return map;
    }
    // $match object based on the input filters
    private static getFinder(body) {
        const $match: any = {
            deleted: false,
        };

        const {
            _id,
            q,
            disapproval_reason,
            email,
            region,
            sub_region,
            channel,
            sub_channel,
            name,
            address,
            addedBy,
            lastUpdatedBy,
            include_deleted,
            approved,
        } = body;

        if (typeof (approved) === "boolean") {
            $match.approved = approved;
        }

        const matchParams = { _id, addedBy, lastUpdatedBy };
        const idParams = { region, sub_region, channel, sub_channel };
        const regExParams = { name, address, email, disapproval_reason };

        _.forEach(matchParams, (v, k) => {
            if (v) {
                $match[k] = v;
            }
        });

        _.forEach(idParams, (v, k) => {
            if (v) {
                $match[`${k}.id`] = v;
            }
        });

        _.forEach(regExParams, (v, k) => {
            if (v) {
                $match[k] = new RegExp(v, "ig");
            }
        });

        // Master search on all text fields
        if (q) {
            $match.$or = _.map(regExParams, (v, k) => {
                return { [k]: new RegExp(q, "ig") };
            });
            _.forEach(idParams, (v, k) => {
                if (k) {
                    $match.$or.push({ [`${k}.title`]: new RegExp(q, "ig") });
                }
            });
        }

        if (include_deleted) {
            $match.deleted = true;
        }

        return $match;
    }

    // Return the object of images for list of stores
    // The key of the list corresponds to the image name and the value to URL
    private static async getImagesForStores(stores) {
        let storeImageNames = [];
        // Get the storeImageNames
        stores.forEach((x) => {
            storeImageNames = storeImageNames.concat(x.image);
        });
        // Filter for undefined or null
        storeImageNames = storeImageNames.filter((x) => x);
        const images = {};
        const imageFiles: any = await File.find({ name: { $in: storeImageNames } }).lean();
        imageFiles.forEach((x) => {

            images[x.name] = S3Service.getUrl(x.key, x.bucket);
        });

        return images;
    }
}
