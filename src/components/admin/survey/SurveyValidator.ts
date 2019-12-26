import { checkSchema } from "express-validator/check";

export const create = checkSchema({
    "offline": {
        in: ["body"],
        toBoolean: true
    },
    "assignment_id": {
        in: ["body"],
        exists: true,
        isMongoId: true
    },
    "questions": {
        in: ["body"],
        exists: true,
        isLength: {
            errorMessage: "Questions length should be at least 1",
            // Multiple options would be expressed as an array
            options: { min: 1 },
        },
    },
    "pocs": {
        in: ["body"]
    },
    "store_id": {
        in: ["body"],
        exists: true,
        isMongoId: true
    },
    "gps.latitude": {
        in: ["body"],
        exists: true,
        isNumeric: true
    },
    "gps.longitude": {
        in: ["body"],
        exists: true,
        isNumeric: true
    },
    "survey_added_at": {
        in: ["body"],
        exists: true
    },
    "temp_store_id": {
        in: ["body"]
    },
    "signature": {
        in: ["body"]
    },
    "startTime": {
        in: ["body"]
    },
    "endTime": {
        in: ["body"]
    }
});

export const update = checkSchema({
    questions: {
        in: ["body"],
        optional: true,
        isLength: {
            errorMessage: "Questions length should be at least 1",
            // Multiple options would be expressed as an array
            options: { min: 1 },
        },
    },
    pocs: {
        in: ["body"],
        optional: true
    },
    approved: {
        in: ["body"],
        isBoolean: true,
        optional: true
    },
    disapproval_reason: {
        in: ["body"],
        optional: true
    },
    signature: {
        in: ["body"]
    },
    id: {
        in: ["params"],
        exists: true,
        isMongoId: true
    }
});
