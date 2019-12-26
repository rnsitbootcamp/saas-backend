import * as _ from "lodash";
import { Types } from "mongoose";

import Survey from "../../../models/Survey";
import UserAssignment from "../../../models/UserAssignment";
import Queue from "../../../services/Queue";

export default class SurveyService {
    public static async createSurvey(data, connection) {
        // data.survey_added_at = new Date(2019, 1, 24);
        const survey = await Survey(connection).create(data);
        const update = {
            $set: {
                survey_date: survey.survey_added_at,
                survey_id: survey._id,
            },
        };

        await UserAssignment(connection).findOneAndUpdate(
            { _id: survey.assignment_id }, update
        );

        return survey;
    }

    public static pushToQueueForProcessing(survey) {
        const data = JSON.parse(
            JSON.stringify({
                survey_id: survey._id,
                company_id: survey.company_id,
                store_id: survey.store_id,
            }),
        );

        return new Promise((resolve, reject) => {
            Queue.create("survey", data)
                .priority("high")
                .attempts(5)
                .removeOnComplete(true)
                .save((error) => {
                    if (error) {
                        return resolve(false);
                    }
                    return resolve(true);
                });
        });
    }

    public static getFinder(body) {
        const {
            user_ids,
            assignment_ids,
            store_ids
        } = body;

        const $match: any = {
            deleted: false,
        };

        if (user_ids && user_ids.length > 0) {
            $match.addedBy = { $in: user_ids.map((x) => Types.ObjectId(x)) };
        }

        if (assignment_ids && assignment_ids.length > 0) {
            $match.assignment_id = { $in: assignment_ids.map((x) => Types.ObjectId(x)) };
        }

        if (store_ids && store_ids.length > 0) {
            $match.store_id = { $in: store_ids.map((x) => Types.ObjectId(x)) };
        }

        return $match;
    }

    public static otherMatchers(body) {
        const { q } = body;
        const $match: any = {};
        const regExParams = [
            "store.name", "store.email",
            "store.region.title", "store.sub_region.title",
            "store.channel.title", "store.sub_channel.title"
        ];
        $match.$or = regExParams.map((k) => {
            return { [k]: new RegExp(q, "ig") };
        });
        return $match;

    }
}
