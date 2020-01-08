const elements = {
    list: {},
    nextId: 0,
    type: {
        OBJECT: "object",
        PROCESS: "process",
        ARROW_AGGREGATION: "arrow_aggregation",
        ARROW_EXHIBITION: "arrow_exhibition"
    },
    collisionType: {
        center: 0
    }
};

elements.add = function (io, type, x, y) {
    const id = elements.nextId;

    elements.nextId++;

    if (type.indexOf("arrow") >= 0) {
        elements.list[x[0]].beginArrows.push(id);
        elements.list[x[1]].endArrows.push(id);

        const centerElement0 = elements.centerElement(x[0]);
        const centerElement1 = elements.centerElement(x[1]);

        elements.list[id] = {
            type: type,
            positions: [centerElement0.x, centerElement0.y, centerElement1.x, centerElement1.y],
            hover: null,
            selected: null
        };

        elements.move(io, x[0]);
        elements.move(io, x[1]);

        //elements.output(io, x[0]);
        //elements.output(io, x[1]);
    } else {
        elements.list[id] = {
            type: type,
            x: x,
            y: y,
            width: 300,
            height: 150,
            text: "Element " + id,
            beginArrows: [],
            endArrows: [],
            hover: null,
            selected: null
        };

        elements.output(io, id);
    }
};

elements.closestPoint = function (id, x, y) {
    const element = elements.list[id];

    console.log(element, x, y);

    if (element.type === elements.type.OBJECT) {
        console.log("object");

        const distancePoint1 = elements.distance(element.x + element.width / 2, element.y, x, y);
        const distancePoint2 = elements.distance(element.x + element.width, element.y + element.height / 2, x, y);
        const distancePoint3 = elements.distance(element.x + element.width / 2, element.y + element.height, x, y);
        const distancePoint4 = elements.distance(element.x, element.y + element.height / 2, x, y);

        const min = Math.min(distancePoint1 ,distancePoint2, distancePoint3, distancePoint4);

        console.log(distancePoint1, distancePoint2, distancePoint3, distancePoint4, min);

        switch (min) {
            case distancePoint1:
                return {x: element.x + element.width / 2, y: element.y};
            case distancePoint2:
                return {x: element.x + element.width, y: element.y + element.height / 2};
            case distancePoint3:
                return {x: element.x + element.width / 2, y: element.y + element.height};
            case distancePoint4:
                return {x: element.x, y: element.y + element.height / 2};
        }
    }
};

elements.distance = function (x1, y1, x2, y2) {
    console.log(x1, y1, x2, y2);

    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

elements.centerElement = function (id) {
    const element = elements.list[id];

    return {x: element.x + element.width / 2, y: element.y + element.height / 2};
};

elements.move = function (io, id, x, y) {
    let element = elements.list[id];

    console.log(id, element);

    if (x !== undefined && y !== undefined) {
        element.x = x;
        element.y = y;
    }

    if (element.beginArrows.length > 0) {
        for (let i = 0; i < element.beginArrows.length; i++) {
            let arrowElement = elements.list[element.beginArrows[i]];

            const closestPoint = elements.closestPoint(id, arrowElement.positions[2], arrowElement.positions[3]);

            arrowElement.positions[0] = closestPoint.x;
            arrowElement.positions[1] = closestPoint.y;

            elements.output(io, element.beginArrows[i]);
        }
    }

    if (element.endArrows.length > 0) {
        for (let i = 0; i < element.endArrows.length; i++) {
            let arrowElement = elements.list[element.endArrows[i]];

            console.log(arrowElement.positions[arrowElement.positions.length - 4],
                arrowElement.positions[arrowElement.positions.length - 3],
                arrowElement);

            const closestPoint = elements.closestPoint(id,
                arrowElement.positions[arrowElement.positions.length - 4],
                arrowElement.positions[arrowElement.positions.length - 3]);

            arrowElement.positions[arrowElement.positions.length - 2] = closestPoint.x;
            arrowElement.positions[arrowElement.positions.length - 1] = closestPoint.y;

            console.log("arrowElement", arrowElement, closestPoint);

            elements.output(io, element.endArrows[i]);
        }
    }

    elements.output(io, id);
};

elements.output = function (io, id) {
    io.emit("element", {id: id, properties: elements.list[id]});
};

elements.outputAll = function (io) {
    const elementIds = Object.keys(elements.list);

    for (let i = 0; i < elementIds.length; i++) {
        console.log(i, elementIds[i]);
        elements.output(io, elementIds[i]);
    }
};

elements.collisions = function (mouseProperties) {
    const elementIds = Object.keys(elements.list);

    for (let i = 0; i < elementIds.length; i++) {
        if (mouseProperties.left >= elements.list[elementIds[i]].x && mouseProperties.left <= elements.list[elementIds[i]].x + elements.list[elementIds[i]].width) {
            if (mouseProperties.top >= elements.list[elementIds[i]].y && mouseProperties.top <= elements.list[elementIds[i]].y + elements.list[elementIds[i]].height) {
                return {id: elementIds[i], type: elements.collisionType.center};
            }
        }
    }

    return null;
};

module.exports = elements;