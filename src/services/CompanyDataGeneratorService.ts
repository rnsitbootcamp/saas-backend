import * as _ from "lodash";
import Validations from "./QuestionValidations";

export default class MockData {

    public companyId;
    public company;

    public list = [];
    public questions = [];
    public questionGroups = [];
    public kpis = [];

    private Default;

    constructor(company: { _id: any, type: string }, Default) {
        this.companyId = company._id;
        this.company = company;
        this.Default = Default;
        // this.list = this.company.list || [];
        // this.questions = this.company.questions || [];
        // this.questionGroups = this.company.question_groups || [];
        // this.kpis = this.company.kpis || [];
    }

    /**
     * init
     */
    public async init() {
        try {
            if (!this.company || !this.company.type) {
                throw new Error("Company type required");
            }
            this.generateCompanyData();
            return {
                kpis: this.kpis,
                list: this.list,
                questions: this.questions,
                question_groups: this.questionGroups
            };
        } catch (error) {
            return {};
        }
    }

    public generateCompanyData() {
        this.addOtherQuestion(
            "Store name?", "Name of the store", "Text",
            true, false, false, false, "Name"
        );
        this.addOtherQuestion(
            "Store gps location?", "GPS for the store", "gps",
            true, false, false, false, "gps"
        );
        this.addGroups();
        this.addRegions();
        this.addChannel();
        this.addKPIChannel();
        for (const kpiTitle in this.Default.Questionnaires[this.company.type].kpis) {
            if (kpiTitle) {
                const kpiWeight = this.Default.Questionnaires[this.company.type].kpis[kpiTitle].weight;
                const questions = this.Default.Questionnaires[this.company.type].kpis[kpiTitle].questions;
                this.addKPI(
                    kpiTitle, kpiWeight, questions
                );
            }
        }
    }

    public addGroups() {
        for (const questionGroup of this.Default.questionGroups) {
            this.questionGroups.push({
                id: this.questionGroups.length + 1,
                title: questionGroup.title,
                description: questionGroup.description,
            });
        }
    }

    public addChannel() {
        const storeChannel = this.Default.channels;
        const channels: string[] = Object.keys(storeChannel);
        const channelList = this.addList(
            channels, 'Channels', true, true, 'Store channels', "channels"
        );
        const subChannelQuestionDepList = {
            id: channelList.id,
            items: []
        };
        for (const channel of channelList.items) {
            const subChannels: string[] = storeChannel[channel.title];
            const subChannelList = this.addList(
                subChannels, `Sub Channel for ${channel.title}`,
                false, true, 'Store sub channel', "sub_channels"
            );
            subChannelQuestionDepList.items.push({
                id: channel.id,
                title: channel.title,
                selected_list: subChannelList.id
            });
        }
        this.addSingleSelectQuestion(
            "Store channel?", "Store channels",
            true, false, false, false, channelList.id, false, "channel"
        );
        this.addSingleSelectQuestion(
            "Store sub channel?", "Store sub channel",
            true, false, false, false, false, subChannelQuestionDepList,
            "sub_channel"
        );
    }

    public addKPIChannel() {
        const channelItems = _.clone(_.find(this.list, (item) => {
            return item.key === "channels";
        }).items);
        for (let kpiChannels of channelItems) {
            kpiChannels = _.clone(kpiChannels);
            kpiChannels.kpis = [];
            kpiChannels.weight = 0;
            kpiChannels.noOfKpis = 0;
            this.kpis.push(kpiChannels);
        }
    }

    public addRegions() {
        const places = this.Default.places;
        const regions: string[] = Object.keys(places);
        const regionList = this.addList(
            regions, 'Regions', true, true, 'Store regions', "regions"
        );
        const subRegionQuestionDepList = {
            id: regionList.id,
            items: []
        };
        for (const region of regionList.items) {
            const subRegions: string[] = Object.keys(places[region.title]);
            const subRegionList = this.addList(
                subRegions, `Sub Regions for ${region.title}`,
                false, true, 'Store sub regions', "sub_regions"
            );
            subRegionQuestionDepList.items.push({
                id: region.id,
                title: region.title,
                selected_list: subRegionList.id
            });
        }
        this.addSingleSelectQuestion(
            "Store region?", "Store regions",
            true, false, false, false, regionList.id, false, "region"
        );
        this.addSingleSelectQuestion(
            "Store sub region?", "Store sub region",
            true, false, false, false, null, subRegionQuestionDepList,
            "sub_region"
        );
    }

    public addList(
        list: string[], title: string, isFixed: boolean,
        isDefault: boolean, description?: string, key?: string) {
        const template = {
            items: [],
            isFixed,
            isDefault,
            title,
            description: description || `${title} for stores`,
            id: this.list.length + 1,
            key
        };
        for (const item of list) {
            template.items.push({
                id: template.items.length + 1,
                title: item,
                is_fixed: false
            });
        }

        this.list.push(template);
        return template;
    }

    public addSingleSelectQuestion(
        title: string, description: string,
        isStore: boolean, iskpi: boolean,
        isImageRequired: boolean, isAudioRequired: boolean,
        attachedList: any, dependencyList: any,
        mappedToKey: any
    ) {
        if (isStore && !mappedToKey) {
            throw new Error('mappedToKey required for store question.');
        }
        const answer = _.find(this.list, (x) => {
            return attachedList === x.id;
        });
        const validations = new Validations(
            "single_select", true, isImageRequired, isAudioRequired, answer
        ).validations;
        const template = {
            id: this.questions.length + 1,
            title,
            desc: description,
            type: {
                id: 4,
                title: "Single Select",
                key: "single_select",
                validations,
                title_to_show: "Single Select"
            },
            is_kpi: iskpi,
            is_store: isStore,
            has_dependency: dependencyList ? true : false,
            has_list_dependency: dependencyList ? true : false,
            attached_list: attachedList || null,
            dependency_list: dependencyList,
            dependency_list_question: dependencyList ? dependencyList.id : false,
            group: 1,
            mapped_to: {
                id: 1,
                title: _.startCase(mappedToKey),
                key: mappedToKey,
                title_to_show: _.startCase(mappedToKey)
            }
        };
        this.questions.push(template);
        return template;
    }

    public addOtherQuestion(
        title: string, description: string, qType: string,
        isStore: boolean, iskpi: boolean, isImageRequired: boolean,
        isAudioRequired: boolean, mappedToKey: string
    ) {

        const validations = new Validations(
            qType, true, isImageRequired, isAudioRequired, null
        ).validations;

        const template = {
            id: this.questions.length + 1,
            title,
            desc: description,
            type: {
                id: 1,
                title: (/(gps)/i).test(qType) ? qType.toUpperCase() : qType,
                key: qType.toLowerCase(),
                validations,
                title_to_show: (/(gps)/i).test(qType) ? qType.toUpperCase() : qType
            },
            is_kpi: iskpi,
            is_store: isStore,
            has_dependency: false,
            has_list_dependency: false,
            attached_list: null,
            dependency_list: null,
            dependency_list_question: null,
            group: 1,
            mapped_to: mappedToKey ? {
                id: 7,
                title: (/(gps)/i).test(mappedToKey) ? mappedToKey.toUpperCase() : _.startCase(mappedToKey),
                key: mappedToKey.toLowerCase(),
                title_to_show: (/(gps)/i).test(mappedToKey) ? mappedToKey.toUpperCase() : _.startCase(mappedToKey)
            } : null
        };

        this.questions.push(template);
        return template;
    }

    public addKPI(
        kpiTitle: string, kpiWeight: number,
        questions: Array<{
            title: string, type: string,
            conditions: Array<{ key: string, value: any, weight: number }>,
            weight: number,
            attach_list?: any,
            sub_kpi?: string
        }>) {

        const template = {
            weight: 0,
            action: "add",
            questions: [],
            title: kpiTitle,
            from: "questions",
            channel: null,
            id: null,
            sub_kpis: [],
            has_sub_kpis: false
        };

        for (const question of questions) {
            let addedQuestion;
            if ((/boolean/i).test(question.type) || (/number/i).test(question.type)) {
                addedQuestion = this.addOtherQuestion(
                    question.title, "", question.type,
                    false, true, true, false, null
                );
            } else if ((/single_select/i).test(question.type)) {
                const items = question.conditions.map((x) => x.value);
                const addedList: any = this.addList(
                    items, question.title, false, false, question.title
                );
                question.conditions = question.conditions.map((x) => {
                    x.value = _.find(addedList.items, (y) => {
                        return y.title === x.value;
                    });
                    x.value.value = false;
                    return x;
                });
                addedQuestion = this.addSingleSelectQuestion(
                    question.title, question.title,
                    false, true, false, false, addedList.id, false, null
                );
                addedQuestion = _.clone(addedQuestion);
                addedQuestion.attached_list = addedList;
                addedQuestion.options = addedList.items;
            }
            const kpiQuestion: any = _.clone(addedQuestion);
            if (question.sub_kpi) {
                template.has_sub_kpis = true;
                kpiQuestion.kpi_title = question.sub_kpi;
            }
            kpiQuestion.conditions = question.conditions;
            if (!question.weight) {
                const maxWeight = _.maxBy(question.conditions, (o) => {
                    return o.weight;
                });
                question.weight = maxWeight.weight;
            }
            kpiQuestion.weight = question.weight;
            kpiQuestion.selected = true;
            template.weight = question.weight + template.weight;
            template.questions.push(kpiQuestion);
            template.sub_kpis.push({
                weight: question.weight,
                conditions: question.conditions,
                title: question.sub_kpi || question.title,
                question: {
                    id: addedQuestion.id,
                    title: addedQuestion.title
                }
            });
        }
        for (const kpi of this.kpis) {
            kpi.weight = kpi.weight + template.weight;
            kpi.noOfKpis++;
            template.channel = {
                id: kpi.id,
                channel: kpi.title
            };
            template.id = kpi.kpis.length + 1;
            kpi.kpis.push(template);
        }
        return template;
    }
}
