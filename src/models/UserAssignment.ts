import * as mongoose from "mongoose";
const collection = "user_assignments";
const template = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        store_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },
        assigned_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        expires_at: {
            type: Date,
            required: true,
        },
        starts_at: {
            type: Date,
            required: true
        },
        expiry_month: {
            type: Number,
            required: true,
        },
        survey_date: {
            type: Date,
        },
        survey_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Survey",
            required: false,
        },
        is_editable: {
            type: Boolean,
            default: false,
        },
        offline: {
            type: Boolean,
            default: false,
        },
        autoAssign: {
            type: Boolean,
            default: false
        },
        autoAssignExpiresAt: {
            type: Date
        },
        repeat: {
            type: Number
        }
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// template.index({ expiry_month: 1, store_id: 1 }, { unique: true });

export default function UserAssignment(connection) {
    if (connection) {
        return connection.model("UserSurvey", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
