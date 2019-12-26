import * as bcrypt from "bcrypt-nodejs";
import { NextFunction } from "express";
import * as mongoose from "mongoose";

import logger from "../services/LoggerService";

const S = `[models/User.ts]`;

const user = new mongoose.Schema({
    name: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },

    avatar: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
    },
    preferredCompany: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
    },
    country_code: String,
    contact: String,
    telephone: String, // Should deprecate in future
    cellphone: String, // Should deprecate in future
    fax: String,
    company: String,
    designation: String,

    address: String,
    country: String,
    state: String,
    city: String,
    street: String,
    zip_code: Number,
    approved: { type: Boolean, default: 1 },
    verified: { type: Boolean, default: 0 },
    verify_token: String,
    reset_token: String,
    reset_token_expiry: Number,
    loginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
    push_token: {type: String}
}, {
        timestamps: true,
    }
);

user.index(
    { country_code: 1, contact: 1 },
    { unique: true, partialFilterExpression: { country_code: { $type: "string" }, contact: { $type: "string" } } }
);

function findNotDeletedMiddleware(next: NextFunction) {
    this.where({ deleted: { $ne: true } });
    next();
}

user.pre("find", findNotDeletedMiddleware);
user.pre("findOne", findNotDeletedMiddleware);

/**
 * Password hash middleware.
 */
user.pre("save", function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    // @ts-ignore
    this.password = this.createPassword(this.password);
    next();
});

/**
 * Helper method for validating user's password.
 */
user.methods.comparePassword = function(password) {
    const M = `${S}[comparePassword]`;
    try {
        return bcrypt.compareSync(password, this.password);
    } catch (error) {
        logger.error(M, error);
        error = new Error("Please reset password.");
        error.code = "noPassword";
        throw error;
    }
};

user.methods.createPassword = (password) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
};

export default mongoose.model("User", user);
