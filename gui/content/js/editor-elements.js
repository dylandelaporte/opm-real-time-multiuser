const container = {
    element: document.getElementById("view-container"),
    gap: {
        x: 0,
        y: 0
    },
    setXGap: function (x) {
        container.gap.x = x;
        container.element.style.marginLeft = x + "px";
    },
    setYGap: function (y) {
        container.gap.y = y;
        container.element.style.marginTop = y + "px";
    }
};

const mouses = {
    list: {},
    containerMargin: null,
    get: function (id) {
        if (!mouses.list[id]) {
            mouses.add(id);
        }

        return mouses.list[id];
    },
    add: function (id) {
        const mouseDiv = document.createElement("div");

        mouseDiv.classList.add("mouse-pointer", "fas", "fa-dot-circle");
        mouseDiv.style.color = getColorFromId(id);

        mouseDiv.id = "pointer-" + hashCode(id);

        document.body.appendChild(mouseDiv);

        mouses.list[id] = mouseDiv;

        //update users
        const users = document.getElementById("users");

        const span = document.createElement("span");
        span.id = "user-" + hashCode(id);
        span.classList.add("user");
        span.style.backgroundColor = getColorFromId(id);
        span.innerText = id;

        users.appendChild(span);

        mouses.containerMargin = container.element.getBoundingClientRect();
    },
    update: function (id, data) {
        const mouse = mouses.list[id];

        var regx = new RegExp('\\b' + "fa-" + '(.*)?\\b', 'g');
        mouse.className = mouse.className.replace(regx, '');

        if (data.click.left) {
            mouse.classList.add("fa-arrows-alt");
        }
        else if (data.click.right) {
            mouse.classList.add("fa-trash");
        }
        else {
            mouse.classList.add("fa-dot-circle");
        }

        mouse.style.left = container.gap.x + mouses.containerMargin.left + data.left + "px";
        mouse.style.top = container.gap.y + mouses.containerMargin.top + data.top + "px";
    },
    delete: function (id) {
        if (mouses.list[id]) {
            document.body.removeChild(mouses.list[id]);

            delete mouses.list[id];

            const users = document.getElementById("users");
            users.removeChild(document.getElementById("user-" + hashCode(id)));
        }
    }
};

const elements = {
    list: {},
    layer: null,
    toolbarLayer: null,
    toolbar: {},
    stage: null,
    backgroundRect: null,
    setup: function (data) {
        if (elements.stage !== null) {
            if (elements.stage.width() !== data.width || elements.stage.height() !== data.height) {
                elements.stage.width(data.width);
                elements.stage.height(data.height);

                elements.backgroundRect.width(data.width);
                elements.backgroundRect.height(data.height);

                elements.layer.draw();
            }
        } else {
            elements.stage = new Konva.Stage({
                container: 'view-container',
                width: data.width,
                height: data.height
            });

            elements.layer = new Konva.Layer();

            elements.backgroundRect = new Konva.Rect({
                x: 0,
                y: 0,
                width: data.width,
                height: data.height,
                fill: "#FFFFFF"
            });

            elements.layer.add(elements.backgroundRect);

            elements.stage.add(elements.layer);

            container.element.style.marginLeft =  "0px";
        }

        //pixel gap
        console.log("gap", data.scrollWidth, data.scrollHeight);

        let xGap = data.scrollWidth;

        //console.log("xGap", xGap);

        const zoneToDisplay = data.width + xGap;

        //console.log("zoneToDisplay", zoneToDisplay);

        if (zoneToDisplay < window.innerWidth) {
            //console.log("yes");

            const freeWindowGap = window.innerWidth - zoneToDisplay;
            const freeZoneGap = data.width - zoneToDisplay;

            //console.log("freeWindowGap", freeWindowGap);
            //console.log("freeZoneGap", freeZoneGap);

            const temporaryXGap = xGap + (freeWindowGap > freeZoneGap ? freeZoneGap : freeWindowGap);

            //console.log("temporaryXGap", temporaryXGap);

            if (temporaryXGap <= 0) {
                xGap = temporaryXGap;
            }
        }

        container.setXGap(xGap);

        let yGap = data.scrollHeight;

        //console.log("yGap", yGap);

        const heightToDisplay = data.height + yGap;

        //console.log("heightToDisplay", heightToDisplay);

        if (heightToDisplay < window.innerHeight) {
            //console.log("yes height");

            const freeWindowGap = window.innerHeight - heightToDisplay;
            const freeZoneGap = data.height - heightToDisplay;

            //console.log("freeWindowGap", freeWindowGap);
            //console.log("freeZoneGap", freeZoneGap);

            const temporaryYGap = yGap + (freeWindowGap > freeZoneGap ? freeZoneGap : freeWindowGap);

            //console.log("temporaryXGap", temporaryYGap);

            if (temporaryYGap <= 0) {
                yGap = temporaryYGap;
            }
        }

        container.setYGap(yGap);

        console.log("final gap", xGap, yGap);

        //elements.updateToolbarOffset();
    },
    updateToolbar: function (data) {
        const buttons = Object.keys(data);

        if (!elements.toolbarLayer) {
            elements.toolbarLayer = new Konva.Layer();
            elements.stage.add(elements.toolbarLayer);
        }

        for (let i = 0; i < buttons.length; i++) {
            if (elements.toolbar[buttons[i]]) {

            }
            else {
                console.log(data[buttons[i]]);

                const button = new Konva.Label({
                    x: data[buttons[i]].x,
                    y: data[buttons[i]].y,
                    opacity: 0.75
                });

                button.add(new Konva.Tag({
                    fill: 'black',
                    lineJoin: 'round',
                    shadowColor: 'black',
                    shadowBlur: 10,
                    shadowOffset: 10,
                    shadowOpacity: 0.5
                }));

                button.add(new Konva.Text({
                    width: data[buttons[i]].width,
                    height: data[buttons[i]].height,
                    text: data[buttons[i]].text,
                    fontFamily: 'Arial',
                    fontSize: 18,
                    padding: 5,
                    fill: 'white'
                }));

                elements.toolbar[buttons[i]] = button;

                elements.toolbarLayer.add(button);
            }
        }

        elements.toolbarLayer.draw();

        //elements.updateToolbarOffset();
    },
    updateToolbarOffset: function () {
        if (elements.toolbarLayer) {
            elements.toolbarLayer.offsetX(container.gap.x);
            elements.toolbarLayer.offsetY(container.gap.y);

            elements.toolbarLayer.draw();
        }
    },
    add: function (id, data) {
        if (data.type.indexOf("arrow") >= 0) {
            const positions = data.positions;

            const lineElement = new Konva.Line({
                //points: positions,
                stroke: "black",
                strokeWidth: 3,
                lineCap: "round",
                lineJoin: "round"
            });

            elements.layer.add(lineElement);

            /*
            const pointerElement = new Konva.RegularPolygon({
                x: positions[0],
                y: positions[1],
                sides: 3,
                radius: 5,
                stroke: "black",
                strokeWidth: 3,
                offset: {
                    x: 0,
                    y: -5
                }
            });

            pointerElement.rotate(-90);

            elements.layer.add(pointerElement);*/

            elements.list[id] = {
                mainElement: lineElement,
                //pointerElement: pointerElement,
                pointerElements: [],
                nodeElements: [],
                type: data.type,
                selected: data.selected,
                hover: data.hover,
                angle1: 0,
                angle2: 0
            };

            elements.updateNodes(id, data);
            elements.updatePointer(id, data);
        } else {
            const textElement = new Konva.Text({
                x: data.x,
                y: data.y + 22,
                text: data.text,
                fontSize: 18,
                fontFamily: 'Calibri',
                fill: '#555',
                width: data.width,
                align: 'center'
            });

            let areaElement;

            if (data.type === "object") {
                areaElement = new Konva.Rect({
                    x: data.x,
                    y: data.y,
                    fill: '#ffffff',
                    width: data.width,
                    height: data.height,
                    shadowColor: 'black',
                    shadowBlur: 5,
                    shadowOffsetX: 5,
                    shadowOffsetY: 5,
                    shadowOpacity: 0.1,
                    cornerRadius: 2
                });
            } else {
                areaElement = new Konva.Ellipse({
                    x: data.x + data.width / 2,
                    y: data.y + data.height / 2,
                    width: data.width,
                    height: data.height,
                    fill: '#ffffff'
                });
            }

            elements.layer.add(areaElement);
            elements.layer.add(textElement);

            elements.list[id] = {
                mainElement: areaElement,
                textElement: textElement,
                type: data.type,
                x: data.x,
                y: data.y,
                selected: data.selected,
                hover: data.hover
            };

            elements.selection(id);
        }

        elements.layer.draw();

        console.log("elements.list keys.length", Object.keys(elements.list).length);
    },
    update: function (id, data) {
        if (elements.list[id]) {
            if (data.deleted) {
                elements.list[id].mainElement.destroy();

                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    //elements.list[id].pointerElement.destroy();

                    for (let i = 0; i < elements.list[id].pointerElements.length; i++) {
                        elements.list[id].pointerElements[i].destroy();
                    }

                    for (let i = 0; i < elements.list[id].nodeElements.length; i++) {
                        elements.list[id].nodeElements[i].destroy();
                    }
                }
                else {
                    elements.list[id].textElement.destroy();
                }

                delete elements.list[id];
            } else {
                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    elements.updateNodes(id, data);
                    elements.updatePointer(id, data);
                } else {
                    if (data.text !== undefined) {
                        elements.list[id].textElement.text(data.text);
                    }

                    if (data.width !== undefined) {
                        elements.list[id].textElement.width(data.width);

                        elements.list[id].mainElement.width(data.width);

                        data.x = elements.list[id].x;
                        data.y = elements.list[id].y;
                    }

                    if (data.height !== undefined) {
                        elements.list[id].mainElement.height(data.height);

                        data.x = elements.list[id].x;
                        data.y = elements.list[id].y;
                    }

                    if (data.x !== undefined  && data.y !== undefined) {
                        elements.list[id].x = data.x;
                        elements.list[id].y = data.y;

                        elements.list[id].textElement.x(data.x);
                        elements.list[id].textElement.y(data.y + 22);

                        if (elements.list[id].type === "object") {
                            elements.list[id].mainElement.x(data.x);
                            elements.list[id].mainElement.y(data.y);
                        } else {
                            elements.list[id].mainElement.x(data.x + elements.list[id].mainElement.width() / 2);
                            elements.list[id].mainElement.y(data.y + elements.list[id].mainElement.height() / 2);
                        }
                    }
                }

                if (data.selected !== undefined) {
                    elements.list[id].selected = data.selected;

                    elements.selection(id);
                }

                if (data.hover !== undefined) {
                    elements.list[id].hover = data.hover;

                    elements.selection(id);
                }
            }

            elements.layer.draw();
        } else {
            elements.add(id, data);
        }
    },
    selection: function (id) {
        console.log("selection");

        if (elements.list[id].selected !== null) {
            elements.list[id].mainElement.strokeWidth(5);
            elements.list[id].mainElement.stroke(mouses.get(elements.list[id].selected).style.color);

            if (elements.list[id].type.indexOf("arrow") >= 0) {
                //elements.list[id].pointerElement.strokeWidth(5);
                //elements.list[id].pointerElement.stroke(mouses.get(elements.list[id].selected).style.color);

                for (let i = 0; i < elements.list[id].pointerElements.length; i++) {
                    elements.list[id].pointerElements[i].strokeWidth(5);
                    elements.list[id].pointerElements[i].stroke(mouses.get(elements.list[id].selected).style.color);
                }
            }
        } else {
            elements.list[id].mainElement.strokeWidth(3);

            if (elements.list[id].type.indexOf("arrow") >= 0) {
                //elements.list[id].pointerElement.strokeWidth(3);

                for (let i = 0; i < elements.list[id].pointerElements.length; i++) {
                    elements.list[id].pointerElements[i].strokeWidth(3);
                }
            }

            if (elements.list[id].hover !== null) {
                console.log("hover", elements.list[id].hover);
                console.log(mouses.get(elements.list[id].hover));
                console.log(mouses.get(elements.list[id].hover).style.color);

                const color = mouses.get(elements.list[id].hover).style.color;

                elements.list[id].mainElement.stroke(color);

                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    //elements.list[id].pointerElement.stroke(mouses.get(elements.list[id].hover).style.color);

                    for (let i = 0; i < elements.list[id].pointerElements.length; i++) {
                        elements.list[id].pointerElements[i].stroke(color);
                    }
                }
            } else {
                switch (elements.list[id].type) {
                    case "object":
                        elements.list[id].mainElement.stroke("#2e923b");
                        break;
                    case "process":
                        elements.list[id].mainElement.stroke("#1b2399");
                        break;
                    default:
                        elements.list[id].mainElement.stroke("#000000");
                }

                if (elements.list[id].type.indexOf("arrow") >= 0) {
                    //elements.list[id].pointerElement.stroke("#000000");

                    for (let i = 0; i < elements.list[id].pointerElements.length; i++) {
                        elements.list[id].pointerElements[i].stroke("#000000");
                    }
                }
            }
        }
    },
    updatePointer: function (id, data) {
        console.log("updatePointer", id, data);

        let element = elements.list[id];

        console.log(element);

        if (data.type) {
            console.log("change type");

            /*
            if (element.pointerElement) {
                element.pointerElement.destroy();
            }*/

            for (let i = 0; i < element.pointerElements.length; i++) {
                element.pointerElements[i].destroy();
            }

            element.pointerElements = [];

            element.angle1 = 0;
            element.angle2 = 0;

            if (data.type === "arrow_characterization" || data.type === "arrow_characterization_invert") {
                let pointerElement1 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 15,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -15
                    }
                });

                pointerElement1.rotate(-90);

                element.pointerElements.push(pointerElement1);

                elements.layer.add(pointerElement1);

                let pointerElement2 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 5,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "black",
                    offset: {
                        x: 0,
                        y: -15
                    }
                });

                pointerElement2.rotate(-90);

                element.pointerElements.push(pointerElement2);

                elements.layer.add(pointerElement2);
            }
            else if (data.type === "arrow_generalization" || data.type === "arrow_generalization_invert") {
                let pointerElement1 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 15,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -15
                    }
                });

                pointerElement1.rotate(-90);

                element.pointerElements.push(pointerElement1);

                elements.layer.add(pointerElement1);
            }
            else if (data.type === "arrow_aggregation" || data.type === "arrow_aggregation_invert") {
                let pointerElement1 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 15,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "black",
                    offset: {
                        x: 0,
                        y: -15
                    }
                });

                pointerElement1.rotate(-90);

                element.pointerElements.push(pointerElement1);

                elements.layer.add(pointerElement1);
            }
            else if (data.type === "arrow_relationship") {
                let pointElements1 = new Konva.Line({
                    strokeWidth: 3,
                    stroke: "black",
                    points: [0, 0, 15, 15]
                });

                element.pointerElements.push(pointElements1);

                elements.layer.add(pointElements1);

                let pointElements2 = new Konva.Line({
                    strokeWidth: 3,
                    stroke: "black",
                    points: [0, 0, 15, 15]
                });

                element.pointerElements.push(pointElements2);

                elements.layer.add(pointElements2);
            }
            else if (data.type === "arrow_instrument" || data.type === "arrow_instrument_invert") {
                let pointerElement = new Konva.Circle({
                    sides: 3,
                    radius: 5,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -5
                    }
                });

                pointerElement.rotate(-90);

                element.pointerElements.push(pointerElement);

                elements.layer.add(pointerElement);
            }
            else if (data.type === "arrow_effect" || data.type === "arrow_effect_invert") {
                let pointerElement1 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 7,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -7
                    }
                });

                pointerElement1.rotate(-90);

                element.pointerElements.push(pointerElement1);

                elements.layer.add(pointerElement1);
            }
            else if (data.type === "arrow_consumption") {
                let pointerElement1 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 7,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -7
                    }
                });

                pointerElement1.rotate(-90);

                element.pointerElements.push(pointerElement1);

                elements.layer.add(pointerElement1);

                let pointerElement2 = new Konva.RegularPolygon({
                    sides: 3,
                    radius: 7,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "white",
                    offset: {
                        x: 0,
                        y: -7
                    }
                });

                pointerElement2.rotate(-90);

                element.pointerElements.push(pointerElement2);

                elements.layer.add(pointerElement2);
            }
            else if (data.type === "arrow_agent" || data.type === "arrow_agent_invert") {
                let pointerElement = new Konva.Circle({
                    sides: 3,
                    radius: 5,
                    stroke: "black",
                    strokeWidth: 3,
                    fill: "black",
                    offset: {
                        x: 0,
                        y: -5
                    }
                });

                pointerElement.rotate(-90);

                element.pointerElements.push(pointerElement);

                elements.layer.add(pointerElement);
            }

            if (data.type !== element.type) {
                for (let i = 0; i < element.pointerElements.length; i++) {
                    element.pointerElements[i].strokeWidth(5);
                    element.pointerElements[i].stroke(mouses.get(elements.list[id].selected).style.color);
                }
            }

            element.type = data.type;
        }

        if (data.positions || data.type) {
            const angleDeg1 = Math.atan2(element.mainElement.points()[3] - element.mainElement.points()[1],
                element.mainElement.points()[2] - element.mainElement.points()[0]) * 180 / Math.PI;

            const angleDeg2 = Math.atan2(element.mainElement.points()[element.mainElement.points().length - 3]
                - element.mainElement.points()[element.mainElement.points().length - 1],
                element.mainElement.points()[element.mainElement.points().length - 4]
                - element.mainElement.points()[element.mainElement.points().length - 2]) * 180 / Math.PI;

            if (element.type === "arrow_characterization"
                || element.type === "arrow_generalization"
                || element.type === "arrow_aggregation"
                || element.type === "arrow_relationship"
                || element.type === "arrow_instrument"
                || element.type === "arrow_effect"
                || element.type === "arrow_consumption"
                || element.type === "arrow_agent") {
                element.pointerElements[0].x(element.mainElement.points()[0]);
                element.pointerElements[0].y(element.mainElement.points()[1]);

                element.pointerElements[0].rotate(angleDeg1 - element.angle1);
            }
            else if (element.type === "arrow_characterization_invert"
                || element.type === "arrow_generalization_invert"
                || element.type === "arrow_aggregation_invert"
                || element.type === "arrow_instrument_invert"
                || element.type === "arrow_effect_invert"
                || element.type === "arrow_agent_invert") {
                element.pointerElements[0].x(element.mainElement.points()[element.mainElement.points().length - 2]);
                element.pointerElements[0].y(element.mainElement.points()[element.mainElement.points().length - 1]);

                element.pointerElements[0].rotate(angleDeg2 - element.angle2);
            }

            if (element.type === "arrow_characterization") {
                element.pointerElements[1].x(element.mainElement.points()[0]);
                element.pointerElements[1].y(element.mainElement.points()[1]);

                element.pointerElements[1].rotate(angleDeg1 - element.angle1);
            }
            else if (element.type === "arrow_characterization_invert") {
                element.pointerElements[1].x(element.mainElement.points()[element.mainElement.points().length - 2]);
                element.pointerElements[1].y(element.mainElement.points()[element.mainElement.points().length - 1]);

                element.pointerElements[1].rotate(angleDeg2 - element.angle2);

            }

            if (element.type === "arrow_relationship"
                || element.type === "arrow_consumption") {
                element.pointerElements[1].x(element.mainElement.points()[element.mainElement.points().length - 2]);
                element.pointerElements[1].y(element.mainElement.points()[element.mainElement.points().length - 1]);

                element.pointerElements[1].rotate(angleDeg2 - element.angle2);
            }

            element.angle1 = angleDeg1;
            element.angle2 = angleDeg2;
        }
    },
    updateNodes: function (id, data) {
        if (data.positions) {
            elements.list[id].mainElement.points(data.positions);

            let nodeElements = elements.list[id].nodeElements;

            console.log(nodeElements);

            const difference = (data.positions.length / 2) - (nodeElements.length + 2);

            if (difference > 0) {
                for (let i = 0; i < difference; i++) {
                    const nodeElement = new Konva.Circle({
                        x: 0,
                        y: 0,
                        radius: 5,
                        fill: "black"
                    });

                    nodeElements.push(nodeElement);

                    elements.layer.add(nodeElement);
                }
            } else if (difference < 0) {
                for (let i = 0; i < Math.abs(difference); i++) {
                    nodeElements[0].destroy();
                    nodeElements.shift();
                }
            }

            console.log(nodeElements);

            for (let i = 0; i < nodeElements.length; i++) {
                nodeElements[i].x(data.positions[i * 2 + 2]);
                nodeElements[i].y(data.positions[i * 2 + 3]);
            }
        }
    }
};

function parseEditorData(data) {
    console.log("editor data", data);
    if (data.m) {
        if (!mouses.list[data.id]) {
            mouses.add(data.id);
        }

        mouses.update(data.id, data.m);
    }

    if (data.w) {
        elements.setup(data.w);
    }

    if (data.t) {
        elements.updateToolbar(data.t);
    }

    if (data.e) {
        const elementIds = Object.keys(data.e);

        if (data.e[0]) {
            console.log(data.e[0]);
        }

        for (let i = 0; i < elementIds.length; i++) {
            elements.update(elementIds[i], data.e[elementIds[i]]);
        }
    }

    if (data.di) {
        mouses.delete(data.di.userId);
    }
}