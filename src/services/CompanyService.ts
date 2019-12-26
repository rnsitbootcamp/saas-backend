import * as _ from "lodash";

class CompanyService {

    public errors = [];

    public validateData(data: any): boolean {
        // Validate following in data: regions, channels, skus, questions and kpis
        // const regions   = _.find(data, { 'key': 'regions' });
        // const channels  = _.find(data, { 'key': 'channels' });
        const skus: any = _.find(data, { key: "skus" });
        // const questions = _.find(data, { 'key': 'questions' });
        const kpis: any = _.find(data, { key: "kpis" });
        const features: any = _.find(data, { key: "features" });

        this.validateItems([
            // { error: "Channels are required.", value: channels },
            // { error: "Regions are required.", value: regions },
            { error: "KPIs are required.", value: kpis },
            { error: "SKUs are required.", value: skus },
            // { error: "Questions are required.", value: questions },
        ]);

        // If validation fails here
        if (this.errors.length > 0) { return false; }

        // REGIONS: All the regions should have at least one sub region
        // CHANNELS: All the channels should have at least one sub channel
        // this.validateGroup(regions, 'Region', 'sub_regions', 'Sub Region');
        // this.validateGroup(channels, 'Channel', 'sub_channels', 'Sub Channel');

        // We need company and competitor items for MPA+SOVI. So if we have to calculate
        // sovi or mpa kpi then they both should be present
        // SKUS: We should have at least 1 mpa product to calculate kpis (mpa, sovi) based on skus
        // SKUS: We should have at least price of 1 kpi to calculate price kpi
        // SKUS
        const skuCounts = _.countBy(skus.data, "is_mpa");

        const skuTitles = _.uniq(_.map(skus.data, (s: any) => s.title));
        if ((skuTitles && skus && skus.data) && (skuTitles.length !== skus.data.length)) {
            this.errors.push(`SKU titles must be unique`);
        }

        // QUESTIONS
        // const questionTypeCounts = _.countBy(questions.data, 'for_kpi');
        // kpiQuestions = questionTypeCounts['true'] ? questionTypeCounts['true'] : 0;
        // nonKpiQuestions = questionTypeCounts['false'] ? questionTypeCounts['false'] : 0;

        // const questionTitles = _.uniq(_.map(questions.data, (s: any) => s.title));
        // const id = _.uniq(_.map(questions.data, (s: any) => s.id));
        // if (questionTitles.length !== questions.data.length || id.length !== questions.data.length) {
        //   this.errors.push(`Question titles must be unique`);
        // }

        // FEATURES SHOULD HAVE OPTIONS if not required
        if (features && features.data.length > 0) {
            features.data.forEach((feature: any) => {
                if (!feature.required) { return; }
                if (feature.options.length === 0) {
                    this.errors.push(`Feature ${feature.title} is required and does not have any option`);
                }
            });
        }

        // KPI Weights Validation
        if (kpis && kpis.data) {
            kpis.data.forEach((group: any) => {
                if (group.length === 0) {
                    this.errors.push(`KPIs for channel ${group.title} are required.`);
                } else {
                    let groupWeight = 0;
                    group.kpis.forEach((kpi: any) => {
                        groupWeight += kpi.weight;
                        const subKpisWeight = _.sumBy(kpi.sub_kpis, (k: any) => k.weight);
                        if ((kpi.weight - subKpisWeight) < 0) {
                            this.errors.push(`Weight of sub kpis of ${kpi.title} exceeds the assigned weight.`);
                        }
                    });
                    if (groupWeight > 100) {
                        this.errors.push(`The KPI weight for channel ${group.title} exceeds 100%.`);
                    }
                }
            });
        }

        return this.errors.length === 0 ? true : false;
    }

    public validateFormat(data: any): boolean {
        if (this.errors.length > 0) { return false; }
        const titles = _.uniq(_.map(data, (s: any) => s.title));
        const id = _.uniq(_.map(data, (s: any) => s.id));
        if (titles.length !== data.length || id.length !== data.length) {
            this.errors.push(`Question titles must be unique`);
        }
        return this.errors.length === 0 ? true : false;
    }

    private validateItems(items: any) {
        items.forEach((item: any) => {
            if (!item.value || !item.value.data || item.value.data.length === 0) {
                this.errors.push(item.error);
            }
        });
    }

    private validateGroup(group: any, groupTitle: string, subGroupKey: string, subGroupTitle: string) {
        // Length validation
        if (group.data.length === 0) {
            this.errors.push(`${groupTitle}s are required.`);
        }
        // Uniqueness of titles validation
        const uniqueGroupTitles = _.uniq(_.map(group.data, (c: any) => c.title));
        if (uniqueGroupTitles.length !== group.data.length) {
            this.errors.push(`${groupTitle} titles must be unique`);
        }
        // Sub data validation
        _.forEach(group.data, (item: any) => {
            // Sub data length validation
            if (item[subGroupKey].length === 0) {
                this.errors.push(`${subGroupTitle}s are required for ${groupTitle} ${item.title}.`);
            }
            // Sub data title uniqueness validation
            const uniqueSubGroupTitles = _.uniq(_.map(item[subGroupKey], (c: any) => c.title));
            if (uniqueSubGroupTitles.length !== item[subGroupKey].length) {
                this.errors.push(`${subGroupTitle}s titles of ${groupTitle} ${item.title} must be unique`);
            }
        });
    }
}

const Service = new CompanyService();
export default Service;
