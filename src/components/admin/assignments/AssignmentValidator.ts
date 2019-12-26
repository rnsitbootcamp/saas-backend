const { checkSchema } = require("express-validator/check");
import * as _ from "lodash";

export const listStoreAssignmentsInPeriod = checkSchema({
    filters: {
        in: ["body"],
        optional: true
    },
    starts_at: {
        in: ["body"],
        exists: true
    },
    expires_at: {
        in: ["body"],
        exists: true
    }
});
