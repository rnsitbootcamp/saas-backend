import * as _ from "lodash";

export default class Validations {
    public validations = [];

    constructor(qType: string, isRequired: boolean, isImageRequired: boolean, isAudioRequired: boolean, answer: any) {
        this.defaultValueValidator(qType, answer);
        this.numberValidator(qType);
        this.commonValidator(isRequired, isImageRequired, isAudioRequired);
    }

    private commonValidator(isRequired: boolean, isImageRequired: boolean, isAudioRequired: boolean) {
        const commonValidations = [{
            id: 2,
            key: "required",
            title: "Is Required?",
            type: "radio",
            answer: [
                {
                    title: "Yes",
                    value: isRequired || false
                },
                {
                    title: "No",
                    value: !isRequired || false
                }
            ]
        },
        {
            id: 3,
            key: "audio",
            title: "Record Audio?",
            type: "radio",
            answer: [
                {
                    title: "Yes",
                    value: isAudioRequired || false
                },
                {
                    title: "No",
                    value: !isAudioRequired || false
                }
            ]
        },
        {
            id: 4,
            key: "image",
            title: "Take Image?",
            type: "radio",
            answer: [
                {
                    title: "Yes",
                    value: isImageRequired || false
                },
                {
                    title: "No",
                    value: !isImageRequired || false
                }
            ]
        }];
        for (const validator of commonValidations) {
            validator.id = this.validations.length + 1;
            this.validations.push(validator);
        }
    }

    private defaultValueValidator(qType, answer: any = null) {
        let validationType = qType;
        if ((/(boolean|single_select|multi_select)/i).test(qType)) {
            validationType = "radio";
        } else if ((/gps/i).test(qType)) {
            validationType = qType.toUpperCase();
        } else {
            validationType = qType.toLowerCase();
        }

        const defaultValidation = {
            id: this.validations.length + 1,
            key: "default",
            title: "Default Value",
            type: validationType,
            answer: null,
        };
        if ((/boolean/i).test(qType)) {
            defaultValidation.answer = [
                {
                    title: "Yes",
                    value: false
                },
                {
                    title: "No",
                    value: false
                }
            ];
        } else if (_.isObject(answer)) {
            defaultValidation.answer = [];
            for (const item of answer.items) {
                item.value = false;
                defaultValidation.answer.push(item);
            }
        }

        this.validations.push(defaultValidation);
    }

    private numberValidator(qType: string) {
        if (!(/number/i).test(qType)) {
            return;
        }
        this.validations.push({
            id: this.validations.length + 1,
            key: "minValue",
            title: "Min Value",
            type: "number",
            answer: null
        });
        this.validations.push({
            id: this.validations.length + 1,
            key: "maxValue",
            title: "Max Value",
            type: "number",
            answer: null
        });
    }
}
