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
    constructor(id, pathD, backCurveIdx, frontCurveIdx, botLineIdx=-1, topLineIdx=-1) {
        this.id = id + "-path";
        this.backCurveIdx = backCurveIdx;
        this.frontCurveIdx = frontCurveIdx;
        if (botLineIdx != -1)
            this.botLineIdx = botLineIdx;
        if (topLineIdx != -1)
            this.topLineIdx = topLineIdx;

        let attr = {
            stroke: "#00a0f0",
            "stroke-width": 2,
            fill: "none",
            id: this.id,
            cursor: "pointer"
        };
        this.path = mainPlane.path(pathD).attr(attr);
    }

    getSegmentPoint(segmentIdx, pointIdx) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("getSegmentPoint: wrong segment index: ", segmentIdx);
            return null;
        }
        if (pointIdx < 1 || pointIdx >= (pathD[segmentIdx].length + 1) * 0.5) {
            console.error("getSegmentPoint: wrong point index: ", pointIdx);
            return null;
        }
        return new Point(pathD[segmentIdx][pointIdx * 2 - 1],
                         pathD[segmentIdx][pointIdx * 2]);
    }

    setSegmentPoint(segmentIdx, pointIdx, x, y) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return;
        }
        if (pointIdx < 1 || pointIdx >= (pathD[segmentIdx].length + 1) * 0.5) {
            console.error("setSegmentPoint: wrong point index: ", pointIdx);
            return;
        }
        pathD[segmentIdx][pointIdx * 2 - 1] = x;
        pathD[segmentIdx][pointIdx * 2] = y;
    }

    getSegmentLengthInPoints(segmentIdx) {
        let pathD = this.path.array();
        if (segmentIdx < 0 || segmentIdx >= pathD.length) {
            console.error("setSegmentPoint: wrong segment index: ", segmentIdx);
            return -1;
        }
        return parseInt(pathD[segmentIdx].length - 1) * 0.5;
    }
}

class LensInfo {
    constructor(id, midPoint) {
        this.id = id + "-" + LensInfo.count++;
        this.midPoint = midPoint;
        this.pathInfo;
        this.circles = [];
        this.bezierPointsBack = [];
        this.bezierPointsFront = [];
    }

    createPath(pathD, backCurveIdx, frontCurveIdx,
            botLineIdx=-1, topLineIdx=-1) {
        this.pathInfo = new PathInfo(this.id, pathD, backCurveIdx,
                                     frontCurveIdx, botLineIdx, topLineIdx);
    }

    createPoints() {
        let lensId = this.id;
        let pathD = this.pathInfo.path.array();
        let cx, cy, segment, circleIdx;

        for (let i = 0; i < pathD.length; i++) {
            if (pathD[i][0] == "M") {
                circleIdx = 1;
                segment = "back-";
                cx = pathD[i][1];
                cy = pathD[i][2];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "C") {
                segment = i == this.pathInfo.backCurveIdx ? "back-" : "front-";
                for (let j = 1; j < pathD[i].length; j += 2) {
                    cx = pathD[i][j];
                    cy = pathD[i][j + 1];
                    this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
                }
            }
            else if (pathD[i][0] == "H" && i != pathD.length - 1) {
                circleIdx = 1;
                segment = segment == "back-" ? "front-" : "back-";
                cx = pathD[i][1];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "V" && i != pathD.length - 1) {
                cy = pathD[i][1];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
            else if (pathD[i][0] == "L" && i != pathD.length - 1) {
                circleIdx = 1;
                segment = segment == "back-" ? "front-" : "back-";
                cx = pathD[i][1];
                cy = pathD[i][2];
                this.createCircle(cx, cy, lensId+"-circle-"+segment + circleIdx++);
            }
        }
    }

    createCircle(cx, cy, id) {
        let attributes = {
            cx: cx,
            cy: cy,
            fill: "white",
            stroke: "#189ab4",
            "stroke-width": 2,
            style: "cursor: pointer",
            id: id
        };
        let circle = mainPlane.circle(pointSize).attr(attributes);
        circle.draggable();
        circle.on("dragmove.namespace", circleDrag);
        this.circles.push(circle);
    }

    calcBezierPoints() {
        if (this.pathInfo.getSegmentLengthInPoints(this.pathInfo.backCurveIdx) == 3);
            this.bezierPointsBack = this.calcBezierPts(this.circles.slice(0, 4));
        if (this.pathInfo.getSegmentLengthInPoints(this.pathInfo.frontCurveIdx) == 3);
            this.bezierPointsFront = this.calcBezierPts(this.circles.slice(4).reverse());
    }

    calcBezierPointsCurve(curveIdx) {
        if (curveIdx == this.pathInfo.backCurveIdx
            && this.pathInfo.getSegmentLengthInPoints(curveIdx) == 3)
            this.bezierPointsBack = this.calcBezierPts(this.circles.slice(0, 4));
        else if (curveIdx == this.pathInfo.frontCurveIdx
            && this.pathInfo.getSegmentLengthInPoints(curveIdx) == 3)
            this.bezierPointsFront = this.calcBezierPts(this.circles.slice(4).reverse());
    }

    calcBezierPts(circles) {
        let bezierPoints = [];
        let dt = 0.005;
        for (let t = 0; t < 1; t += dt) {
            let c0 = (1 - t) * (1 - t) * (1 - t);
            let c1 = 3 * t * (1 - t) * (1 - t);
            let c2 = 3 * t * t * (1 - t);
            let c3 = t * t * t;

            let x = c0 * circles[0].cx() + c1 * circles[1].cx()
                    + c2 * circles[2].cx() + c3 * circles[3].cx();
            let y = c0 * circles[0].cy() + c1 * circles[1].cy()
                    + c2 * circles[2].cy() + c3 * circles[3].cy();
            bezierPoints.push(new Point(x, y));
        }
        return bezierPoints;
    }

    move(x, y) {
        if (!this.pathInfo.path)
            return;

        if (x < 150)
            x = 150;
        let xDiff = x - (this.pathInfo.path.x() + this.midPoint.x);
        let yDiff = y - (this.pathInfo.path.y() + this.midPoint.y);

        this.pathInfo.path.move(x - this.midPoint.x, y - this.midPoint.y);

        let circles = this.circles;
        for (let i = 0; i < circles.length; i++) {
            let cx = circles[i].cx();
            let cy = circles[i].cy();

            circles[i].move(cx + xDiff - pointSize * 0.5,
                            cy + yDiff - pointSize * 0.5);
        }
        this.calcBezierPoints();
    }
}

class Laser {
    constructor(x, y) {
        this.id = "laser-" + Laser.count++;
        this.rays = [];

        this.bodyW = 44;
        this.bodyH = 10;
        this.rayW = mainPlane.width() * 1.5;
        this.body = mainPlane.line(x, y + this.bodyH*0.5, x + this.bodyW, y + this.bodyH*0.5)
                             .stroke({ color: "#211414", width: this.bodyH })
                             .id(this.id)
                             .attr({style: "cursor: pointer"});

        this.body.draggable();
        this.body.on("dragmove.namespace", laserDrag);

        let rayX = x + this.bodyW;
        let rayY = y + this.bodyH * 0.5;
        let ray = mainPlane.line(rayX, rayY, rayX + this.rayW, rayY)
                           .stroke({ "color": "#FC0000" });
        this.addRay(ray);

        let stripX = x + this.bodyW - 8.5;
        this.strip = mainPlane.line(stripX, y + this.bodyH, stripX, y)
                              .stroke({ "color": "white"});

    }

    getLineCoords(line) {
        let x1 = line.attr("x1");
        let y1 = line.attr("y1");
        let x2 = line.attr("x2");
        let y2 = line.attr("y2");
        return [x1, y1, x2, y2];
    }

    move(x, y) {
        let [bodyX1, bodyY1, bodyX2, bodyY2] = this.getLineCoords(this.body);

        let bodyX = (bodyX1 + bodyX2) / 2;
        let bodyY = (bodyY1 + bodyY2) / 2;
        let xDiff = x - bodyX;
        let yDiff = y - bodyY;

        this.body.plot(bodyX1 + xDiff, bodyY1 + yDiff,
                       bodyX2 + xDiff, bodyY2 + yDiff);

        let ray = this.rays[0];
        let [rayX1, rayY1, rayX2, rayY2] = this.getLineCoords(ray);
        ray.plot(rayX1 + xDiff, rayY1 + yDiff, rayX2 + xDiff, rayY2 + yDiff);

        let [stripX1, stripY1, stripX2, stripY2] = this.getLineCoords(this.strip);
        this.strip.plot(stripX1 + xDiff, stripY1 + yDiff,
                        stripX2 + xDiff, stripY2 + yDiff);
    }

    addRay(ray) {
        this.rays.push(ray);
    }

    rotate(x, y, angle) {
        let bodyCoords = rotateLine(this.body, angle, x, y);
        this.body.plot(...bodyCoords);

        let ray = this.rays[0];
        let rayCoords = rotateLine(ray, angle, x, y);
        let a = (rayCoords[3] - rayCoords[1])/ (rayCoords[2] - rayCoords[0]);
        ray.plot(...rayCoords);

        let stripCoords = rotateLine(this.strip, angle, x, y);
        this.strip.plot(...stripCoords);
    }

    bbox() {
        return this.body.bbox();
    }

    height() {
        return this.bodyH;
    }
}

LensInfo.count = 1;
Laser.count = 1;

let lenses = [];
let lasers = [];
const pointSize = 10;

const mainPlane = SVG("#main-plane");
const mainPlaneElem = document.getElementById("main-plane");
const yOffset = mainPlaneElem.getBoundingClientRect().y;
let div = document.getElementById("coords");
let normLine = mainPlane.line().stroke({ "color": "green" }).attr({ "stroke-dasharray": "4 2" });
let normLine2 = mainPlane.line().stroke({ "color": "orange" }).attr({ "stroke-dasharray": "4 2" });
// let point = mainPlane.rect(20,20).fill("magenta");
// eslint-disable-next-line no-unused-vars
function createLens(event) {
    let x = event.clientX;
    let y = event.clientY - yOffset;

    let midPoint;
    let pathD, lens, order;

    let lensId = event.target.id;

    if (lensId == "biconvex") {
        pathD = new SVG.PathArray([
            ['M', 30, 0],
            ['C', -10, 70, -10, 135, 30, 200],
            ['L', 50, 200],
            ['C', 90, 135, 90, 70, 50, 0],
            ['L', 30, 0]
        ]);
        midPoint = new Point(40, 100);
        order = [1, 3, 2, 4];
    }
    lens = new LensInfo(lensId, midPoint);
    lens.createPath(pathD, ...order);

    let path = lens.pathInfo.path;
    path.move(x - midPoint.x, y - midPoint.y);
    path.draggable();
    path.on("dragmove.namespace", lensDrag);

    lens.createPoints();
    lens.calcBezierPoints();
    lenses.push(lens);

    if (lasers)
        laserRefract();

    mainPlaneElem.addEventListener("mousemove", mouseMoveLens, false);
    mainPlaneElem.addEventListener("mouseup", mouseUpLens, false);

    function mouseMoveLens(event) {
        let x = event.clientX;
        let y = event.clientY - yOffset;
        lens.move(x, y);
        if (lasers)
            laserRefract();
    }

    function mouseUpLens() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLens, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUpLens, false);
    }
}

// eslint-disable-next-line no-unused-vars
function createLaser(event) {
    let x = event.clientX;
    let y = event.clientY - yOffset;
    let laser = new Laser(x, y);
    lasers.push(laser);

    mainPlaneElem.addEventListener("mousemove", mouseMoveLaser, false);
    mainPlaneElem.addEventListener("mousemove", laserRefract, false);
    mainPlaneElem.addEventListener("mouseup", mouseUpLaser, false);
    mainPlaneElem.addEventListener("wheel", laserRotate, false);

    function mouseMoveLaser(event) {
        let x = event.clientX;
        let y = event.clientY - yOffset;
        laser.move(x, y);
    }

    function mouseUpLaser() {
        mainPlaneElem.removeEventListener("mousemove", mouseMoveLaser, false);
        mainPlaneElem.removeEventListener("mousemove", laserRefract, false);
        mainPlaneElem.removeEventListener("mouseup", mouseUpLaser, false);
    }
}

function laserRefract() {
    if (!lasers || !lenses)
        return;

    let width = mainPlane.width();

    for (let i = 0; i < lasers.length; i++) {
        for (let j = 0; j < lenses.length; j++) {
            let lens = lenses[j];
            let laser = lasers[i];

            let ray = laser.rays[j * 2];

            if (j == 0) {
                for (let k = 1; k < laser.rays.length; k++)
                    laser.rays[k].remove();
                laser.rays = [ray];
            }

            let {x1, y1, x2, y2} = ray.attr(["x1", "y1", "x2", "y2"]);

            if (!lenses)
                return;

            const bezierMin = lens.bezierPointsBack[0];
            const bezierMax = lens.bezierPointsBack[lens.bezierPointsBack.length - 1];
            if (bezierMin > bezierMax) {
                console.error("mouseMoveLaser: incorrect curve position");
                return;
            }

            let b = y1;
            let a = (y2 - y1) / (x2 - x1);
            let p1, p2;
            let intersect = false;

            if (bezierMin.y > a * (bezierMin.x - x1) + b
                || bezierMax.y < a * (bezierMax.x - x1) + b) {
                ray.plot(x1, y1, width, (width - x1) * a + b);
                return;
            }

            for (let i = 0; i < lens.bezierPointsBack.length - 1; i++) {
                p1 = lens.bezierPointsBack[i];
                p2 = lens.bezierPointsBack[i + 1];
                if (p1.y < a * (p1.x - x1) + b && p2.y > a * (p2.x - x1) + b) {
                    intersect = true;
                    break;
                }
            }

            if (!intersect) {
                return;
            }

            let intersPointX1 = p1.x;
            let intersPointY1 = a * (intersPointX1 - x1) + b;

            ray.plot(x1, y1, intersPointX1, intersPointY1);

            // find slope of a tangent and normal line
            let tangent = (p2.y - p1.y) / (p2.x - p1.x);
            let normal = -1 / tangent;
            // find angle between normal line and ray
            let theta1 = Math.atan((a-normal) / (1+normal*a));
            let n1 = 1, n2 = 1.5;
            // find refraction angle
            let sinTheta2 = n1 / n2 * Math.sin(theta1);
            let theta2 = Math.asin(sinTheta2);
            // get angle of a normal line
            let normalAngle = Math.atan(normal);
            // get angle and slope of a refracted ray
            let aRefAng = normalAngle + theta2;
            let aRefract = Math.tan(aRefAng);

            // normLine.plot(intersPointX1+20, 20 * normal + intersPointY1, intersPointX1 - 50, -50 * normal + intersPointY1);

            b = intersPointY1;
            a = aRefract;
            intersect = false;

            for (let i = 0; i < lens.bezierPointsFront.length - 1; i++) {
                p1 = lens.bezierPointsFront[i];
                p2 = lens.bezierPointsFront[i + 1];
                if (p1.y < a * (p1.x - intersPointX1) + b && p2.y > a * (p2.x - intersPointX1) + b) {
                    intersect = true;
                    break;
                }
            }

            let line = mainPlane.line().stroke({ "color": "red"});

            if (!intersect) {
                line.plot(intersPointX1, intersPointY1, width,
                          (width - intersPointX1) * a + intersPointY1);
                laser.addRay(line);
                return;
            }

            let intersPointX2 = p1.x;
            let intersPointY2 = a * (p1.x - intersPointX1) + b;
            line.plot(intersPointX1, intersPointY1, intersPointX2, intersPointY2);
            laser.addRay(line);

            tangent = (p2.y - p1.y) / (p2.x - p1.x);
            normal = -1 / tangent;
            theta1 = Math.atan((a - normal) / (1 + normal*a));
            n1 = 1.5, n2 = 1;
            sinTheta2 = n1 / n2 * Math.sin(theta1);
            if (sinTheta2 > 1)
                theta2 = Math.PI * 0.5 + sinTheta2 - 1;
            else if (sinTheta2 < -1)
                theta2 = -Math.PI * 0.5 + (sinTheta2 + 1);
            else
                theta2 = Math.asin(sinTheta2);
            normalAngle = Math.atan(normal);
            aRefAng = normalAngle + theta2;
            aRefract = Math.tan(aRefAng);

            let line2 = mainPlane.line().stroke({ "color": "red"});
            line2.plot(intersPointX2, intersPointY2, width,
                       (width - intersPointX2) * aRefract + intersPointY2);
            laser.addRay(line2);

            // normLine2.plot(intersPointX2+50, 50 * normal + intersPointY2, intersPointX2 - 50, -50 * normal + intersPointY2);
        }
    }

    function toDeg(rad) {
        return rad * 180 / Math.PI;
    }
}

function laserRotate(event) {
    let x = event.clientX;
    let y = event.clientY - yOffset;
    let angle = 2;
    angle = event.deltaY < 0 ? angle : -angle;

    let laser;
    for (let i = 0; i < lasers.length; i++) {
        let tmp = lasers[i];
        let bbox = tmp.bbox();
        let h = tmp.height() * 0.5;
        if ((bbox.x <= x && x <= bbox.x2) && (bbox.y - h <= y && y <= bbox.y2 + h)) {
            laser = tmp;
            break;
        }
    }
    if (!laser)
        return;

    laser.rotate(x, y, angle / 180 * Math.PI);
    laserRefract();
}

function circleDrag(event) {
    const { handler, box } = event.detail;
    event.preventDefault();
    let { x, y } = box;
    let xDiff = x - event.target.instance.x();
    let yDiff = y - event.target.instance.y();

    handler.move(x, y);

    // get center of a mouse click
    x += box.w * 0.5;
    y += box.h * 0.5;

    let circleId = event.currentTarget.id.split("-");
    let lensId = circleId[0] + "-" + circleId[1];
    let lens = lenses.find(lens => lens.id == lensId);
    moveAdjacent(x, y, circleId, lens, xDiff, yDiff);
}

function moveAdjacent(cx, cy, circleId, lens, xDiff, yDiff) {
    let curve = circleId[3];
    let circleIdx = circleId[4];
    let pathInfo = lens.pathInfo;
    let path = pathInfo.path;
    let adjCurveIdx, adjPointIdx, adjCircleIdx;
    let curveIdx;

    curveIdx = curve == "back" ? pathInfo.backCurveIdx : pathInfo.frontCurveIdx;

    if (circleIdx == 1) {
        if (curve == "back") {
            adjCurveIdx = pathInfo.topLineIdx > 0 ? pathInfo.topLineIdx : lens.frontCurveIdx;
            pathInfo.setSegmentPoint(0, 1, cx, cy);
        }
        else {
            adjCurveIdx = pathInfo.topLineIdx > 0 ? pathInfo.botLineIdx : lens.backCurveIdx;
        }
        adjPointIdx = pathInfo.getSegmentLengthInPoints(adjCurveIdx);
        if (adjPointIdx < 0) {
            console.error("adjPointIdx < 0: ", adjPointIdx);
            return;
        }
    }
    else {
        adjCurveIdx = curveIdx;
        adjPointIdx = circleIdx - 1;
    }

    if (circleIdx == 1 || circleIdx == 4) {
        adjCircleIdx = circleIdx == 1 ? 2 : 3;
        circleId[4] = adjCircleIdx;
        let adjCircleId = circleId.join("-");
        let adjCircle = lens.circles.find(c => c.id() == adjCircleId);
        let adjCx = adjCircle.cx() + xDiff;
        let adjCy = adjCircle.cy() + yDiff;
        adjCircle.move(adjCx - pointSize * 0.5, adjCy - pointSize * 0.5);
        pathInfo.setSegmentPoint(curveIdx, adjCircleIdx - 1, adjCx, adjCy);
    }
    pathInfo.setSegmentPoint(adjCurveIdx, adjPointIdx, cx, cy);
    path.plot(path.array());
    lens.calcBezierPointsCurve(curveIdx);
    laserRefract();
}

function laserDrag(event) {
    event.preventDefault();
    const box = event.detail.box;
    let { x, y } = box;

    x += box.w * 0.5;
    y += box.h * 0.5;

    let laser = lasers.find(laser => laser.id == event.target.instance.id());
    laser.move(x, y);
    laserRefract();
}

function lensDrag(event) {
    event.preventDefault();
    const box = event.detail.box;
    let { x, y } = box;

    x += box.w * 0.5;
    y += box.h * 0.5;

    let lens = lenses.find(lens => lens.id == event.target.instance.id().slice(0, -5));
    lens.move(x, y);
    laserRefract();
}

function rotateLine(line, angle, cx, cy) {
    let x1 = line.attr("x1") - cx;
    let y1 = line.attr("y1") - cy;
    let x2 = line.attr("x2") - cx;
    let y2 = line.attr("y2") - cy;

    let newX1 = x1 * Math.cos(angle) - y1 * Math.sin(angle) + cx;
    let newY1 = x1 * Math.sin(angle) + y1 * Math.cos(angle) + cy;
    let newX2 = x2 * Math.cos(angle) - y2 * Math.sin(angle) + cx;
    let newY2 = x2 * Math.sin(angle) + y2 * Math.cos(angle) + cy;

    return [newX1, newY1, newX2, newY2];
}