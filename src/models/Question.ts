import { Schema } from "mongoose";

const collection = "questions";
const template = new Schema(
    {
    }, {
        timestamps: true,
        versionKey: false,
        strict: false
    }
);

export default function Question(connection) {
    if (connection) {
        return connection.model("Question", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
