import { Schema } from "mongoose";

const collection = "survey_forms";
const template = new Schema(
    {
        // title of the surveyForm
        title: {
            type: String,
            required: true
        },
        // mode for the surveyForm can be chosen from
        mode: {
            id: Number,
            title: String
        },
        // short description for the survey form
        description: String,
        // sections contains the questions (tagged / falling) under same category / title
        sections: [
            {
                title: String,
                id:String,
                questions: [
                    Object
                ]
            }
        ],
        // version contains the (state/ updates) done over a surveyForm with a particular title
        versions: [
            {

                type: Schema.Types.ObjectId,
                ref: "SurveyForm",

            }
        ],
        // surveyForm status
        active: {
            type: Boolean,
            default: true
        },
        // root is the oldest or first surveyForm in the version tree with same title
        root: {
            type: Boolean,
            default: false
        }
    }, {
        timestamps: true,
        versionKey: false,
    }
);

export default function SurveyForm(connection) {
    if (connection) {
        return connection.model("SurveyForm", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
