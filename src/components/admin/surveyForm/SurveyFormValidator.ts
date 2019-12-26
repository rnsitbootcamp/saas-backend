import { checkSchema } from "express-validator/check";

export const create = checkSchema({
    title: {
        in: ["body"],
        exists: true
    },
    mode: {
        in: ["body"],
        exists: true
    }
});

export const update = checkSchema({
    title: {
        in: ["body"],
        exists: true
    },
    mode: {
        in: ["body"],
        exists: true
    }
});