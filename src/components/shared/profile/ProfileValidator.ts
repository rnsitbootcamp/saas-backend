const { checkSchema } = require("express-validator/check");
import File from "../../../models/File";
/*
name,
      first_name,
      last_name,
      telephone: String,
      cellphone: String,
      fax: String,
      company: String,
      designation: String,

      address: String,
      country: String,
      state: String,
      city: String,
      street: String,
      zip_code: Number,
*/
export const update = checkSchema({
    name: {
        in: ["body"],
        trim: true,
        optional: true,
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
    contact: {
        in: ["body"],
        isMobilePhone: true,
        optional: true,
    },
    country_code: {
        in: ["body"],
        optional: true,
    },
    telephone: {
        in: ["body"],
        optional: true,
    },
    cellphone: {
        in: ["body"],
        isMobilePhone: true,
        optional: true,
    },
    fax: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    company: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    designation: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    address: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    street: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    country: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    state: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    city: {
        in: ["body"],
        optional: true,
        trim: true,
    },
    zip_code: {
        in: ["body"],
        optional: true
    },
    avatar: {
        in: ["body"],
        optional: true,
        isMongoId: true,
        custom: {
            options: (value) => {
                if (!value) { return true; }
                return new Promise(async (resolve, reject) => {
                    try {
                        const avatar = await File.findOne({ _id: value });
                        if (avatar) { return resolve(); }
                        return reject("File not exists");
                    } catch (error) {
                        return resolve(false);
                    }
                });
            },
        },
    },
});
