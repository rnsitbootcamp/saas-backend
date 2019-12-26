const { checkSchema } = require("express-validator/check");

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
    email: {
        in: ["body"],
        isEmail: true,
        exists: true,
    },
    userType: {
        exists: true,
        isIn: {
            options: [["admins", "auditors", "viewers"]],
        },
    },
});

export const checkUserExistsInCompany = checkSchema({
    id: {
        in: ["params"],
        isMongoId: true,
        custom: {
            options: (value, { req }) => {
                const company = req.company;
                company.admins = company.admins || [];
                company.viewers = company.viewers || [];
                company.auditors = company.auditors || [];
                const userIds = [...company.admins, ...company.viewers, ...company.auditors];
                if (!userIds.includes(value)) {
                    const error: any = new Error("User not found in your company");
                    error.Unauthorized = true;
                    throw error;
                }
                return true;
            },
        },
    },
});
