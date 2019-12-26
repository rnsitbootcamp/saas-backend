import * as _ from "lodash";

import SurveyForm from "../../../models/SurveyForm";
import PaginateService from "../../../services/PaginateService";


export default class SurveyFormService {
    public static async createSurveyForm(data, connection) {
        try {
            const surveyForm = await SurveyForm(connection).findOne({ title: data.title });

            if (!surveyForm) {
                return SurveyForm(connection).create({ root: true, ...data });
            } else throw new Error("Form title already exists");
        } catch (e) {
            throw new Error(e);
        }
    }

    public static async getSurveyForms(data, connection) {
        const {
            match,
            project,
            sortAndLimit
        } = data;

        try {
            const data = await SurveyForm(connection).aggregate([
                match,
                project,
                ...sortAndLimit
            ]);

            const count = await SurveyForm(connection).aggregate([match])

            return {
                data,
                count: count.length
            };
        } catch (e) {
            throw new Error(e);
        }
    }

    public static async updateSurveyForm(data, connection) {
        const {
            finder,
            set,
            options
        } = data;
        console.log("inside updateSurveyForm",data);
        try {
            await SurveyForm(connection).updateOne(finder, set);

            return await SurveyForm(connection).findOne(finder);
        } catch (e) {
            throw new Error(e);
        }
    }

    public static async deleteSurveyForm(data, connection) {
        try {
            return await SurveyForm(connection).findOneAndDelete(data);
        } catch (e) {
            throw new Error(e);
        }
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
