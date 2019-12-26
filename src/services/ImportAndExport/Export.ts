import { MaxKey } from "bson";
import * as fs from "fs";
import * as _ from "lodash";
import xlsx from 'node-xlsx';

export default class Export {
    public async init(companyData) {
        const data = [];
        if (companyData.list) {
            data.push(this.exportLists(companyData.list));
        }
        if (companyData.question_groups) {
            data.push(this.exportGroups(companyData.question_groups));
        }
        if (companyData.skus && companyData.brands &&
            companyData.brands.brand_variants && companyData.packages &&
            companyData.packages.package_sizes) {
            data.push(this.exportSKUs(
                companyData.skus, companyData.brands.brand_variants,
                companyData.packages.package_sizes)
            );
        }
        if (companyData.packages && companyData.packages.packages) {
            data.push(
                this.exportPackages(companyData.packages.packages)
            );
        }

        if (companyData.packages && companyData.packages.sizes) {
            data.push(
                this.exportSizes(companyData.packages.sizes)
            );
        }

        if (companyData.packages && companyData.packages.package_sizes) {
            data.push(
                this.exportPackageSizes(companyData.packages.package_sizes)
            );
        }

        if (companyData.brands && companyData.brands.brands) {
            data.push(
                this.exportBrands(companyData.brands.brands)
            );
        }

        if (companyData.brands && companyData.brands.variants) {
            data.push(
                this.exportVariants(companyData.brands.variants)
            );
        }

        if (companyData.brands && companyData.brands.brand_variants) {
            data.push(
                this.exportBrandVariants(companyData.brands.brand_variants)
            );
        }

        if (companyData.pocs && companyData.pocs.types) {
            data.push(
                this.exportPocTypes(companyData.pocs.types)
            );
        }

        if (companyData.pocs && companyData.pocs.owners) {
            data.push(
                this.exportPocOwners(companyData.pocs.owners)
            );
        }

        if (companyData.pocs && companyData.pocs.pocs) {
            data.push(
                this.exportPocs(companyData.pocs.pocs)
            );
        }

        if (companyData.questions) {
            data.push(
                this.exportQuestions(companyData.questions)
            );
        }
        if (companyData.kpis) {
            data.push(
                this.exportKPIs(companyData.kpis, companyData.list)
            );
        }

        const sheetBuffer = xlsx.build(data);
        // fs.writeFileSync("./test.xlsx", sheetBuffer);
        return sheetBuffer;
    }

    public exportLists(lists) {
        const titles = ["title"];
        const descriptions = ["description"];
        const isFixed = ["Is Fixed"];
        const isDefault = ["Is Default"];
        const ids = ["ID"];
        const items = [];
        let data = [titles, descriptions, isFixed, isDefault, ids];
        for (const list of lists) {
            titles.push(list.title || "");
            descriptions.push(list.description || list.desc || "");
            isFixed.push(list.isFixed || false);
            isDefault.push(list.isDefault || false);
            ids.push(list.id || "");

            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < list.items.length; i++) {
                const listItem = list.items[i];
                let item = _.find(items, (x) => {
                    return x && x[0] === listItem.id;
                });
                if (!item) {
                    item = [listItem.id];
                    items.push(item);
                }
                item[ids.length - 1] = (listItem.title || "");
                // debugger;
            }
        }
        data = [...data, ...items];
        return { name: "Lists", data };
    }

    public exportGroups(groups) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of groups) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Groups", data };
    }

    public exportSKUs(skus, brandVariants, packageSizes) {
        const titles = ["ID", "Price", "Is competitor", "Is mpa", "Is active", "Brand variant id", "Package size id"];
        let data = [titles];
        const items = [];
        for (const listItem of skus) {
            const brandVariant = _.find(brandVariants, (x) => {
                return (
                    Number(x.brand_id) === Number(listItem.brand_id) &&
                    Number(x.variant_id) === Number(listItem.variant_id)
                );
            });
            const packageSize = _.find(packageSizes, (x) => {
                return (
                    Number(x.package_id) === Number(listItem.package_id) &&
                    Number(x.size_id) === Number(listItem.size_id)
                );
            });
            const brandVariantId = brandVariant.brand_variant_id ? `BV${brandVariant.brand_variant_id}` : "";
            const tempPackageSizeId = (packageSize.id || packageSize.package_size_id);
            const packageSizeId = tempPackageSizeId ? `PKGSIZE${tempPackageSizeId}` : "";
            items.push(
                [
                    listItem.id, listItem.price,
                    listItem.is_competitor, listItem.is_mpa,
                    listItem.is_active, brandVariantId, packageSizeId
                ]
            );
        }
        data = [...data, ...items];
        return { name: "SKUs", data };
    }

    public exportPackages(packages) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of packages) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Packages", data };
    }

    public exportSizes(sizes) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of sizes) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Sizes", data };
    }

    public exportPackageSizes(packageSizes) {
        const titles = ["id", "package id", "size id"];
        let data = [titles];
        const items = [];
        for (const listItem of packageSizes) {
            items.push([listItem.id || listItem.package_size_id,
            `PKG${listItem.package_id}`, `SIZE${listItem.size_id}`]);
        }
        data = [...data, ...items];
        return { name: "Package Sizes", data };
    }

    public exportBrands(brands) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of brands) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Brands", data };
    }

    public exportVariants(variants) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of variants) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Variants", data };
    }

    public exportBrandVariants(brandVariants) {
        const titles = ["id", "brand id", "variant id"];
        let data = [titles];
        const items = [];
        for (const listItem of brandVariants) {
            items.push([listItem.id || listItem.brand_variant_id,
            `BRAND${listItem.brand_id}`, `VARIANT${listItem.variant_id}`]);
        }
        data = [...data, ...items];
        return { name: "Brand variants", data };
    }

    public exportPocTypes(pocType) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of pocType) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Poc Types", data };
    }

    public exportPocOwners(pocOwners) {
        const titles = ["id", "title", "description"];
        let data = [titles];
        const items = [];
        for (const listItem of pocOwners) {
            items.push([listItem.id, listItem.title, listItem.description || listItem.desc]);
        }
        data = [...data, ...items];
        return { name: "Poc owners", data };
    }

    public exportPocs(pocs) {
        const titles = ["id", "poc type id", "poc owner id"];
        let data = [titles];
        const items = [];
        for (const listItem of pocs) {
            items.push([listItem.id || listItem.poc_id, `PT${listItem.type_id}`, `PO${listItem.owner_id}`]);
        }
        data = [...data, ...items];
        return { name: "Pocs", data };
    }

    public exportQuestions(questions) {
        const titles = [
            "id", "title", "used for", "type", "description", "mapped to",
            "source", "default value", "group", "is required", "is image required", "is audio required"
        ];
        let data = [titles];
        const items = [];
        for (const question of questions) {
            const item = [];
            items.push(item);
            const id = question.id || "";
            const title = question.title || "";
            const usedFor = question.is_kpi ? "KPI" : question.is_store ? "STORE" : "";
            const type = _.upperCase(question.type && question.type.key);
            const description = question.description || question.desc;
            const mappedTo = _.upperCase(question.mapped_to && question.mapped_to.key);
            item.push(id, title, usedFor, type, description, mappedTo);
            if (!question.dependency_list && question.attached_list) {
                const source = `L${question.attached_list}`;
                item.push(source);
            } else if (question.dependency_list) {
                const depListItems = question.dependency_list.items;
                if (depListItems && depListItems.length) {
                    const source = `L${question.dependency_list.id}` +
                        `:I${depListItems[0].id}:L${depListItems[0].selected_list}`;
                    item.push(source);
                } else {
                    item.push("");
                }
                for (let i = 1; i < (depListItems.length || 0); i++) {
                    const subitem = [];
                    subitem[item.length - 1] = `L${question.dependency_list.id}` +
                        `:I${depListItems[i].id}:L${depListItems[i].selected_list}`;
                    items.push(subitem);
                }
            } else {
                item.push("");
            }
            let defaultValue = "";
            let isRequired = false;
            let isAudioRequired = false;
            let isImageRequired = false;

            if (question && question.type && question.type.validations) {
                const defaultValidation = _.find(question.type.validations, (x) => {
                    return x.key === "default";
                });
                if (defaultValidation && _.isArray(defaultValidation.answer)) {
                    const answer = _.find(defaultValidation.answer, (x) => {
                        return x.value;
                    });
                    if (answer) {
                        defaultValue = answer.title;
                    }
                } else if (defaultValidation) {
                    defaultValue = defaultValidation.answer;
                }
                const audioValidation = _.find(question.type.validations, (x) => {
                    return x.key === "audio";
                });
                if (audioValidation && audioValidation.answer) {
                    const answer = _.find(audioValidation.answer, (x) => {
                        return x.value;
                    });
                    isAudioRequired = answer ? true : false;
                }
                const imageValidation = _.find(question.type.validations, (x) => {
                    return x.key === "image";
                });
                if (imageValidation && imageValidation.answer) {
                    const answer = _.find(imageValidation.answer, (x) => {
                        return x.value;
                    });
                    isImageRequired = answer ? true : false;
                }
                const requiredValidation = _.find(question.type.validations, (x) => {
                    return x.key === "required";
                });
                if (requiredValidation && requiredValidation.answer) {
                    const answer = _.find(requiredValidation.answer, (x) => {
                        return x.value;
                    });
                    isRequired = answer ? true : false;
                }
            }
            const group = question.group || "";
            item.push(defaultValue);
            item.push(`G${group}`);
            item.push(isRequired);
            item.push(isImageRequired);
            item.push(isAudioRequired);

        }
        data = [...data, ...items];
        return { name: "Questions", data };
    }

    public exportKPIs(channelKpis, lists) {
        const titles = [
            "id", "title", "question", "condition", "weight",
            "sub kpi", "channel", "From", "KPI type", "Sub kpis from", "poc values"
        ];
        let data = [titles];
        const items = [];
        for (const channelKpi of channelKpis) {
            for (const kpi of channelKpi.kpis) {
                const item = [];
                items.push(item);
                const id = kpi.id || "";
                const title = kpi.title || "";
                item.push(id);
                item.push(title);

                let question = "";
                const condition = "";
                if (kpi.from === "questions") {
                    kpi.questions = kpi.questions.filter((x) => x && x.selected);
                    for (let i = 0; i < kpi.questions.length; i++) {
                        const subItem = ["", ""];
                        const qType = kpi.questions[i].type.key;
                        if (i === 0) {
                            question = `Q${kpi.questions[i].id}`;
                            item.push(question);
                            const conditions = this.makeConditionFromQuestion(kpi.questions[i]);
                            for (let j = 0; j < conditions.length; j++) {
                                if (i === 0 && j === 0) {
                                    if (conditions[j].operator === "=" && qType !== "number") {
                                        item.push(conditions[j].value);
                                        item.push(conditions[j].weight);
                                    } else {
                                        item.push(`${conditions[j].operator}${conditions[j].value}`);
                                        item.push(conditions[j].weight);
                                    }
                                } else {
                                    const subCond = [];
                                    if (conditions[j].operator === "=" && qType !== "number") {
                                        subCond[item.length - 2] = conditions[j].value;
                                        subCond.push(conditions[j].weight);
                                    } else {
                                        subCond[item.length - 2] = `${conditions[j].operator}${conditions[j].value}`;
                                        subCond.push(conditions[j].weight);
                                    }
                                    items.push(subCond);
                                }
                            }
                            let subKPItitle = "";
                            if (kpi.has_sub_kpis) {
                                const subKpi = _.find(kpi.sub_kpis, (x) => {
                                    return x.question.id === kpi.questions[i].id;
                                });
                                // debugger;
                                if (subKpi) {
                                    subKPItitle = subKpi.title;
                                }
                            }
                            item.push(subKPItitle);
                        } else {
                            items.push(subItem);
                            question = `Q${kpi.questions[i].id}`;
                            subItem.push(question);
                            const conditions = this.makeConditionFromQuestion(kpi.questions[i]);
                            for (let j = 0; j < conditions.length; j++) {
                                if (j === 0) {
                                    if (conditions[j].operator === "=" && qType !== "number") {
                                        subItem.push(conditions[j].value);
                                        subItem.push(conditions[j].weight);
                                    } else {
                                        subItem.push(`${conditions[j].operator}${conditions[j].value}`);
                                        subItem.push(conditions[j].weight);
                                    }
                                } else {
                                    const subCond = [];
                                    if (conditions[j].operator === "=" && qType !== "number") {
                                        subCond[item.length - 3] = conditions[j].value;
                                        subCond.push(conditions[j].weight);
                                    } else {
                                        subCond[item.length - 3] = `${conditions[j].operator}${conditions[j].value}`;
                                        subCond.push(conditions[j].weight);
                                    }
                                    items.push(subCond);
                                }
                            }
                        }
                    }
                    let channel = "";
                    const channelList = _.find(lists, (x) => (/channel/).test(x.title));
                    if (channelList) {
                        const channelListItem = _.find(channelList.items, (x) => x.id === kpi.channel.id);
                        if (channelListItem) {
                            channel = `L${channelList.id}:I${channelListItem.id}`;
                        }
                    }
                    item.push(channel);
                    item.push(kpi.from);
                } else if (kpi.from === "skus") {
                    const dummyQuestion = "";
                    item.push(dummyQuestion);
                    const dummyCondition = "";
                    item.push(dummyCondition);

                    let channel = "";
                    const channelList = _.find(lists, (x) => (/channel/).test(x.title));
                    if (channelList) {
                        const channelListItem = _.find(channelList.items, (x) => x.id === kpi.channel.id);
                        if (channelListItem) {
                            channel = `L${channelList.id}:I${channelListItem.id}`;
                        }
                    }
                    if (kpi.has_sub_kpis) {
                        for (let i = 0; i < kpi.sub_kpis.length; i++) {
                            if (i === 0) {
                                item.push(kpi.sub_kpis[i].weight);
                                item.push(kpi.sub_kpis[i].title);
                                item.push(channel);
                                item.push(kpi.from);
                                item.push(kpi.sku_kpi);
                                if (kpi.sub_kpi_from) {
                                    item.push(kpi.sub_kpi_from.key);
                                }
                                let pocsValues = "";
                                for (const poc of kpi.sub_kpis[i].values) {
                                    pocsValues += `poc${poc.poc_id},`;
                                }
                                item.push(pocsValues);
                            } else {
                                const subItem = ["", "", "", ""];
                                items.push(subItem);
                                subItem.push(kpi.sub_kpis[i].weight);
                                subItem.push(kpi.sub_kpis[i].title);
                                subItem.push("");
                                subItem.push("");
                                subItem.push("");
                                if (kpi.sub_kpi_from) {
                                    subItem.push("");
                                }
                                let pocsValues = "";
                                for (const poc of kpi.sub_kpis[i].values) {
                                    pocsValues += `poc${poc.poc_id},`;
                                }
                                subItem.push(pocsValues);
                            }
                        }
                    } else {
                        item.push(kpi.weight); // KPI weight
                        item.push(""); // sub kpi
                        item.push(channel);
                        item.push(kpi.from);
                        item.push(kpi.sku_kpi);
                        if (kpi.sub_kpi_from) {
                            item.push(kpi.sub_kpi_from.key);
                        }
                    }
                }
            }
        }
        data = [...data, ...items];
        return { name: "Kpis", data };
    }

    public makeConditionFromQuestion(question) {
        const result = [];
        if (!question.dependency_list && question.attached_list) {
            const source = `L${question.attached_list.id}`;
            for (const condition of question.conditions) {
                result.push({
                    value: `${source}:I${condition.value.id}`,
                    weight: condition.weight,
                    operator: condition.key
                });
            }
        } else if (question.dependency_list) {
            // const depListItems = dependency_list.items;
            // if (depListItems && depListItems.length) {
            //     const source = `L${dependency_list.id}` +
            //         `:I${depListItems[0].id}:L${depListItems[0].selected_list}`;
            //     item.push(source);
            // } else {
            //     item.push("");
            // }
            // for (let i = 1; i < (depListItems.length || 0); i++) {
            //     const subitem = [];
            //     subitem[item.length - 1] = `L${question.dependency_list.id}` +
            //         `:I${depListItems[i].id}:L${depListItems[i].selected_list}`;
            //     items.push(subitem);
            // }

            // tslint:disable-next-line:no-console
            console.debug("Mission impossible");
        } else if (question.conditions && question.type.key === "boolean") {
            for (const condition of question.conditions) {
                result.push({
                    value: condition.value ? "YES" : "NO",
                    weight: condition.weight,
                    operator: condition.key
                });
            }
        } else if (question.conditions &&
            (question.type.key === "number" || question.type.key === "text")) {
            for (const condition of question.conditions) {
                result.push({
                    value: condition.value,
                    weight: condition.weight,
                    operator: condition.key
                });
            }
        }
        return result;
    }
}
