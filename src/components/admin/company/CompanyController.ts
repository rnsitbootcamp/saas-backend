import { Request, Response } from "express";
import * as _ from "lodash";

import Company from "../../../models/Company";
import User from "../../../models/User";

import MockData from "../../../services/CompanyDataGeneratorService";
import Defaults from "../../../services/DefaultDataService";
import FileService from "../../../services/FileService";
import logger from "../../../services/LoggerService";
import ResponseService from "../../../services/ResponseService";

import CompanyDefaults from "./CompanyDefaults";
import CompanyService from "./CompanyService";

const S = "[companyController]";
export default class CompanyController {
    public static async index(req: Request, res: Response) {
        const M = `${S}[index]`;
        const user = req.user._id;
        const companies = await Company.find({
            $or: [{ admins: user }, { viewers: user }, { auditors: user }],
        }).populate({ path: "logo", select: ["_id", "key", "bucket", "name", "contentType"] });
        const data = [];
        logger.debug(M, user);
        companies.forEach((company: any) => {
            data.push({
                _id: company._id,
                name: company.name,
                name_slug: company.name_slug,
                logo: FileService.map(company.logo),
                is_re: company.is_re || false,
                is_ra: company.is_ra || false,
                admin: company.admins.indexOf(user) !== -1,
                auditor: company.auditors.indexOf(user) !== -1,
                viewer: company.viewers.indexOf(user) !== -1,
                created: company.created,
            });
        });
        return res.status(200).json({ error: false, data });
    }

    public static async store(req: Request, res: Response) {
        const M = `${S}[store]`;
        const { name, type } = req.body;
        if (!name) {
            return ResponseService.validationError(res, [
                { path: "name", message: "Company name is required." },
            ]);
        }
        const defaultFields = new CompanyDefaults();
        try {
            const company: any = await Company.create({
                name,
                type: type && type.title ? type.title : (type || "Others"),
                admins: [req.user._id],
                list: defaultFields.get("list"),
                pocs: defaultFields.get("pocs")
            });
            const noOfCompanies = await Company.countDocuments({
                $or: [{ admins: req.user._id }, { viewers: req.user._id }, { auditors: req.user._id }]
            });
            if (noOfCompanies === 1) {
                await User.findByIdAndUpdate(req.user._id, {
                    $set: {
                        preferredCompany: company._id
                    }
                });
            }
            try {
                const Default = new Defaults();
                await Default.init("default");
                const m = new MockData(company, Default);
                const result: any = await m.init();
                await Company.findByIdAndUpdate(company._id, result);
            } catch (error) {
                logger.error(M, "Setting company templates error");
            }
            return res.status(200).json(
                {
                    error: false,
                    data: company,
                    message: "Company added successfully.",
                }
            );
        } catch (e) {
            ResponseService.serverError(req, res, e, "Unexpected Error Occurred.");
        }
    }

    public static async show(req: Request, res: Response) {
        const userId = req.user._id;
        const companyId = req.params.id;
        let select: string[] = (req.query.select || "").split(",");
        select = select.filter((x) => x);
        select = select.map((x) => x.trim());
        if (select && select.length) {
            select.push("_id", "logo", "name", "is_re", "is_ra",
                "isAdmin", "isAuditor", "isViewer", "created", "packages",
                "categories", "regions", "pocs", "groups");
        }
        const company: any = await Company.findOne({
            _id: companyId,
            $or: [{ admins: userId }, { viewers: userId }, { auditors: userId }],
        }).populate({ path: "logo", select: ["_id", "key", "bucket", "name", "contentType"] });

        if (!company) {
            return ResponseService.notFoundError(res, "Company does not exits.");
        }
        const data: any = {
            _id: company._id,
            logo: FileService.map(company.logo),
            name: company.name,
            is_re: company.is_re || false,
            is_ra: company.is_ra || false,
            isAdmin: (company.admins || []).indexOf(userId) !== -1,
            isAuditor: (company.auditors || []).indexOf(userId) !== -1,
            isViewer: (company.viewers || []).indexOf(userId) !== -1,
            list: company.list || [],
            questions: company.questions || [],
            question_groups: company.question_groups || [],
            created: company.created,
            kpis: company.kpis || [],
            skus: company.skus || [],
            features: company.features || [],
            packages: company.packages || {},
            brands: company.brands || {},
            categories: company.categories || [],
            regions: company.regions || [],
            pocs: company.pocs || {},
        };
        if (select && select.length) {
            for (const key in data) {
                if (!select.includes(key)) {
                    delete data[key];
                }
            }
        }
        return res.status(200).json({ error: false, data });
    }

    public static async update(req: Request, res: Response) {
        const M = `${S}[update]`;
        const {
            name, questions, logo,
            question_groups, is_ra, is_re,
            kpis, skus, features, packages,
            brands, categories, regions, pocs, type
        } = req.body;
        const list = req.body.list || req.body.lists;
        const CompanyHandler = new CompanyService();
        if (req.body) {
            CompanyHandler.validateData(req.body, is_ra, is_re);
        }
        if (questions) {
            CompanyHandler.validateForUniqueTitleAndId(questions, "questions");
        }
        if (list) {
            CompanyHandler.validateForUniqueTitleAndId(list, "list");
        }
        if (question_groups) {
            CompanyHandler.validateForUniqueTitleAndId(question_groups, "question_groups");
        }
        if (CompanyHandler.errors.length > 0) {
            const errors = CompanyHandler.errors;
            CompanyHandler.errors = [];
            return ResponseService.validationError(res, errors);
        }

        const updatableParams = {
            name,
            kpis,
            skus,
            pocs,
            features,
            brands,
            packages,
            categories,
            regions,
            list,
            question_groups,
            questions: questions ? questions.map((question) => {
                // Attached list
                if (question.attached_list_id) {
                    question.attached_list = _.find(list, { id: question.attached_list_id });
                }
                // Dependency List
                if (question.dependency_list_id) {
                    question.dependency_list = _.find(list, { id: question.dependency_list_id });
                }
                // Group
                if (question.group_id) {
                    question.group = _.find(list, { id: question.group_id });
                }
                return question;
            }) : null,
            logo,
            is_ra,
            is_re,
            type
        };

        try {
            const company: any = await Company.findOne({ _id: req.params.id, admins: req.user._id });
            if (!company) {
                return ResponseService.notFoundError(res, 'Company not fond!');
            }
            try {
                // Save the old data
                const dataVersion = {};
                _.forEach(updatableParams, (v, k) => {
                    if (v || v === false) {
                        dataVersion[k] = company[k];
                        company[k] = v;
                    }
                });
                // const dataVersions = JSON.parse(JSON.stringify(company.data_versions));
                // dataVersions.push(dataVersion);
                company.data_versions = [];
            } catch (error) {
                logger.error(M, 'Error in creating data version', error);
            }
            await company.save();

            const updatedCompany = await Company.findOne(
                { _id: req.params.id, admins: req.user._id }, ["-data_versions"]);

            return ResponseService.success(res, updatedCompany, "Company updated successfully");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
    // private static async getSkus(req , res){

    // }
    public static async getTemplateForCompany(req, res) {
        try {
            const { type } = req.company;
            if (!type) {
                return ResponseService.error(res, "Company type missing. Please update company type", 400);
            }
            const Default = new Defaults();
            await Default.init("default");
            const m = new MockData(req.company, Default);
            const result: any = await m.init();
            return ResponseService.success(res, [result], 'Company templates');
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async getCompanyTypes(req, res) {
        try {
            const Default = new Defaults();
            await Default.init("default");
            const data = Object.keys(Default.Questionnaires);
            const companyTypes = [];
            data.forEach((item, index) => {
                companyTypes.push({
                    id: index + 1,
                    title: item
                });
            });
            return ResponseService.success(res, companyTypes, 'Company types');
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }
    public static async getSkus(req, res) {
        const {barCode , title} = req.query;
        const {skus}  = req.company;
        if (!barCode && !title) {
            return res.status(422).json({status : 501 ,
                 error: true,
                 message : 'Please send bardCode or title in Query' 
                }
                );
        } else if (!skus || skus.length <= 0  ) {
            return res.status(422).json({status : 501 ,
                error: true,
                message : 'There is no skus corresponding to this comapny'
            }
            );
        }
        try {
            const skusData = _.filter(skus , (data: any) => {
              return  title ? data.title === title :
                       data.barCode === barCode;
            });
            res.status(200).json({ error: false, data:  skusData});
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
