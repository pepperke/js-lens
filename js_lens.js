/* global SVG */

class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    setVals(x, y) {
        this.x = x;
        this.y = y;
    }
}

class PathInfo {
    constructor(id, pathD, backCurveIdx, 
                frontCurveIdx, botLineIdx=-1, topLineIdx=-1) {
        this.id = id + "-path";
        this.pathD = pathD;
        this.backCurveIdx = backCurveIdx;
        this.frontCurveIdx = frontCurveIdx;
        if (botLineIdx != -1)
            this.botLineIdx = botLineIdx;
        if (topLineIdx != -1)
            this.topLineIdx = topLineIdx;
    }
    getSegmentPoint(segmentIdx, pointIdx) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length)
            return null;
        if (pointIdx < 0 || pointIdx >= (this.pathD[segmentIdx].length - 1) / 2) {
            return null;
        }
        return new Point(this.pathD[segmentIdx][pointIdx + 1], 
                         this.pathD[segmentIdx][pointIdx + 2]);
    }
    setSegmentPoint(segmentIdx, pointIdx, x, y) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length)
            return;
        if (pointIdx < 0 || pointIdx >= (this.pathD[segmentIdx].length - 1) / 2) {
            return;
        }
        this.pathD[segmentIdx][pointIdx * 2 + 1] = x;
        this.pathD[segmentIdx][pointIdx * 2 + 2] = y;
    }
    getSegmentLengthInPoints(segmentIdx) {
        if (segmentIdx < 0 || segmentIdx >= this.pathD.length)
            return -1;
        return parseInt(this.pathD[segmentIdx].length - 1) / 2;
    }
    plot() {
        let path = SVG("#" + this.id);
        path.plot(this.pathD);
    }
}

class LensInfo {    
    constructor(id) {
        this.id = id + "-" + LensInfo.count++;
        this.path;
        this.circles = [];
    }
    setPath(pathD, backCurveIdx, frontCurveIdx, 
            botLineIdx=-1, topLineIdx=-1) {
        this.path = new PathInfo(this.id, pathD, backCurveIdx, 
                                 frontCurveIdx, botLineIdx, topLineIdx);
    }
    pushCircle(circle) {
        this.circles.push(circle);
    }
}
LensInfo.count = 1;

let lenses = [];
let circlePoints = {};
let bezierPoints = [];
const pointSize = 10;

let mainPlane = SVG("#main-plane");

function removeElementIfExists(id) {
    let elem = SVG("#" + id);
    if (elem)
        elem.remove();
}

function add(p1, p2) {
    return p1 + p2;
}

function sub(p1, p2) {
    return p1 - p2;
}

function pathCalc(path, x, y, operator) {
    for (let i = 0; i < path.length; i++) {
        let segment = path[i];
        if (segment[0] == "H") {
            path[i][1] = operator(path[i][1], x);
        }
        else if (segment[0] == "V") {
            path[i][1] = operator(path[i][1], y);
        }
        else {
            for (let j = 1; j < segment.length; j += 2) {
                path[i][j] = operator(path[i][j], x);
                path[i][j + 1] = operator(path[i][j + 1], y);
            }
        }
    }
    return path;
}

function createCircle(lens, cx, cy, id) {
    let attributes = {
        cx: cx,
        cy: cy,
        fill: "none",
        stroke: "#189ab4",
        "stroke-width": 2.5,
        style: "cursor: pointer",
        id: id
    };
    let circle = mainPlane.circle(pointSize).attr(attributes);
    circle.draggable();
    circle.on('dragmove.namespace', circleDrag);
    lens.pushCircle(circle);
}

function createPointsForLens(lens) {
    let lensId = lens.id;
    let path = lens.path.pathD;
    let cx, cy, segment, circleIdx;

    for (let i = 0; i < path.length; i++) {
        if (path[i][0] == "M") {
            circleIdx = 1;
            segment = "back-";
            cx = path[i][1];
            cy = path[i][2];
            createCircle(lens, cx, cy, lensId+"-circle-"+segment + circleIdx++);
        }
        else if (path[i][0] == "C") {
            segment = i == lens.path.backCurveIdx ? "back-" : "front-";
            for (let j = 1; j < path[i].length; j += 2) {
                cx = path[i][j];
                cy = path[i][j + 1];
                createCircle(lens, cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
        }
        else if (path[i][0] == "H" && i != path.length - 1) {
            circleIdx = 1;
            segment = segment == "back-" ? "front-" : "back-";
            cx = path[i][1];
            createCircle(lens, cx, cy, lensId+"-circle-"+segment + circleIdx++);
        }
        else if (path[i][0] == "V" && i != path.length - 1) {
            cy = path[i][1];
            createCircle(lens, cx, cy, lensId+"-circle-"+segment + circleIdx++);
        }
        else if (path[i][0] == "L" && i != path.length - 1) {
            circleIdx = 1;
            segment = segment == "back-" ? "front-" : "back-";
            cx = path[i][1];
            cy = path[i][2];
            createCircle(lens, cx, cy, lensId+"-circle-"+segment + circleIdx++);
        }
    }
}

// eslint-disable-next-line no-unused-vars
function createLens(event) {
    let mainPlaneElem = document.getElementById("main-plane");
    let yOffset = mainPlaneElem.getBoundingClientRect().y;
    let x = event.clientX;
    let y = event.clientY - yOffset;

    let midPoint = new Point();
    let prevCoords = new Point();
    let pathD, lens, order;

    let attr = {
        stroke: "#00a0f0",
        "stroke-width": 2,
        fill: "none",
        id: ""
    };

    let lensId = event.target.id;

    if (lensId == "biconvex") {
        pathD = new SVG.PathArray([
            ['M', 30, 1],
            ['C', -10, 70, -10, 135, 30, 200],
            ['L', 50, 200],
            ['C', 90, 135, 90, 70, 50, 1],
            ['L', 30, 1]
        ]);
        midPoint.setVals(40, 100);
        order = [1, 3, 2, 4];
    }
    lens = new LensInfo(lensId);
    
    let xDiff = midPoint.x - x;
    let yDiff = midPoint.y - y;
    pathCalc(pathD, xDiff, yDiff, sub);
    lens.setPath(pathD, ...order);

    attr.id = lens.path.id;
    createPointsForLens(lens);
    lenses.push(lens);

    let path = mainPlane.path(pathD).attr(attr);
    prevCoords.setVals(x, y);

    mainPlaneElem.addEventListener("mousemove", mouseMoveLens, false);
    mainPlaneElem.addEventListener("mouseup", mouseUpLens, false);

    function mouseMoveLens(event) {
        let pathD = path.array();
        let x = event.clientX;
        let y = event.clientY - yOffset;
        let xDiff = x - prevCoords.x;
        let yDiff = y - prevCoords.y;

        pathCalc(pathD, xDiff, yDiff, add);
        path.plot(pathD);

        prevCoords.setVals(x, y);

        let circles = lens.circles;
        for (let i = 0; i < circles.length; i++) {
            let cx = circles[i].cx();
            let cy = circles[i].cy();

            circles[i].move(cx + xDiff - pointSize / 2,
                            cy + yDiff - pointSize / 2);
        }
    }

    function mouseUpLens() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLens, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUpLens, false);
    }
}

// eslint-disable-next-line no-unused-vars
// function createLine(event) {
//  
//     function mouseMoveLine(event) {
//         let lineCoords = line.array();
//         let x = event.clientX;
//         let y = event.clientY - yOffset;

//         let yTop, yBot, xTop, xBot;
//         if (lineCoords[0][1] < lineCoords[1][1]) {
//             [xTop, yTop] = lineCoords[0];
//             [xBot, yBot] = lineCoords[1];
//         }
//         else {
//             [xTop, yTop] = lineCoords[1];
//             [xBot, yBot] = lineCoords[0];
//         }

//         let xAvg = (xBot - xTop) / 2;
//         let yAvg = (yBot - yTop) / 2;
//         xTop = x - xAvg;
//         yTop = y - yAvg;
//         xBot = x + xAvg;
//         yBot = y + yAvg;

//         let c1 = SVG("#c-line-1");
//         let c2 = SVG("#c-line-2");

//         if (!c1) {
//             attributes.id = "c-line-1";
//             attributes.cx = xTop;
//             attributes.cy = yTop;
//             c1 = mainPlane.circle(pointSize).attr(attributes);
//         }
//         else
//             c1.move(xTop - pointSize / 2, yTop - pointSize / 2);

//         if (!c2) {
//             attributes.id = "c-line-2";
//             attributes.cx = xBot;
//             attributes.cy = yBot;
//             c2 = mainPlane.circle(pointSize).attr(attributes);
//         }
//         else
//             c2.move(xBot - pointSize / 2, yBot - pointSize / 2);

//         let startPoint = circlePoints[1];
//         let endPoint = circlePoints[4];

//         let distance1 = Math.pow((startPoint.x - xTop)**2 + (startPoint.y - yTop)**2, 0.5);
//         let distance2 = Math.pow((endPoint.x - xBot)**2 + (endPoint.y - yBot)**2, 0.5);
//         if (distance1 < pointSize / 2 && distance2 < pointSize / 2) {
//             removeElementIfExists("c-line-1");
//             removeElementIfExists("c-line-2");

//             line.plot(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
//             return;
//         }
//         line.plot(xTop, yTop, xBot, yBot);
//     }

//     function rotateOnScroll(event) {
//         let lineCoords = line.array();
//         let x = event.clientX;
//         let y = event.clientY - yOffset;
//         let yTop = lineCoords[0][1] - y;
//         let xTop = lineCoords[0][0] - x;
//         let yBot = lineCoords[1][1] - y;
//         let xBot = lineCoords[1][0] - x;
//         let angle = 2 / 180 * Math.PI;
//         angle = event.deltaY < 0 ? angle : -angle;

//         let newXTop = xTop * Math.cos(angle) - yTop * Math.sin(angle) + x;
//         let newYTop = xTop * Math.sin(angle) + yTop * Math.cos(angle) + y;
//         let newXBot = xBot * Math.cos(angle) - yBot * Math.sin(angle) + x;
//         let newYBot = xBot * Math.sin(angle) + yBot * Math.cos(angle) + y;

//         if (newYTop > newYBot) {
//             [newXTop, newYTop, newXBot, newYBot] = [newXBot, newYBot, newXTop, newYTop];
//         }
//         line.plot(newXTop, newYTop, newXBot, newYBot);
//     }

//     function mouseUp() {
//         mainPlaneElem.removeEventListener("mousemove", mouseMoveLine, false);
//         mainPlaneElem.removeEventListener("wheel", rotateOnScroll, false);
//         mainPlaneElem.removeEventListener("mouseup", mouseUp, false);
//     }
// }

function circleDrag(event) {
    const { handler, box } = event.detail;
    event.preventDefault();
    let { x, y } = box;
    handler.move(x - pointSize / 2, y - pointSize / 2);
    
    let circleId = event.currentTarget.id.split("-");
    let lensId = circleId[0] + "-" + circleId[1];
    let lens = lenses.find(lens => lens.id == lensId);
    moveAdjacent(x, y, circleId, lens);
}

function moveAdjacent(x, y, circleId, lens) {
    let adj1CurveIdx, adj2CurveIdx, adj1PointIdx, adj2PointIdx; 
    let curveIdx;
    let curve = circleId[3];
    let circleIdx = circleId[4];
    
    if (curve == "back") {
        curveIdx = lens.path.backCurveIdx;
        if (circleIdx == 1) {
            if (lens.path.topLineIdx > 0)
                adj1CurveIdx = lens.path.topLineIdx;
            else
                adj1CurveIdx = lens.frontCurveIdx;
            lens.path.setSegmentPoint(0, 0, x, y);
        }
    }
    else {
        curveIdx = lens.path.frontCurveIdx;
        if (circleIdx == 1) {
            if (lens.path.topLineIdx > 0)
                adj1CurveIdx = lens.path.botLineIdx;
            else
                adj1CurveIdx = lens.backCurveIdx;
        }
    }

    if (circleIdx == 1) {
        adj1PointIdx = lens.path.getSegmentLengthInPoints(adj1CurveIdx);        
        if (adj1PointIdx < 0)
            return;
        adj2CurveIdx = curveIdx;
        adj2PointIdx = circleIdx;
    }
    else {
        adj1CurveIdx = curveIdx;
        adj1PointIdx = circleIdx - 1;
        adj2CurveIdx = -1;
    }

    lens.path.setSegmentPoint(adj1CurveIdx, adj1PointIdx - 1, x, y);
    if (adj2CurveIdx > -1)
        lens.path.setSegmentPoint(adj2CurveIdx, adj2PointIdx - 1, x, y);
    lens.path.plot();
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
