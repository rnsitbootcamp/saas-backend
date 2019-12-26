import * as mongoose from "mongoose";

const S = `[models/Questionnaires.ts]`;

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
}, {
        timestamps: true,
    }
);

export default mongoose.model("User", user);
