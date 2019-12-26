#!/usr/bin/env node
'use strict';
const logger = console;
const ArgumentParser = require('argparse').ArgumentParser;
const parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'Argparse example'
});
parser.addArgument(
    ['-f', '--file'],
    {
        help: 'Input excel file',
        required: true
    }
);
parser.addArgument(
    ['-d', '--data'],
    {
        help: 'Dta folder to write parsed excel',
        defaultValue: "mock-new",
        required: true
    }
);

const args = parser.parseArgs();

const XlsxStreamReader = require("xlsx-stream-reader");
const fs = require("fs");
const path = require("path");
let parsedResult = {};


function trimList(list, left = false) {
    let newList = [];
    let emptyArray = [];
    let notEmptyFound = !left;
    for (let i = 0; i < list.length; i++) {
        let empty;
        if (list[i] === undefined || list[i] === null) {
            empty = true;
        }

        if (typeof (list[i]) === 'string' && list[i].trim() === "") {
            empty = true;
        }

        if (typeof (list[i]) === 'number' && !isFinite(list[i])) {
            empty = true;
        }

        if (empty && notEmptyFound) {
            emptyArray.push(list[i]);
        }
        if (empty) {
            continue;
        }

        notEmptyFound = true;
        while (emptyArray.length > 0) {
            newList.push(emptyArray.shift());
        }
        newList.push(list[i]);
    }
    return newList;
}


const workBookReader = new XlsxStreamReader();
workBookReader.on('error', function (error) {
    throw error;
});

workBookReader.on('sharedStrings', function () {
    // do not need to do anything with these,
    // cached and used when processing worksheets
    // console.log(workBookReader.workBookSharedStrings);
});

workBookReader.on('styles', function () {
    // do not need to do anything with these
    // but not currently handled in any other way
    // console.log(workBookReader.workBookStyles);
});

workBookReader.on('worksheet', function (workSheetReader) {
    // print worksheet name
    console.log(workSheetReader.name);
    // if we do not listen for rows we will only get end event
    // and have information about the sheet like row count
    let kpiTitle;
    const sheetName = workSheetReader.name;
    parsedResult[sheetName] = {
        kpis: {}
    };
    let pendingQuestion;
    workSheetReader.on('row', function (row) {
        try {
            const rowValue = trimList(row.values.slice(1));
            if (rowValue.length) {
                console.log(rowValue);
                if (rowValue[1] === "TOTAL") {
                    addPendingQuestion();
                    parsedResult[sheetName].weight = Number(rowValue[4] || 0);
                } else if (rowValue[1] === "KPI") {
                    addPendingQuestion();
                    kpiTitle = rowValue[0];
                    parsedResult[sheetName].kpis[kpiTitle] = {
                        weight: Number(rowValue[4] || 0),
                        questions: []
                    };
                } else if ((/boolean/i).test(rowValue[1])) {
                    addPendingQuestion();
                    pendingQuestion = {
                        type: "boolean",
                        title: rowValue[0],
                        conditions: [{
                            key: "=",
                            value: (/yes/i).test(rowValue[3]) ? 1 : 0,
                            weight: Number(rowValue[4] || 0)
                        }],
                        sub_kpi: rowValue[5] || null
                    };
                } else if (pendingQuestion && pendingQuestion.type === "boolean" && rowValue[3] && !rowValue[1]) {
                    pendingQuestion.conditions.push({
                        key: "=",
                        value: (/yes/i).test(rowValue[3]) ? 1 : 0,
                        weight: Number(rowValue[4] || 0)
                    });
                } else if ((/single\_select/i).test(rowValue[1])) {
                    addPendingQuestion();
                    pendingQuestion = {
                        type: "single_select",
                        title: rowValue[0],
                        conditions: [],
                        sub_kpi: rowValue[5] || null
                    };
                    if (rowValue[3]) {
                        pendingQuestion.conditions =  [{
                            key: "=",
                            value: rowValue[3],
                            weight: Number(rowValue[4] || 0)
                        }]
                    }
                } else if (pendingQuestion && pendingQuestion.type === "single_select" && rowValue[3] && !rowValue[1]) {
                    if (rowValue[3]) {
                        pendingQuestion.conditions.push({
                            key: "=",
                            value: rowValue[3],
                            weight: Number(rowValue[4] || 0)
                        });
                    }
                } else if ((/number/i).test(rowValue[1])) {
                    addPendingQuestion();
                    if ((/^\d+$/).test(rowValue[3])) {
                        rowValue[3] = `=${rowValue[3]}`
                    }
                    const conditionValue = (/([\=|\<|\>]+)(\d+)/).exec(rowValue[3]);
                    pendingQuestion = {
                        type: "number",
                        title: rowValue[0],
                        conditions: [{
                            key: conditionValue[1],
                            value: Number(conditionValue[2] || 0),
                            weight: Number(rowValue[4] || 0)
                        }],
                        sub_kpi: rowValue[5] || null
                    };
                } else if (pendingQuestion && pendingQuestion.type === "number" && rowValue[3] && !rowValue[1]) {
                    if ((/^\d+$/).test(rowValue[3])) {
                        rowValue[3] = `=${rowValue[3]}`
                    }
                    const conditionValue = (/([\=|\<|\>]+)(\d+)/).exec(rowValue[3]);
                    pendingQuestion.conditions.push({
                        key: conditionValue[1],
                        value: Number(conditionValue[2] || 0),
                        weight: Number(rowValue[4] || 0)
                    });
                }
            }
        } catch (exception) {

            logger.error(exception, row.values);
        }

        function addPendingQuestion() {
            if (pendingQuestion) {
                parsedResult[sheetName].kpis[kpiTitle].questions.push(pendingQuestion);
                pendingQuestion = null;
            }
        }
    });
    function addBoolQuestion(rowValue) {

    }
    workSheetReader.on('end', function () {
        console.log(workSheetReader.rowCount);
    });

    // call process after registering handlers
    workSheetReader.process();
});
workBookReader.on('end', function () {
    // end of workbook reached
    fs.writeFileSync(
        path.join(__dirname, `data/${args.data}/Questionnaires.json`),
        JSON.stringify(parsedResult)
    );
});

const fileName = args.file;
fs.createReadStream(fileName).pipe(workBookReader);