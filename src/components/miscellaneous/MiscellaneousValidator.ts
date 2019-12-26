import { checkSchema } from "express-validator/check";
import * as UserActivity from "../../models/UserActivity";

export const savePushToken = checkSchema({
    push_token: {
        in: ["body"],
        trim: true,
        exists: true,
    },
    type: {
        in: ["body"],
        trim: true,
        optional: true,
        customSanitizer: {
            options: (value) => {
                const allowedValues = ["expo"];
                if (allowedValues.includes(value)) {
                    return value;
                }
                return allowedValues[0];
            }
        }
    }
});

export const saveUserActivity = checkSchema({
    activities: {
        in: ["body"],
        isArray: true,
        exists: true,
    }
});
