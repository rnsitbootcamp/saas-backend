import * as mongoose from "mongoose";

const file = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: { type: String, required: true },
    key: { type: String, unique: true },
    contentType: {
        type: String,
        required: true
    },
    bucket: { type: String },
    variants: { type: Array },
    size: {type: Number}
}, {
        timestamps: true,
        versionKey: false,
    }
);

file.index({ company: 1, name: 1 }, { unique: true });

export default mongoose.model("File", file);
