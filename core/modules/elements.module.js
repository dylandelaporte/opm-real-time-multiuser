const elements = {
    list: {},
    nextId: 0,
    type: {
        OBJECT: "object",
        PROCESS: "process",
        ARROW_CHARACTERIZATION: "arrow_characterization",
        ARROW_CHARACTERIZATION_INVERT: "arrow_characterization_invert",
        ARROW_GENERALIZATION: "arrow_generalization",
        ARROW_GENERALIZATION_INVERT: "arrow_generalization_invert",
        ARROW_AGGREGATION: "arrow_aggregation",
        ARROW_AGGREGATION_INVERT: "arrow_aggregation_invert",
        ARROW_RELATIONSHIP: "arrow_relationship",
        ARROW_INSTRUMENT: "arrow_instrument",
        ARROW_INSTRUMENT_INVERT: "arrow_instrument_invert",
        ARROW_EFFECT: "arrow_effect",
        ARROW_EFFECT_INVERT: "arrow_effect_invert",
        ARROW_CONSUMPTION: "arrow_consumption",
        ARROW_AGENT: "arrow_agent",
        ARROW_AGENT_INVERT: "arrow_agent_invert"
    },
    collisionType: {
        center: 0
    },
    elementPadding: 15,
    lineHeight: 18,
    keyWidthMap: {"0": 9, "1": 9, "2": 9, "3": 9, "4": 9, "5": 9, "6": 9, "7": 9, "8": 9, "9": 9, "!": 6, "\"": 7, "#": 9, "$": 9, "%": 15, "&": 14, "'": 3, "(": 6, ")": 6, "-": 6, "=": 10, "^": 8, "~": 10, "¥": 9, "|": 4, "q": 9, "w": 13, "e": 8, "r": 6, "t": 5, "y": 9, "u": 9, "i": 5, "o": 9, "p": 9, "@": 17, "`": 6, "[": 6, "{": 9, "a": 8, "s": 7, "d": 9, "f": 6, "g": 9, "h": 9, "j": 5, "k": 9, "l": 5, ";": 5, "+": 10, ":": 5, "*": 9, "]": 6, "}": 9, "z": 8, "x": 9, "c": 8, "v": 9, "b": 9, "n": 9, "m": 14, ",": 5, "<": 10, ".": 5, ">": 10, "/": 5, "?": 8, "_": 9, "\\": 5, "Q": 13, "W": 17, "E": 11, "R": 12, "T": 11, "Y": 13, "U": 13, "I": 6, "O": 13, "P": 10, "A": 13, "S": 10, "D": 13, "F": 10, "G": 13, "H": 13, "J": 7, "K": 13, "L": 11, "Z": 11, "X": 13, "C": 12, "V": 13, "B": 12, "N": 13, "M": 16, " ": 5}
};

elements.add = function (type, x, y) {
    const id = elements.nextId;

    elements.nextId++;

    if (type.indexOf("arrow") >= 0) {
        elements.list[x[0]].beginArrows.push(id);
        elements.list[x[1]].endArrows.push(id);

        const centerElement0 = elements.centerElement(x[0]);
        const centerElement1 = elements.centerElement(x[1]);

        elements.list[id] = {
            type: type,
            beginElement: x[0],
            endElement: x[1],
            positions: [centerElement0.x, centerElement0.y, centerElement1.x, centerElement1.y],
            hover: null,
            selected: null
        };

        elements.attachedArrows(x[0]);
    } else {
        elements.list[id] = {
            type: type,
            x: x,
            y: y,
            width: type === elements.type.OBJECT ? 58 : 65,
            height: 58,
            text: type === elements.type.OBJECT ? "Object" : "Process",
            beginArrows: [],
            endArrows: [],
            hover: null,
            selected: null
        };
    }

    let elementOutput = {};
    elementOutput[id] = elements.list[id];

    return elementOutput;
};

elements.closestPoint = function (id, x, y) {
    const element = elements.list[id];

    const distancePoint1 = elements.distance(element.x + element.width / 2, element.y, x, y);
    const distancePoint2 = elements.distance(element.x + element.width, element.y + element.height / 2, x, y);
    const distancePoint3 = elements.distance(element.x + element.width / 2, element.y + element.height, x, y);
    const distancePoint4 = elements.distance(element.x, element.y + element.height / 2, x, y);

    const min = Math.min(distancePoint1, distancePoint2, distancePoint3, distancePoint4);

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
};

elements.distance = function (x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

elements.centerElement = function (id) {
    const element = elements.list[id];

    return {x: element.x + element.width / 2, y: element.y + element.height / 2};
};

elements.move = function (id, x, y) {
    let element = elements.list[id];

    element.x = x;
    element.y = y;

    let elementsOutput = elements.attachedArrows(id);
    elementsOutput[id] = {x: x, y: y};

    return elementsOutput;
};

elements.attachedArrows = function (id) {
    let elementsOutput = {};
    let element = elements.list[id];

    for (let i = 0; i < element.beginArrows.length; i++) {
        elementsOutput[element.beginArrows[i]] = {positions: elements.updateArrow(element.beginArrows[i])};
    }

    for (let i = 0; i < element.endArrows.length; i++) {
        elementsOutput[element.endArrows[i]] = {positions: elements.updateArrow(element.endArrows[i])};
    }

    return elementsOutput;
};

elements.updateArrow = function (id) {
    let arrowElement = elements.list[id];

    const closestPointBegin = elements.closestPoint(arrowElement.beginElement, arrowElement.positions[2], arrowElement.positions[3]);

    arrowElement.positions[0] = closestPointBegin.x;
    arrowElement.positions[1] = closestPointBegin.y;

    const closestPointEnd = elements.closestPoint(arrowElement.endElement,
        arrowElement.positions[arrowElement.positions.length - 4],
        arrowElement.positions[arrowElement.positions.length - 3]);

    arrowElement.positions[arrowElement.positions.length - 2] = closestPointEnd.x;
    arrowElement.positions[arrowElement.positions.length - 1] = closestPointEnd.y;

    return arrowElement.positions;
};

elements.angleNodeArrow = function (id, nodeId) {
    if (nodeId < 1)
        return 0;

    const positions = elements.list[id].positions;

    if (nodeId > positions.length / 2)
        return 0;

    const dAx = positions[nodeId * 2] - positions[nodeId * 2 - 2];
    const dAy = positions[nodeId * 2 + 1] - positions[nodeId * 2 - 1];
    const dBx = positions[nodeId * 2 + 2] - positions[nodeId * 2];
    const dBy = positions[nodeId * 2 + 3] - positions[nodeId * 2 + 1];

    let angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);

    if(angle < 0) {
        angle = angle * -1;
    }

    return angle * (180 / Math.PI);
};

elements.collisions = function (mouseProperties) {
    const elementIds = Object.keys(elements.list);

    for (let i = 0; i < elementIds.length; i++) {
        const element = elements.list[elementIds[i]];

        if (element.positions) {
            for (let j = 2; j < element.positions.length - 2; j = j + 2) {
                const circleCollision = elements.circleRect(
                    element.positions[j],
                    element.positions[j + 1],
                    5,
                    mouseProperties.left,
                    mouseProperties.top,
                    5,
                    5);

                if (circleCollision) {
                    return {id: elementIds[i], node: j / 2};
                }
            }

            for (let j = 0; j + 2 < element.positions.length; j = j + 2) {
                const lineCollision = elements.lineRect(
                    element.positions[j],
                    element.positions[j + 1],
                    element.positions[j + 2],
                    element.positions[j + 3],
                    mouseProperties.left,
                    mouseProperties.top,
                    5,
                    5);

                if (lineCollision) {
                    return {id: elementIds[i], position: lineCollision, after: j + 1};
                }
            }
        } else {
            if (mouseProperties.left >= elements.list[elementIds[i]].x && mouseProperties.left <= elements.list[elementIds[i]].x + elements.list[elementIds[i]].width) {
                if (mouseProperties.top >= elements.list[elementIds[i]].y && mouseProperties.top <= elements.list[elementIds[i]].y + elements.list[elementIds[i]].height) {
                    return {id: elementIds[i], type: elements.collisionType.center};
                }
            }
        }
    }

    return null;
};

//from http://www.jeffreythompson.org/collision-detection/line-rect.phphttp://www.jeffreythompson.org/collision-detection/line-rect.php
elements.lineRect = function (x1, y1, x2, y2, rx, ry, rw, rh) {

    // check if the line has hit any of the rectangle's sides
    // uses the Line/Line function below

    const top = elements.lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);

    if (top) {
        return top;
    }

    const left = elements.lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);

    if (left) {
         return left;
    }

    const right = elements.lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);

    if (right) {
        return right;
    }

    const bottom = elements.lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

    if (bottom) {
        return bottom;
    }

    return false;
};

elements.lineLine = function (x1, y1, x2, y2, x3, y3, x4, y4) {

    // calculate the direction of the lines
    let uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    let uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // if uA and uB are between 0-1, lines are colliding
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {

        // optionally, draw a circle where the lines meet
        let intersectionX = x1 + (uA * (x2 - x1));
        let intersectionY = y1 + (uA * (y2 - y1));

        return {x: intersectionX, y: intersectionY};
    }

    return false;
};

//from http://www.jeffreythompson.org/collision-detection/circle-rect.php
elements.circleRect = function (cx, cy, radius, rx, ry, rw, rh) {

    // temporary variables to set edges for testing
    let testX = cx;
    let testY = cy;

    // which edge is closest?
    if (cx < rx)         testX = rx;      // test left edge
    else if (cx > rx+rw) testX = rx+rw;   // right edge
    if (cy < ry)         testY = ry;      // top edge
    else if (cy > ry+rh) testY = ry+rh;   // bottom edge

    // get distance from closest edges
    let distX = cx-testX;
    let distY = cy-testY;
    let distance = Math.sqrt( (distX*distX) + (distY*distY) );

    // if the distance is less than the radius, collision!
    return distance <= radius;
};

module.exports = elements;