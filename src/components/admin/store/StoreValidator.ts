const { checkSchema } = require("express-validator/check");

import * as _ from "lodash";

export const companyRequired = checkSchema({
    company_id: {
        in: ["query"],
        isMongoId: true,
        custom: {
            options: (value, { req }) => {
                if (!req.company) {
                    const error: any = new Error("Company not found");
                    error.Unauthorized = true;
                    throw error;
                }
                return true;
            },
        },
    },
});

export const create = checkSchema({
    questions: {
        in: ["body"],
        custom: {
            options: (storeQuestions, { req }) => {
                const company = req.company;
                const companyQuestions = company.questions;
                const storeFields = [
                    { key: "name", type: _.isString, msg: 'Invalid store name', valid: true },
                    { key: "region", type: _.isObject, msg: 'Region name should be an entry from lists', valid: true },
                    {
                        key: "sub_region", type: _.isObject, msg: 'Sub Region name should be an entry from lists',
                        valid: true
                    },
                    {
                        key: "channel", type: _.isObject, msg: 'channel name should be an entry from lists',
                        valid: true
                    },
                    {
                        key: "sub_channel", type: _.isObject, msg: 'Sub channel name should be an entry from list',
                        valid: true
                    }
                ];
                storeQuestions.forEach((storeQuestion) => {
                    const question: any = _.find(companyQuestions, { id: storeQuestion.id });
                    if (question && question.is_store && question.mapped_to) {
                        // map[question.mapped_to.key] = storeQuestion.answer;
                        const fieldIndex = _.findIndex(storeFields, { key: question.mapped_to.key });
                        if (fieldIndex > -1 && !storeFields[fieldIndex].type(storeQuestion.answer)) {
                            storeFields[fieldIndex].valid = false;
                        }
                    }
                });
                for (const field of storeFields) {
                    if (!field.valid) {
                        throw new Error(field.msg);
                    }
                }
                return true;
            },
        },
    },
});

export const update = checkSchema({
    questions: {
        in: ["body"],
        optional: true
    },
    enabled: {
        in: ["body"],
        optional: true
    },
    approved: {
        in: ["body"],
        optional: true
    },
    disapproval_reason: {
        in: ["body"],
        optional: true,
        trim: true
    },
    authorizedUsers: {
        in: ["body"],
        optional: true,
        customSanitizer: {
            options: (value, { req }) => {
                let authorizedUsers;
                if (value && _.isArray(value)) {
                    authorizedUsers = [];
                    const company = req.company;
                    company.admins = company.admins || [];
                    company.viewers = company.viewers || [];
                    company.auditors = company.auditors || [];
                    const userIds = [...company.admins, ...company.viewers, ...company.auditors];
                    for (const userId of value) {
                        if (userIds.includes(userId)) {
                            authorizedUsers.push(userId);
                        }
                    }
                }
                return authorizedUsers;
            },
        }
    },
});
