import * as _ from "lodash";
import Validations from "../QuestionValidations";
import ImportUtils from "./ImportAndExportUtils";

export default class MapperService {
    public questions = [];
    public lists = [];
    public groups = [];
    public kpis = [];
    public brands = [];
    public variants = [];
    public brandVariants = [];
    public packages = [];
    public sizes = [];
    public packageSizes = [];
    public skus = [];
    public pocTypes = [];
    public pocOwners = [];
    public pocs = [];

    constructor(questions?: any, lists?: any, groups?: any) {
        if (questions) {
            this.questions = questions;
        }

        if (lists) {
            this.lists = lists;
        }

        if (groups) {
            this.groups = groups;
        }
    }

    public mapParsedQuestions(parsedQuestion) {
        const questions = [];
        for (const q of parsedQuestion) {
            if (q.source) {
                if (q.source) {
                    q.source = this.expandCodes(q.source);
                    if (q.source.length === 1) {
                        q.attached_list = q.source[0].id;
                    } else if (q.source.length > 1) {
                        q.dependency_list = {
                            id: q.source[0].id,
                            items: [{
                                id: q.source[1].id,
                                title: q.source[1].title,
                                selected_list: null
                            }]
                        };
                        if (q.source.length > 2) {
                            q.dependency_list.items[0].selected_list = q.source[2].id;
                        }
                    }
                }

            }
            if (q.group) {
                q.group = this.expandCodes(q.group);
                q.group = q.group && q.group.length ? q.group[0].id : null;
            }
            delete q.source;
            if (q.id) {
                questions.push(q);
            } else if (questions.length && q.dependency_list) {
                questions[questions.length - 1].dependency_list.items.push(q.dependency_list.items[0]);
            }
        }
        for (const question of questions) {
            const title = question.title || question.question;
            const description = question.description || "";
            const qType = ImportUtils.toSlug(question.type);
            const isStore = (/store/i).test(question.used_for || "");
            const isKPI = !isStore;
            const isRequired = ImportUtils.toBoolean(question.is_required);
            const isImageRequired = ImportUtils.toBoolean(question.is_image_required);
            const isAudioRequired = ImportUtils.toBoolean(question.is_audio_required);
            const mappedToKey = question.mapped_to;
            const attachedList = question.attached_list;
            const dependencyList = question.dependency_list;
            if (ImportUtils.isSame(qType, "single select") || ImportUtils.isSame(qType, "multi select")) {
                this.addSingleSelectQuestion(
                    title, description, qType,
                    isStore, isKPI, isRequired,
                    isImageRequired, isAudioRequired,
                    attachedList, dependencyList,
                    mappedToKey
                );
            } else {
                this.addOtherQuestion(
                    title, description, qType,
                    isStore, isKPI, isRequired,
                    isImageRequired, isAudioRequired, mappedToKey
                );
            }
        }
    }

    public mapParsedKPIs(parsedKPI) {
        for (let k of parsedKPI) {
            if (k.channel) {
                const channel = this.expandCodes(k.channel);
                if (channel && channel.length > 1) {
                    k.channel = channel[1];
                }
            }
            if (ImportUtils.isMatching(k.from, "question")) {
                k.from = "questions";
                k.questions = (k.questions || []).map((q) => {
                    q.question = this.expandCodes(q.question);
                    if (q.question.length > 0) {
                        q.question = _.clone(q.question[0]);
                        q.question.selected = true;
                    } else {
                        return;
                    }
                    const conditions = q.scores.map((score) => {
                        let value;
                        const weight = Number(score.weight) || 0;
                        let key;
                        if (q.question.type.key === "boolean") {
                            value = ImportUtils.toBoolean(score.condition);
                            key = "=";
                            return {
                                value, key, weight
                            };
                        } else if (q.question.type.key === "single_select") {
                            const expandedVal = this.expandCodes(score.condition);
                            if (expandedVal.length > 0) {
                                q.question.options = expandedVal[0].items;
                                value = expandedVal[expandedVal.length - 1];
                            }
                            key = "=";
                            return {
                                value, key, weight
                            };
                        } else if (q.question.type.key === "number") {
                            const conditionValue = (/([\=|\<|\>]+)(\d+)/).exec(score.condition);
                            key = conditionValue[1];
                            value = conditionValue[2];
                            return {
                                value, key, weight
                            };
                        }
                    });

                    q.question.sub_kpi = q.sub_kpi;
                    q.question.conditions = conditions;
                    return q.question;
                });
                k.sub_kpis = [];
                k.weight = 0;
                for (const q of k[k.from]) {
                    if (!q) {
                        continue;
                    }
                    const maxWeight = Math.max.apply(null, q.conditions.map((x) => x.weight));
                    k.weight += maxWeight;
                    if (q.sub_kpi) {
                        k.has_sub_kpis = true;
                    }
                    k.sub_kpis.push({
                        weight: maxWeight,
                        conditions: q.conditions,
                        title: q.sub_kpi || q.title,
                        question: {
                            id: q.id,
                            title: q.title
                        }
                    });
                }
            } else if (ImportUtils.isMatching(k.from, "sku")) {
                k.from = "skus";
                k.sku_kpi = k.kpi_type;
                if (k.sub_kpis) {
                    k.weight = 0;
                    k.has_sub_kpis = true;
                    k.sub_kpis = k.sub_kpis.map((subKpi) => {
                        subKpi.weight = Number(subKpi.weight) || 0;
                        k.weight += subKpi.weight;
                        if (subKpi.poc_values) {
                            subKpi.poc_values = subKpi.poc_values.split(",").map(
                                (x) => x.trim()
                            ).filter((x) => x).map((x) => {
                                return this.expandCodes(x.toUpperCase());
                            });
                        }
                        return {
                            title: subKpi.sub_kpi,
                            weight: subKpi.weight,
                            values: subKpi.poc_values
                        };
                    });
                } else {
                    k.weight = Number(k.weight) || 0;
                }

                const nK = {
                    id: k.id,
                    title: k.title,
                    from: k.from,
                    has_sub_kpis: k.has_sub_kpis,
                    category_sub_kpis: false,
                    sku_kpi: k.sku_kpi,
                    sub_kpi_from: {
                        title: _.toUpper(k.sub_kpis_from),
                        key: k.sub_kpis_from
                    },
                    sub_kpis: k.sub_kpis,
                    weight: k.weight,
                    action: "add",
                    questions: this.questions.filter((x) => x.is_kpi),
                    channel: k.channel
                };
                k = nK;
            }

            if (k && k.channel && k.channel.id) {
                const thisKpi = _.find(this.kpis, (x) => x.id === k.channel.id);
                if (thisKpi) {
                    thisKpi.kpis.push(k);
                    thisKpi.weight += k.weight;
                    thisKpi.noOfKpis += 1;
                } else {
                    this.kpis.push({
                        id: k.channel.id,
                        title: k.channel.title,
                        kpis: [k],
                        weight: k.weight,
                        noOfKpis: 1
                    });
                }
            }
        }
    }

    public mapParsedBrands(parsedBrands) {
        for (const brand of parsedBrands) {
            this.brands.push({
                id: brand.id,
                title: brand.title,
                desc: brand.desc || brand.description
            });
        }
    }

    public mapParsedVariants(parsedVariants) {
        for (const variant of parsedVariants) {
            this.variants.push({
                id: variant.id,
                title: variant.title,
                desc: variant.description
            });
        }
    }

    public mapParsedBrandVariants(brandVariants) {
        for (const brandVariant of brandVariants) {
            const mappedBrandVariant: any = {
                brand_variant_id: brandVariant.id
            };
            if (brandVariant.brand_id) {
                const eBrand = this.expandCodes(brandVariant.brand_id);
                if (eBrand && eBrand.length > 0) {
                    mappedBrandVariant.brand_id = eBrand[0].id;
                    mappedBrandVariant.brand_title = eBrand[0].title;
                }
            }
            if (brandVariant.variant_id) {
                mappedBrandVariant.variant_id = brandVariant.variant_id;
                const eVariant = this.expandCodes(brandVariant.variant_id);
                if (eVariant && eVariant.length > 0) {
                    mappedBrandVariant.variant_id = eVariant[0].id;
                    mappedBrandVariant.variant_title = eVariant[0].title;
                }
            }
            this.brandVariants.push(mappedBrandVariant);
        }
    }

    public mapParsedPackages(parsedPackages) {
        for (const skuPackage of parsedPackages) {
            this.packages.push({
                id: skuPackage.id,
                title: skuPackage.title,
                desc: skuPackage.desc || skuPackage.description
            });
        }
    }

    public mapParsedSizes(parsedSizes) {
        for (const skuSize of parsedSizes) {
            this.sizes.push({
                id: skuSize.id,
                title: skuSize.title,
                desc: skuSize.desc || skuSize.description
            });
        }
    }

    public mapParsedPackageSizes(packageSizes) {
        for (const packageSize of packageSizes) {
            const mappedPackageSize: any = {
                id: packageSize.id
            };
            if (packageSize.package_id) {
                const ePackage = this.expandCodes(packageSize.package_id);
                if (ePackage && ePackage.length > 0) {
                    mappedPackageSize.package_id = ePackage[0].id;
                    mappedPackageSize.package_title = ePackage[0].title;
                }
            }
            if (packageSize.size_id) {
                mappedPackageSize.size_id = packageSize.size_id;
                const eSize = this.expandCodes(packageSize.size_id);
                if (eSize && eSize.length > 0) {
                    mappedPackageSize.size_id = eSize[0].id;
                    mappedPackageSize.size_title = eSize[0].title;
                }
            }
            this.packageSizes.push(mappedPackageSize);
        }
    }

    public mapParsedSKUs(skus) {
        for (const sku of skus) {
            const mappedSKU: any = {
                id: sku.id,
                title: sku.title,
                price: sku.price,
                is_active: ImportUtils.toBoolean(sku.is_active),
                is_competitor: ImportUtils.toBoolean(sku.is_competitor),
                is_mpa: ImportUtils.toBoolean(sku.is_mpa)
            };
            if (sku.package_size_id) {
                const ePackageSize = this.expandCodes(sku.package_size_id);
                if (ePackageSize && ePackageSize.length > 0) {
                    mappedSKU.package_id = ePackageSize[0].package.id;
                    mappedSKU.package_title = ePackageSize[0].package.title;

                    mappedSKU.size_id = ePackageSize[0].size.id;
                    mappedSKU.size_title = ePackageSize[0].size.title;
                }
            }

            if (sku.brand_variant_id) {
                const eBrandVariant = this.expandCodes(sku.brand_variant_id);
                if (eBrandVariant && eBrandVariant.length > 0) {
                    mappedSKU.brand_id = eBrandVariant[0].brand.id;
                    mappedSKU.brand_title = eBrandVariant[0].brand.title;

                    mappedSKU.variant_id = eBrandVariant[0].variant.id;
                    mappedSKU.variant_title = eBrandVariant[0].variant.title;
                }
            }
            if (!mappedSKU.title) {
                mappedSKU.title = `${mappedSKU.brand_title} ${mappedSKU.variant_title}` +
                    ` ${mappedSKU.package_title} ${mappedSKU.size_title}`;
            }
            this.skus.push(mappedSKU);
        }
    }

    public mapParsedPocTypes(parsedPocTypes) {
        for (const pocType of parsedPocTypes) {
            this.pocTypes.push({
                id: pocType.id,
                title: pocType.title,
                desc: pocType.desc || pocType.description
            });
        }
    }

    public mapParsedPocOwners(parsedPocOwners) {
        for (const pocOwner of parsedPocOwners) {
            this.pocOwners.push({
                id: pocOwner.id,
                title: pocOwner.title,
                desc: pocOwner.desc || pocOwner.description
            });
        }
    }

    public mapParsedPocs(pocs) {
        for (const poc of pocs) {
            const mappedPoc: any = {
                poc_id: poc.id,
                poc_title: poc.title,
            };
            if (poc.poc_type_id) {
                const ePocType = this.expandCodes(poc.poc_type_id);
                if (ePocType && ePocType.length > 0) {
                    mappedPoc.type_id = ePocType[0].id;
                    mappedPoc.type_title = ePocType[0].title;
                }
            }
            if (poc.poc_owner_id) {
                mappedPoc.owner_id = poc.poc_owner_id;
                const ePocOwner = this.expandCodes(poc.poc_owner_id);
                if (ePocOwner && ePocOwner.length > 0) {
                    mappedPoc.owner_id = ePocOwner[0].id;
                    mappedPoc.owner_title = ePocOwner[0].title;
                }
            }
            this.pocs.push(mappedPoc);
        }
    }

    public expandCodes(code) {
        const result = [];
        if (!code) {
            return [];
        }
        const items = code.split(":").map((x) => x.toUpperCase());
        for (const item of items) {
            const temp = (/(\w+)(\d+)/).exec(item);
            const category = temp[1];
            const id = Number(temp[2]);
            if (category === "L" || category === "LIST") {
                const list = _.find(this.lists, (x) => x.id === id);
                if (list) {
                    result.push(list);
                }
            } else if (category === "I" || category === "LI") {
                const list = result[result.length - 1];
                const listItem = _.find(list.items, (x) => x.id === id);
                if (listItem) {
                    result.push(listItem);
                }
            } else if (category === "G" || category === "GROUP") {
                const group = _.find(this.groups, (x) => x.id === id);
                if (group) {
                    result.push(group);
                }
            } else if (category === "Q") {
                const question = _.find(this.questions, (x) => x.id === id);
                if (question) {
                    result.push(question);
                }
            } else if (category === "B" || category === "BRAND") {
                const brand = _.find(this.brands, (x) => x.id === id);
                if (brand) {
                    result.push(brand);
                }
            } else if (category === "V" || category === "VARIANT") {
                const variant = _.find(this.variants, (x) => x.id === id);
                if (variant) {
                    result.push(variant);
                }
            } else if (category === "P" || category === "PKG" || category === "PACKAGE") {
                const skuPackage = _.find(this.packages, (x) => x.id === id);
                if (skuPackage) {
                    result.push(skuPackage);
                }
            } else if (category === "S" || category === "SIZE") {
                const size = _.find(this.sizes, (x) => x.id === id);
                if (size) {
                    result.push(size);
                }
            } else if (category === "BV") {
                let brandVariant: any = _.find(this.brandVariants, (x) => x.brand_variant_id === id);
                if (brandVariant) {
                    brandVariant = _.clone(brandVariant);
                    const variant = _.find(this.variants, (x) => x.id === brandVariant.brand_id);
                    const brand = _.find(this.brands, (x) => x.id === brandVariant.variant_id);
                    brandVariant.brand = brand;
                    brandVariant.variant = variant;
                    result.push(brandVariant);
                }
            } else if (category === "PS" || category === "PKGSIZE") {
                let packageSize = _.find(this.packageSizes, (x) => x.id === id);
                if (packageSize) {
                    packageSize = _.clone(packageSize);
                    const size = _.find(this.sizes, (x) => x.id === packageSize.size_id);
                    const skuPackage = _.find(this.packages, (x) => x.id === packageSize.package_id);
                    packageSize.size = size;
                    packageSize.package = skuPackage;
                    result.push(packageSize);
                }
            } else if (category === "PT" || category === "POCT" || category === "POCTYPE") {
                const pocType: any = _.find(this.pocTypes, (x) => x.id === id);
                if (pocType) {
                    result.push(pocType);
                }
            } else if (category === "PO" || category === "POCO" || category === "POCOWNER") {
                const pocOwner: any = _.find(this.pocOwners, (x) => x.id === id);
                if (pocOwner) {
                    result.push(pocOwner);
                }
            } else if (category === "POC") {
                const poc: any = _.find(this.pocs, (x) => x.poc_id === id);
                if (poc) {
                    result.push(poc);
                }
            }
        }
        return result;
    }

    public addSingleSelectQuestion(
        title: string, description: string,
        qType: string, isStore: boolean, iskpi: boolean, isRequired: boolean,
        isImageRequired: boolean, isAudioRequired: boolean,
        attachedList: any, dependencyList: any,
        mappedToKey: any
    ) {
        if (isStore && !mappedToKey) {
            throw new Error('MappedToKey required for store question.');
        }
        const answer = _.find(this.lists, (x) => {
            return attachedList === x.id;
        });
        const validations = new Validations(
            qType, isRequired, isImageRequired, isAudioRequired, answer
        ).validations;
        const template = {
            id: this.questions.length + 1,
            title,
            desc: description,
            type: {
                id: 4,
                title: _.startCase(qType.replace(/\_/, "_")),
                key: qType,
                validations,
                title_to_show: _.startCase(qType.replace(/\_/, "_"))
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
        isStore: boolean, iskpi: boolean, isRequired: boolean,
        isImageRequired: boolean, isAudioRequired: boolean, mappedToKey: string
    ) {
        const validations = new Validations(
            qType, isRequired, isImageRequired, isAudioRequired, null
        ).validations;

        const template = {
            id: this.questions.length + 1,
            title,
            desc: description,
            type: {
                id: 1,
                title: _.startCase(qType),
                key: qType.toLowerCase(),
                validations,
                title_to_show: _.startCase(qType)
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
}
