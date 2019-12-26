import { Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import * as _ from "lodash";
import Tracking from "../../../events/Tracking";
import Company from "../../../models/Company";
import User from "../../../models/User";
import FileService from "../../../services/FileService";
import ResponseService from "../../../services/ResponseService";
import S3Service from "../../../services/S3Service";

export default class ProfileController {
    public static async me(req: Request, res: Response) {
        const aggregate = [
            {
                $match: {
                    _id: req.user._id,
                },
            },
            {
                $lookup: {
                    localField: "preferredCompany",
                    foreignField: "_id",
                    from: "companies",
                    as: "preferredCompany",
                },
            },
            { $unwind: { path: "$preferredCompany", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    localField: "preferredCompany.logo",
                    foreignField: "_id",
                    from: "files",
                    as: "preferredCompany.logo",
                },
            },
            {
                $lookup: {
                    localField: "avatar",
                    foreignField: "_id",
                    from: "files",
                    as: "avatar",
                },
            },
            { $unwind: { path: "$preferredCompany.logo", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                    avatar: 1,
                    telephone: 1,
                    cellphone: 1,
                    fax: 1,
                    company: 1,
                    designation: 1,
                    address: 1,
                    country: 1,
                    state: 1,
                    city: 1,
                    street: 1,
                    zip_code: 1,
                    contact: 1,
                    country_code: 1,
                    loginAt: 1,
                    approved: 1,
                    verified: 1,
                    preferredCompany: {
                        _id: 1, name: 1, logo: 1, name_slug: 1
                    },
                },
            },
        ];
        const me = await User.aggregate(aggregate);
        const data = me[0];
        if (data.avatar) {
            data.avatar = S3Service.getUrl(data.avatar.key, data.avatar.bucket);
        }

        if (data.preferredCompany.logo) {
            data.preferredCompany.logo = S3Service.getUrl(
                data.preferredCompany.logo.key,
                data.preferredCompany.logo.bucket,
            );
        }

        // Preferred company needs correction
        // If user has preferred company
        // Preferred company flags
        let company: any = await Company.findById(req.user.preferredCompany).lean();
        company = JSON.parse(JSON.stringify(company));

        company = company || req.company;

        if (company) {
            company.admins = company.admins || [];
            company.viewers = company.viewers || [];
            company.auditors = company.auditors || [];
            if (data.preferredCompany) {
                data.preferredCompany.is_re = company.is_re || false;
                data.preferredCompany.is_ra = company.is_ra || false;
                data.preferredCompany.isAdmin = false;
                data.preferredCompany.isAuditor = false;
                data.preferredCompany.isViewer = false;
            }
            if (company.admins.indexOf(String(req.user._id)) > -1) {
                data.preferredCompany.isAdmin = true;
            }
            if (company.viewers.indexOf(String(req.user._id)) > -1) {
                data.preferredCompany.isViewer = true;
            }
            if (company.auditors.indexOf(String(req.user._id)) > -1) {
                data.preferredCompany.isAuditor = true;
            }
        }

        return res.status(200).json({ error: false, data });
    }

    public static async preferredCompany(req: Request, res: Response) {
        Tracking.log({
            data: req.body,
            type: "user.updatePreferred",
            message: "Updating user preferred company",
            user: req.user._id,
            company: req.body.company_id,
        });
        if (!req.body.company_id) {
            return ResponseService.validationError(res, [
                { path: "company_id", message: "The preferred company is required." },
            ]);
        }
        await User.findOneAndUpdate(
            { _id: req.user._id },
            { $set: { preferredCompany: req.body.company_id } },
        );
        return ResponseService.success(res, null, "Preferred company updated.");
    }

    public static async update(req: Request, res: Response) {
        try {
            const userId = req.user._id;
            const bodyData = matchedData(req, { locations: ["body"] });
            const unset: any = {};
            for (const key in bodyData) {
                if (bodyData[key] === "") {
                    unset[key] = bodyData[key];
                    delete bodyData[key];
                }
            }
            const update: any = {
                $set: bodyData
            };
            if (!_.isEmpty(unset)) {
                update.$unset = unset;
            }
            await User.findOneAndUpdate({ _id: userId },
                update,
            );
            return ResponseService.success(res, null, "Profile updated.");
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async companies(req: Request, res: Response) {
        let userId = req.user._id;
        try {
            const aggregate = [
                {
                    $match: {
                        $or: [
                            { admins: userId },
                            { viewers: userId },
                            { auditors: userId },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "files",
                        localField: "logo",
                        foreignField: "_id",
                        as: "logo",
                    },
                },
                {
                    $unwind: {
                        path: "$logo",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        admins: 1,
                        viewers: 1,
                        auditors: 1,
                        logo: 1,
                        is_re: 1,
                        is_ra: 1
                    },
                },
            ];
            let companies = await Company.aggregate(aggregate);
            companies = JSON.parse(JSON.stringify(companies));

            userId = String(userId);
            companies = companies.map((x) => {
                x.is_re = x.is_re || false;
                x.is_ra = x.is_ra || false;
                x.logo = FileService.map(x.logo);
                x.isAdmin = x.admins ? x.admins.indexOf(userId) > -1 : false;
                x.isViewer = x.viewers ? x.viewers.indexOf(userId) > -1 : false;
                x.isAuditor = x.auditors ? x.auditors.indexOf(userId) > -1 : false;
                delete x.admins;
                delete x.viewers;
                delete x.auditors;
                return x;
            });

            return ResponseService.success(res, companies);
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
