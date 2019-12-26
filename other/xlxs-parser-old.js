const XlsxStreamReader = require("xlsx-stream-reader");
const fs = require("fs");
const path = require("path");
let parsedResult = {};


function trimList(list) {
    let newList = [];
    let emptyArray = [];
    let notEmptyFound = false;
    for (let i = 0; i < list.length; i++) {
        let empty;
        if (list[i
        ] === undefined || list[i
        ] === null) {
            empty = true;
        }

        if (typeof (list[i
        ]) === 'string' && list[i
        ].trim() === "") {
            empty = true;
        }

        if (typeof (list[i
        ]) === 'number' && !isFinite(list[i
        ])) {
            empty = true;
        }

        if (empty && notEmptyFound) {
            emptyArray.push(list[i
            ]);
        }
        if (empty) {
            continue;
        }

        notEmptyFound = true;
        while (emptyArray.length > 0) {
            newList.push(emptyArray.shift());
        }
        newList.push(list[i
        ]);
    }
    return newList;
}


const workBookReader = new XlsxStreamReader();
workBookReader.on('error', function (error) {
    throw (error);
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
    // if (workSheetReader.id > 1) {
    //     // we only want first sheet
    //     workSheetReader.skip();
    //     return;
    // }
    // print worksheet name
    console.log(workSheetReader.name);
    // if we do not listen for rows we will only get end event
    // and have information about the sheet like row count
    let kpiTitle;
    const sheetName = workSheetReader.name;
    parsedResult[sheetName
    ] = {
        kpis: {}
    };
    workSheetReader.on('row', function (row) {
        row.values = trimList(row.values);
        if (row.values.length) {
            if (row.values[
                1
            ] === "YES") {
                return;
            }
            if (typeof (row.values[
                1
            ]) === "string") {
                row.values[
                    1
                ] = Number(row.values[
                    1
                ]);
            }
            if (typeof (row.values[
                2
            ]) === "string") {
                row.values[
                    2
                ] = Number(row.values[
                    2
                ]);
            }

            if (typeof (row.values[
                3
            ] && row.values[
                3
            ]) === "string") {
                row.values[
                    3
                ] = Number(row.values[
                    3
                ].replace(/\%/,
                ""));
            }

            if (row.values[
                0
            ] && row.values[
                0
            ].toLowerCase() === "total") {
                parsedResult[sheetName
                ].weight = row.values[
                    3
                ] >= 1 ? row.values[
                    3
                ] : row.values[
                    3
                ] * 100;
            } else if (!(/\?/).test(row.values[
                0
            ]) && row.values[
                1
            ] > 0 && !row.values[
                2
            ] && row.values[
                3
            ] > 0) {
                kpiTitle = row.values[
                    0
                ];
                parsedResult[sheetName
                ][
                    "kpis"
                ][kpiTitle
                ] = {};
                parsedResult[sheetName
                ][
                    "kpis"
                ][kpiTitle
                ].weight = row.values[
                    3
                ] >= 1 ? row.values[
                    3
                ] : row.values[
                    3
                ] * 100;
                parsedResult[sheetName
                ][
                    "kpis"
                ][kpiTitle
                ].questions = [];
            } else if ((/\?/).test(row.values[
                0
            ]) && typeof (row.values[
                1
            ]) === 'number' && typeof (row.values[
                2
            ]) === 'number' && row.values[
                3
            ] > 0) {
                parsedResult[sheetName
                ][
                    "kpis"
                ][kpiTitle
                ].questions.push({
                    title: row.values[
                        0
                    ],
                    type: 'Boolean',
                    conditions: [
                        {
                            "key": "=",
                            "value": 1,
                            "weight": row.values[
                                1
                            ] ? row.values[
                                3
                            ] >= 1 ? row.values[
                                3
                            ] : row.values[
                                3
                            ] * 100 : 0
                        },
                        {
                            "key": "=",
                            "value": 0,
                            "weight": row.values[
                                2
                            ] ? row.values[
                                3
                            ] >= 1 ? row.values[
                                3
                            ] : row.values[
                                3
                            ] * 100 : 0
                        }
                    ],
                    weight: row.values[
                        3
                    ] >= 1 ? row.values[
                        3
                    ] : row.values[
                        3
                    ] * 100
                });
            }
        }
    });
    workSheetReader.on('end', function () {
        console.log(workSheetReader.rowCount);
    });

    // call process after registering handlers
    workSheetReader.process();
});
workBookReader.on('end', function () {
    // end of workbook reached
    fs.writeFileSync(
        path.join(__dirname,
    "Questionnaires.json"),
        JSON.stringify(parsedResult)
    );
});

const fileName = "/home/abhilash/Downloads/Questionnaires.xlsx";
fs.createReadStream(fileName).pipe(workBookReader);