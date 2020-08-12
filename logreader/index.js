var fs = require('fs');

fs.readFile('workshop-team-log.json', 'utf8', function(err, contents) {
    //console.log(contents);

    try {
        //const res = contents.replace(/\\]\\n/g, "],");
        const regex = new RegExp("\]\\n", "g");
        const res = contents.replace(regex, "],");
        //console.log(res);
        const json = JSON.parse("[" + res.substr(0, res.length - 1) + "]");
        //console.log(json);

        let countInteractionsUsers = {};
        let timeline = [];

        for (let i = 0; i < json.length; i++) {
            const data = JSON.parse(json[i][1]);

            if (data.id) {
                let dateBegin = new Date(json[i][0]);

                if (timeline.length > 0) {
                    if (timeline[timeline.length - 1][0] !== data.id) {
                        let dateEnd = new Date(json[i - 1][0]);
                        dateEnd.setMilliseconds(dateEnd.getMilliseconds() + 1);

                        timeline[timeline.length - 1][2] = dateEnd;
                        timeline.push([data.id, dateBegin, null]);
                    }
                    else {
                        if (dateBegin.getTime() - timeline[timeline.length - 1][1].getTime() > 1000) {
                            let dateEnd = new Date(json[i - 1][0]);
                            dateEnd.setMilliseconds(dateEnd.getMilliseconds() + 1);

                            timeline[timeline.length - 1][2] = dateEnd;
                        }
                    }
                }
                else {
                    timeline.push([data.id, dateBegin, null]);
                }

                /*
                let dateBegin = new Date(json[i][0]);

                let dateEnd = new Date(json[i][0]);
                dateEnd.setMilliseconds(dateEnd.getMilliseconds() + 1);

                timeline.push([data.id, dateBegin, dateEnd]);
                 */

                if (countInteractionsUsers[data.id]) {
                    countInteractionsUsers[data.id]++;
                }
                else {
                    countInteractionsUsers[data.id] = 1;
                }
            }
        }

        console.log(countInteractionsUsers);
        console.log(JSON.stringify(timeline));

        fs.writeFileSync("test.json", JSON.stringify(timeline));
    } catch (e) {
        console.log(e);
    }
});

console.log('after calling readFile');