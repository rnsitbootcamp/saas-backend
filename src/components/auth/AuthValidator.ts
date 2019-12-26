import { body, checkSchema } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";
import { isNotADisposableEmail } from "../../utils/isDisposableEmail";

export const changepassword = [
    body("old_password").exists(),
    sanitizeBody("old_password"),

    // password must be at least 5 chars long
    body("password").custom((value, { req }) => {
        if (value === req.body.old_password) {
            throw new Error(`Old and New Password can't be same.`);
        }
        if (value.length < 5) {
            throw new Error(`Password length should be at least 5.`);
        }
        return true;
    }),
    sanitizeBody("password").trim(),
    body("password_confirmation").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error(`Password and password confirmation should be same`);
        }
        return true;
    }),
];

export const login = checkSchema({
    email: {
        in: ["body"],
        trim: true,
        isEmail: true,
        exists: true,
    },
    password: {
        in: ["body"],
        trim: true,
        exists: true,
    },
});

export const register = checkSchema({
    email: {
        in: ["body"],
        trim: true,
        isEmail: true,
        exists: true,
        custom: {
            options: (value, { req, location, path }) => {
                return isNotADisposableEmail(value);
            }
        },
    },
    password: {
        in: ["body"],
        trim: true,
        exists: true,
        isLength: {
            errorMessage: "Password should be at least 5 chars long",
            // Multiple options would be expressed as an array
            options: { min: 5 },
        },
    },
    name: {
        in: ["body"],
        trim: true,
        exists: true,
        optional: true
    },
    first_name: {
        in: ["body"],
        trim: true,
        optional: true,
    },
    last_name: {
        in: ["body"],
        trim: true,
        optional: true,
    },
    country_code: {
        in: ["body"],
        trim: true,
        optional: true,
    },
    contact: {
        in: ["body"],
        trim: true,
        optional: true,
    },
});

export const forgot = checkSchema({
    email: {
        in: ["body"],
        trim: true,
        isEmail: true,
        exists: true,
    },
});

export const reset = checkSchema({
    _id: {
        in: ["body"],
        trim: true,
        isMongoId: true,
        exists: true,
    },
    password: {
        in: ["body"],
        trim: true,
        exists: true,
        isLength: {
            errorMessage: "Password should be at least 5 chars long",
            // Multiple options would be expressed as an array
            options: { min: 5 },
        },
    },
    password_confirmation: {
        in: ["body"],
        custom: {
            options: (value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error(`Password and password confirmation should be same`);
                }
                return true;
            },
        },
    },
    reset_token: {
        in: ["body"],
        exists: true,
    },
});

export const sendEmailVerification = checkSchema({
    email: {
        in: ["body"],
        trim: true,
        isEmail: true,
        exists: true,
    }
});

export const validateEmailVerificationCode = checkSchema({
    email: {
        in: ["body"],
        trim: true,
        isEmail: true,
        exists: true,
    },
    verificationCode: {
        in: ["body"],
        trim: true,
        exists: true,
    }
});
