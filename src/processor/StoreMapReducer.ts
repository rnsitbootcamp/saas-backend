import * as _ from "lodash";
import ProcessedSurvey from "../models/ProcessedSurveys";
import StoredMapReducerData from "../models/StoreMapReducerData";

export default class StoreMapReducer {
    public result;

    private connection;
    private survey;
    private previousSurvey;
    constructor(connection) {
        this.connection = connection;
    }

    public async init(data: { survey_id?: string; store_id?: string, survey?: any, previousSurvey?: any }) {
        if (data.survey) {
            this.survey = data.survey;
        } else if (this.connection) {
            this.survey = await ProcessedSurvey(this.connection).findOne({
                store_id: data.store_id,
                survey_id: data.survey_id,
            });
        }
        if (data.previousSurvey) {
            this.previousSurvey = data.previousSurvey;
        } else if (this.connection) {
            this.previousSurvey = await ProcessedSurvey(this.connection).findOne({
                store_id: data.store_id,
                createdAt: { $lt: this.survey.createdAt },
            });
        }
    }

    public groupDataByMonths(data, response, isPrevious) {
        if (data.length === 0) {
            return response;
        }
        data.forEach((item) => {
            let index = _.findIndex(response, (o: { title: string }) => o.title === item.title);
            if (index === -1) {
                if (isPrevious) { return; }

                const tempItem = _.clone(item);
                tempItem.score = [Number(item.score)];
                tempItem.sub_kpis = [];
                response.push(tempItem);
                index = _.findIndex(response, (o: { title: string }) => o.title === item.title);
            } else {
                response[index].score.push(Number(item.score));
            }
            response[index].sub_kpis = this.groupDataByMonths(item.sub_kpis, response[index].sub_kpis, isPrevious);
        });
        return response;
    }

    public calculateVspp(response) {
        response.forEach((item, index) => {
            if (item.score && item.score.length === 1) {
                item.score[1] = 0;
            }
            if (item.score && item.score.length === 2) {
                item.score[0] = item.score[0] * 100;
                item.score[1] = item.score[1] * 100;
                const vspp = item.score[0] - item.score[1];
                response[index].score[2] = vspp < 0 ? `(${Math.abs(vspp)})` : `${vspp}`;
                response[index].score[3] = vspp < 0 ? "down" : "up";
                response[index].score[4] = this.getColor(item.score[0]);
            }
            if (item.sub_kpis) {
                response[index].sub_kpis = this.calculateVspp(response[index].sub_kpis);
            }
        });
        return response;
    }

    public process() {
        if (!this.survey) { throw new Error("Current month survey not found"); }
        const currentMonth = this.survey.toObject();
        const previousMonth = this.previousSurvey ? this.previousSurvey.toObject() : {
            data: { score: 0, sub_kpis: [] }
        };
        let response = this.groupDataByMonths(currentMonth.data.sub_kpis, [], false);

        response = this.groupDataByMonths(previousMonth.data.sub_kpis, response, true);
        response = this.calculateVspp(response);
        currentMonth.data.score = currentMonth.data.score * 100;
        previousMonth.data.score = previousMonth.data.score * 100;
        const vspp: any = currentMonth.data.score - previousMonth.data.score;
        const vsppString = vspp < 0 ? `(${Math.abs(vspp)})` : `${vspp}`;

        const result = _.clone(currentMonth);
        result.data.score = [Number(currentMonth.data.score), Number(previousMonth.data.score), vsppString];
        result.data.score[3] = vspp < 0 ? "down" : "up";
        result.data.score[4] = this.getColor(Number(currentMonth.data.score));
        result.data.sub_kpis = response;

        this.result = result;
        return result;
    }

    public async save() {
        if (this.result) {
            return await StoredMapReducerData(this.connection).create(this.result);
        }
    }

    private getColor(score) {
        const colors = {
            5: "#f42b10",
            25: "#f67f00",
            55: "rgba(255, 178, 0, 1)",
            85: "#7cc106",
            100: "#35aa1e",
        };

        if (score < 6) {
            return colors["5"];
        } else if (score < 26) {
            return colors["25"];
        } else if (score < 56) {
            return colors["55"];
        } else if (score < 86) {
            return colors["85"];
        } else {
            return colors["100"];
        }
    }
}
