/* global SVG */

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    setVals(x, y) {
        this.x = x;
        this.y = y;
    }
}

let circlePoints = {};
let bezierPoints = [];
const pointSize = 15;

let mainPlane = SVG("#main-plane");

function removeElementIfExists(id) {
    let elem = SVG("#" + id);
    if (elem)
        elem.remove();
}

// eslint-disable-next-line no-unused-vars
function createLine(event) {
    let mainPlaneElem = document.getElementById("main-plane");
    let yOffset = mainPlaneElem.getBoundingClientRect().y;
    let x = event.clientX;
    let y = event.clientY - yOffset;
    let halfHeight = 105;
    
    removeElementIfExists("line");
    removeElementIfExists("c-line-1");
    removeElementIfExists("c-line-2");

    let attributes = {
        cx: x,
        cy: y - halfHeight + pointSize / 2,
        fill: "white",
        stroke: "#189ab4",
        "stroke-width": 1,
        style: "cursor: pointer",
        id: ""
    };

    attributes.id = "c-line-1";
    let c1 = mainPlane.circle(pointSize).attr(attributes);
    attributes.cy = y + halfHeight - pointSize / 2;
    attributes.id = "c-line-2";
    let c2 = mainPlane.circle(pointSize).attr(attributes);

    c1.draggable();
    c1.on('dragmove.namespace', circleOnLineDrag);
    c2.draggable();
    c2.on('dragmove.namespace', circleOnLineDrag);

    let line = mainPlane.line(x, y - halfHeight,
                              x, y + halfHeight)
                        .stroke({ width: 2, color: '#00a0f0' })
                        .attr({ id: "line" });
    
    mainPlaneElem.addEventListener("mousemove", mouseMoveLine, false);
    mainPlaneElem.addEventListener("wheel", rotateOnScroll, false);
    mainPlaneElem.addEventListener("mouseup", mouseUp, false);

    function mouseMoveLine(event) {
        let lineCoords = line.array();
        let x = event.clientX;
        let y = event.clientY - yOffset;

        let yTop, yBot, xTop, xBot;
        if (lineCoords[0][1] < lineCoords[1][1]) {
            [xTop, yTop] = lineCoords[0];
            [xBot, yBot] = lineCoords[1];
        }
        else {
            [xTop, yTop] = lineCoords[1];
            [xBot, yBot] = lineCoords[0];
        }

        let xAvg = (xBot - xTop) / 2;
        let yAvg = (yBot - yTop) / 2;
        xTop = x - xAvg;
        yTop = y - yAvg;
        xBot = x + xAvg;
        yBot = y + yAvg;

        let c1 = SVG("#c-line-1");
        let c2 = SVG("#c-line-2");

        if (!c1) {
            attributes.id = "c-line-1";
            attributes.cx = xTop;
            attributes.cy = yTop;
            c1 = mainPlane.circle(pointSize).attr(attributes);
        }
        else
            c1.move(xTop - pointSize / 2, yTop - pointSize / 2);

        if (!c2) {
            attributes.id = "c-line-2";
            attributes.cx = xBot;
            attributes.cy = yBot;
            c2 = mainPlane.circle(pointSize).attr(attributes);
        }
        else
            c2.move(xBot - pointSize / 2, yBot - pointSize / 2);

        let startPoint = circlePoints[1];
        let endPoint = circlePoints[4];

        let distance1 = Math.pow((startPoint.x - xTop)**2 + (startPoint.y - yTop)**2, 0.5);
        let distance2 = Math.pow((endPoint.x - xBot)**2 + (endPoint.y - yBot)**2, 0.5);
        if (distance1 < pointSize / 2 && distance2 < pointSize / 2) {
            removeElementIfExists("c-line-1");
            removeElementIfExists("c-line-2");

            line.plot(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            return;
        }
        line.plot(xTop, yTop, xBot, yBot);
    }

    function rotateOnScroll(event) {
        let lineCoords = line.array();
        let x = event.clientX;
        let y = event.clientY - yOffset;
        let yTop = lineCoords[0][1] - y;
        let xTop = lineCoords[0][0] - x;
        let yBot = lineCoords[1][1] - y;
        let xBot = lineCoords[1][0] - x;
        let angle = 2 / 180 * Math.PI;
        angle = event.deltaY < 0 ? angle : -angle;

        let newXTop = xTop * Math.cos(angle) - yTop * Math.sin(angle) + x;
        let newYTop = xTop * Math.sin(angle) + yTop * Math.cos(angle) + y;
        let newXBot = xBot * Math.cos(angle) - yBot * Math.sin(angle) + x;
        let newYBot = xBot * Math.sin(angle) + yBot * Math.cos(angle) + y;

        if (newYTop > newYBot) {
            [newXTop, newYTop, newXBot, newYBot] = [newXBot, newYBot, newXTop, newYTop];
        }
        line.plot(newXTop, newYTop, newXBot, newYBot);
    }

    function mouseUp() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLine, false);
        mainPlaneElem.removeEventListener("wheel", rotateOnScroll, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUp, false);
    }
}

function circleOnLineDrag(event) {
    
}

// eslint-disable-next-line no-unused-vars
function onClickFrontCurve() {
    let pointsLength = Object.keys(circlePoints).length + 1;
    let len_not_1_or_4 = (pointsLength - 1) * (pointsLength - 4);
    let offset = 0;

    if (len_not_1_or_4)
        offset = 100;
        
    let x = 100 + offset;
    let y = pointsLength * 70 + 10;

    if (pointsLength > 4)
        return;
    circlePoints[pointsLength] = new Point(x, y);

    drawPoints(x, y, pointsLength);
}

function drawPoints(x, y, pointsLength) {
    let attributes = {
        cx: x,
        cy: y,
        fill: "white",
        stroke: "#00f0a0",
        "stroke-width": 1,
        style: "cursor: pointer",
        id: `c-${pointsLength}`
    };

    let circle = mainPlane.circle(pointSize).attr(attributes);
    circle.draggable();
    circle.on('dragmove.namespace', circleDrag);

    calcBezierPoints(pointsLength);
    if (bezierPoints.length == 0)
        return;
    
    let frontPathD = new SVG.PathArray([
        "M",
        circlePoints[1].x, circlePoints[1].y,
        "Q",
        circlePoints[2].x, circlePoints[2].y,
        circlePoints[3].x, circlePoints[3].y
    ]);

    if (pointsLength == 4) {
        frontPathD[1][0] = "C";
        frontPathD[1].push(circlePoints[4].x, circlePoints[4].y);
    }
    else if (pointsLength != 3)
        return;

    removeElementIfExists("frontCurve");

    mainPlane.path(frontPathD).stroke({ width: 2, color: '#00a0f0' })
             .fill("none").id("frontCurve");
}

function circleDrag(event) {
    const { handler, box } = event.detail;
    event.preventDefault();

    let { x, y } = box;
    let circleId = event.currentTarget.id;
    let circleIdx = parseInt(circleId.split("-")[1]);

    [x, y] = calcXY(x, y, circleIdx, box);
    handler.move(x, y);
    // document.getElementById("coords").innerHTML = `${x} ${}` 

    movePath(x, y, circleIdx, box, "frontCurve");
    moveLine(x, y, circleIdx);

    circlePoints[circleIdx].setVals(x, y);
}

function movePath(x, y, circleIdx, box, id) {
    let path = SVG("#" + id);
    if (!path)
        return;

    let frontPathD = path.array();
    let firstIdx = 0, secondIdx = 1;

    if (circleIdx != 1) {
        firstIdx = 1;
        secondIdx += (circleIdx - 2) * 2;
    }

    x += box.w / 2;
    y += box.h / 2;
    frontPathD[firstIdx][secondIdx] = x;
    frontPathD[firstIdx][secondIdx + 1] = y;
    path.plot(frontPathD);
}

function moveLine(x, y, circleIdx) {
    let line = SVG("#line");
    if (!line || circleIdx == 2 || circleIdx == 3)
        return;
    
    let lineCoords = line.array();
    let circlePoint = circlePoints[circleIdx];
    let idx = Math.floor(circleIdx / 4);

    if (lineCoords[idx][0] != circlePoint.x
        || lineCoords[idx][1] != circlePoint.y) {
        return;
    }
    lineCoords[idx][0] = x + pointSize / 2;
    lineCoords[idx][1] = y + pointSize / 2;
    line.plot([lineCoords[0], lineCoords[1]]);
}

function calcBezierPoints(pointsLength) {
    bezierPoints = [];
    let dt = 0.01;
    if (pointsLength == 3) {
        for (let t = 0; t < 1; t += dt) {
            let c1 = (1 - t) * (1 - t);
            let c2 = 2 * t * (1 - t);
            let c3 = t * t;

            let x = c1 * circlePoints[1].x + c2 * circlePoints[2].x 
                    + c3 * circlePoints[3].x;
            let y = c1 * circlePoints[1].y + c2 * circlePoints[2].y 
                    + c3 * circlePoints[3].y;
            bezierPoints.push(new Point(x, y));
        }
    }
    else if (pointsLength == 4) {
        for (let t = 0; t < 1; t += dt) {
            let c1 = (1 - t) * (1 - t) * (1 - t);
            let c2 = 3 * t * (1 - t) * (1 - t);
            let c3 = 3 * t * t * (1 - t);
            let c4 = t * t * t;

            let x = c1 * circlePoints[1].x + c2 * circlePoints[2].x 
                    + c3 * circlePoints[3].x + c4 * circlePoints[4].x;
            let y = c1 * circlePoints[1].y + c2 * circlePoints[2].y 
                    + c3 * circlePoints[3].y + c4 * circlePoints[4].y;
            bezierPoints.push(new Point(x, y));
        }
    }
    else {
        return;
    }
}

function argminAndArgmax(array) {
    let maxIdx = 0, minIdx = 0;
    let max = array[0], min = array[0];
    for (let i = 1; i < array.length; i++) {
        let element = array[i];
        if (element > max) {
            max = element;
            maxIdx = i;
        }
        else if (element < min) {
            min = element;
            minIdx = i;
        }
    }
    return [minIdx, maxIdx];
}

function calcXY(x, y, circleIdx, box) {
    // первое предположение: точек всегда > 2
    // второе: третья точка не находится справа последней
    const mainSVG = mainPlane.node;
    let prevCircle = circleIdx - 1;
    let nextCircle = circleIdx + 1;

    let pointsLength = Object.keys(circlePoints).length;

    if (circleIdx == 1) { // top
        let nextPoint = circlePoints[nextCircle];
        if (x < mainSVG.clientLeft)
            x = mainSVG.clientLeft;
        else if (box.x2 > nextPoint.x)
            x = nextPoint.x - box.w;

        if (y < mainSVG.clientTop)
            y = mainSVG.clientTop;
        else if (box.y2 > nextPoint.y)
            y = nextPoint.y - box.h;

        return [x, y];
    }
    else if (circleIdx == 2) {
        return calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG);
    }
    else if (circleIdx == 3) {
        if (pointsLength == 3) {
            return calcXYLast(x, y, box, prevCircle, mainSVG);
        }
        else {
            return calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG);
        }
    }
    else if (circleIdx == 4) {
        return calcXYLast(x, y, box, prevCircle, mainSVG);
    }
}

function calcXYMiddle(x, y, box, prevCircle, nextCircle, mainSVG) {
    let xMax = Math.max(circlePoints[1].x, circlePoints[4].x);
    if (x < xMax)
        x = xMax;
    else if (box.x2 > mainSVG.clientWidth)
        x = mainSVG.clientWidth - box.w;
    
    let prevPoint = circlePoints[prevCircle]
    let nextPoint = circlePoints[nextCircle];
    if (y < prevPoint.y + box.h)
        y = prevPoint.y + box.h;
    else if (y > nextPoint.y - box.h)
        y = nextPoint.y - box.h;
    
    return [x, y];
}

function calcXYLast(x, y, box, prevCircle, mainSVG) {
    let prevPoint = circlePoints[prevCircle];
    if (x < mainSVG.clientLeft)
        x = mainSVG.clientLeft;
    else if (box.x2 > prevPoint.x)
        x = prevPoint.x - box.w;

    if (box.y2 > mainSVG.clientHeight)
        y = mainSVG.clientHeight - box.h - 1;
    else if (y < prevPoint.y + box.h)
        y = prevPoint.y + box.h;
    return [x, y];
}