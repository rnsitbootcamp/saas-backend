const request = require("request");
const _ = require("lodash");
import File from "../models/File";

const API_URL = `http://${process.env.HOST}:${process.env.PORT}`;

export default class CreateStores {

    public static findFromList(list, title, key) {
        return list.filter(
            (x) => x.key === key
        ).reduce((acc, cur) => {
            acc = [...acc, ...cur.items.filter((x) => x.title === title)];
            return acc;
        }, [])[0];
    }

    private user;
    private accessToken;
    private company;
    private storeQuestionAnswer: any = [];
    private Default;
    private list;

    constructor(company: { _id: any }, Default: { places: {} }, list: [], user: { _id: any }, accessToken: string) {
        this.user = user;
        this.accessToken = accessToken;
        this.company = company;
        this.Default = Default;
        this.list = list;
    }

    public async init(questions: any[]) {
        questions = questions.filter((x: any) => x.is_store);
        for (const regionTitle in this.Default.places) {
            if (regionTitle) {
                for (const subRegionTitle in this.Default.places[regionTitle]) {
                    if (subRegionTitle) {
                        await this.addStores(
                            regionTitle, subRegionTitle, this.Default.places[regionTitle][subRegionTitle], questions
                        );
                    }
                }
            }
        }
    }

    public async addStores(regionTitle, subRegionTitle, stores, questions) {
        const params: any = {};
        params.region = CreateStores.findFromList(
            this.list, regionTitle, "regions"
        );
        params.region = {
            id: params.region.id,
            title: params.region.title
        };
        params.sub_region = CreateStores.findFromList(
            this.list, subRegionTitle, "sub_regions"
        );
        params.sub_region = {
            id: params.sub_region.id,
            title: params.sub_region.title
        };
        for (const store of stores) {
            params.channel = CreateStores.findFromList(
                this.list, store.channel, "channels"
            );
            params.channel = {
                id: params.channel.id,
                title: params.channel.title
            };
            params.sub_channel = CreateStores.findFromList(
                this.list, store.sub_channel, "sub_channels"
            );
            params.sub_channel = {
                id: params.sub_channel.id,
                title: params.sub_channel.title
            };
            for (const question of questions) {
                if (["name", "gps"].includes(question.mapped_to.key)) {
                    question.answer = store[question.mapped_to.key];
                } else if (params[question.mapped_to.key]) {
                    question.answer = params[question.mapped_to.key];
                }
            }
            this.storeQuestionAnswer = questions;
            await this.addStore();
        }
    }

    public addStore() {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                url: `${API_URL}/stores`,
                qs: {
                    company_id: this.company._id.toString(),
                    access_token: this.accessToken,
                    user_id: this.user._id.toString()
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    questions: this.storeQuestionAnswer
                },
                json: true
            };
            request(options, (error, response, body) => {
                return error ? reject(error) : resolve(body);
            });
        });
    }

    public async listAssignments() {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                url: `${API_URL}/assignments/index`,
                qs: {
                    company_id: this.company._id.toString(),
                    access_token: this.accessToken,
                    user_id: this.user._id.toString(),
                    per_page: 1000
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    per_page: 1000
                },
                json: true
            };
            request(options, (error, response, body) => {
                return error ? reject(error) : resolve(body.data.assignments);
            });
        });
    }

    public async createSurvey(questions, date) {
        const assignments: any = await this.listAssignments();
        const files = await File.find({
            company: this.company._id,
            contentType: { $regex: /^image/ }
        }, null, { limit: Math.floor(Math.random() * 10) + 1 });
        for (const assignment of assignments) {
            const postData: any = {
                assignment_id: assignment._id,
                store_id: assignment.store._id,
                gps: assignment.store.gps,
                survey_added_at: date
            };
            const surveyQuestions = questions.filter((x) => x.is_kpi).map(
                (x) => {
                    const title = ["yes", "no"][Math.floor(Math.random() * 2)];
                    let answer: any = {
                        title,
                        value: title === "yes" ? 1 : 0
                    };
                    if (x.type.key === "single_select") {
                        answer = _.find(x.type.validations, (y) => {
                            return y.key === "default";
                        }).answer[0];
                    } else if (x.type.key === "number") {
                        answer = 3;
                    }
                    return {
                        id: x.id,
                        title: x.title,
                        answer,
                        images: files.filter((y: any) => (/image/).test(y.contentType)).map((y) => y._id.toString()),
                        type: x.type.key,
                        startTime: new Date(),
                        endTime: new Date(),
                        gps: assignment.store.gps,
                        audio: []
                    };
                }
            );
            postData.questions = surveyQuestions;
            await this.addSurvey(postData);
        }
    }

    public async addSurvey(postData) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                url: `${API_URL}/surveys`,
                qs: {
                    company_id: this.company._id.toString(),
                    access_token: this.accessToken,
                    user_id: this.user._id.toString()
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: postData,
                json: true
            };
            request(options, (error, response, body) => {
                return error ? reject(error) : resolve(body);
            });
        });
    }
}
