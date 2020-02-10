import {scaleLinear} from 'd3-scale';
import {clientPoint} from 'd3-selection';
import {saveAs} from 'file-saver';
import {throttle} from 'lodash';
import React from 'react';
import ChartToolbar from './ChartToolbar';
import {numberFormat} from './formatters';
import {arrayToSvgPath, isPointInside} from './PlotUtil';

function isPointInsideRect(point, rect) {
    return point.x >= rect.x && point.y >= rect.y && point.x <= rect.x + rect.width && point.y <= rect.y + rect.height;
}

class Scatter2d extends React.PureComponent {

    constructor(props) {
        super(props);
        this.chartRef = React.createRef();
        this.tooltipRef = React.createRef();
        this.lassoRef = React.createRef();
        this.brushRef = React.createRef();
        this.svgRef = React.createRef();
        this.backingScale = 1;
        this.interactionMode = ChartToolbar.MODE_BRUSH;
        this.isPointerDown = false;
        this.lassoPathArray = [];
        this.event = {clientX: 0, clientY: 0};
        this.rect = {x: 0, y: 0, width: 0, height: 0};
        this._onMouseMove = throttle(this._onMouseMove, 100, {leading: true});
        this._onTooltip = throttle(this._onTooltip, 300);
    }

    componentWillUnmount() {
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onMouseMove);
    }

    onHome = () => {
        let data = this.props.data;
        data[0]._xmin = data[0].xmin;
        data[0]._xmax = data[0].xmax;
        data[0]._ymin = data[0].ymin;
        data[0]._ymax = data[0].ymax;
        this.redraw();
    };

    onSaveImage = () => {
        let layout = this.props.layout;
        let height = layout.height;
        let width = layout.width;
        let context = new window.C2S(width, height);
        this.drawContext(context);
        let svg = context.getSerializedSvg();
        let blob = new Blob([svg], {
            type: 'text/plain;charset=utf-8'
        });
        let name = this.props.data[0].name;
        if (name === '__count') {
            name = 'count';
        }
        saveAs(blob, name + '.svg');
    };

    onLasso = () => {
        this.interactionMode = ChartToolbar.MODE_LASSO;
    };

    onZoom = () => {
        this.interactionMode = ChartToolbar.MODE_ZOOM;
    };


    onPan = () => {
        this.interactionMode = ChartToolbar.MODE_PAN;
    };

    onBrush = () => {
        this.interactionMode = ChartToolbar.MODE_BRUSH;
    };

    onTooltip = (event) => {
        this.event.clientX = event.clientX;
        this.event.clientY = event.clientY;
        this._onTooltip(this.event);
    };
    onMouseExit = (event) => {
        this.tooltipRef.current.style.display = 'none';
    };
    _onTooltip = (event) => {
        if (!this.isPointerDown) {
            let coords = clientPoint(this.svgRef.current, event);
            let xmin = this.xToPixScale.invert(coords[0] - 2);
            let ymax = this.yToPixScale.invert(coords[1] - 2);
            let xmax = this.xToPixScale.invert(coords[0] + 2);
            let ymin = this.yToPixScale.invert(coords[1] + 2);
            let trace = this.props.data[0];
            let index = -1;
            for (let i = 0, n = trace.x.length; i < n; i++) {
                let x = trace.x[i];
                let y = trace.y[i];
                if (x >= xmin && x <= xmax && y >= ymin && y <= ymax) {
                    index = i;
                    break;
                }
            }
            if (index === -1) {
                this.tooltipRef.current.style.display = 'none';
            } else {
                let value = trace.text[index];
                if (typeof value === 'number') {
                    value = numberFormat(value);
                }
                this.tooltipRef.current.innerHTML = value;
                this.tooltipRef.current.style.left = (coords[0] + 8) + 'px';
                this.tooltipRef.current.style.top = (coords[1] + 8) + 'px';
                this.tooltipRef.current.style.display = '';
            }
        }
    };

    onMouseUp = (event) => {
        this.isPointerDown = false;
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onMouseMove);
        if (this.interactionMode === ChartToolbar.MODE_ZOOM) {
            this.brushRef.current.setAttribute('x', '0');
            this.brushRef.current.setAttribute('y', '0');
            this.brushRef.current.setAttribute('width', '0');
            this.brushRef.current.setAttribute('height', '0');
            let data = this.props.data;

            data[0]._xmin = this.xToPixScale.invert(this.rect.x);
            data[0]._xmax = this.xToPixScale.invert(this.rect.x + this.rect.width);

            data[0]._ymax = this.yToPixScale.invert(this.rect.y);
            data[0]._ymin = this.yToPixScale.invert(this.rect.y + this.rect.height);
            let _this = this;
            requestAnimationFrame(() => _this.redraw());
        } else if (this.interactionMode === ChartToolbar.MODE_LASSO || this.interactionMode === ChartToolbar.MODE_BRUSH) {
            let trace = this.props.data[0];
            let selectedpoints = [];
            let point = {x: 0, y: 0};
            let hitTest = this.interactionMode === ChartToolbar.MODE_LASSO ? isPointInside : isPointInsideRect;
            let path = this.interactionMode === ChartToolbar.MODE_LASSO ? this.lassoPathArray : this.rect;
            for (let i = 0, n = trace.x.length; i < n; i++) {
                let x = this.xToPixScale(trace.x[i]); // includes translate
                let y = this.yToPixScale(trace.y[i]);
                point.x = x;
                point.y = y;
                if (hitTest(point, path)) {
                    selectedpoints.push(i);
                }
            }
            if (selectedpoints.length === 0) {
                selectedpoints = null;
            }
            trace.selectedpoints = selectedpoints;
            if (selectedpoints == null) {
                this.props.onDeselect();
            } else {
                this.props.onSelected({points: [{data: this.props.data[0]}]});
            }
            this.lassoPathArray = [];
            this.lassoRef.current.setAttribute('d', '');
            this.brushRef.current.setAttribute('x', '0');
            this.brushRef.current.setAttribute('y', '0');
            this.brushRef.current.setAttribute('width', '0');
            this.brushRef.current.setAttribute('height', '0');
        }

    };

    onMouseDown = (event) => {
        this.tooltipRef.current.style.display = '';
        if (event.button === 0) {
            window.addEventListener('mouseup', this.onMouseUp);
            window.addEventListener('mousemove', this.onMouseMove);
            this.isPointerDown = true;
            if (this.interactionMode === ChartToolbar.MODE_BRUSH || this.interactionMode === ChartToolbar.MODE_ZOOM) {
                let coords = clientPoint(event.target, event);
                this.rect.x = coords[0];
                this.rect.y = coords[1];
                this.rect.width = 1;
                this.rect.height = 1;
                this.brushRef.current.setAttribute('x', this.rect.x);
                this.brushRef.current.setAttribute('y', this.rect.y);
                this.brushRef.current.setAttribute('width', this.rect.width);
                this.brushRef.current.setAttribute('height', this.rect.height);
                this.mouseDownPoint = {x: coords[0], y: coords[1]};
            } else if (this.interactionMode === ChartToolbar.MODE_LASSO) {
                this.lassoPathArray = [];
                let coords = clientPoint(event.target, event);
                this.lassoPathArray.push({x: coords[0], y: coords[1]});
                this.lassoRef.current.setAttribute('d', arrayToSvgPath(this.lassoPathArray));
            } else if (this.interactionMode === ChartToolbar.MODE_PAN) {
                this.mouseDownPoint = {x: event.clientX, y: event.clientY};
            }
        }
    };
    onMouseMove = (event) => {
        if (this.isPointerDown) {
            this._onMouseMove(event);
        }
    };

    _onMouseMove = (event) => {

        if (this.isPointerDown) {
            this.tooltipRef.current.style.display = 'none';
            let layout = this.props.layout;
            let height = layout.height;
            let width = layout.width;
            let coords = clientPoint(this.svgRef.current, event);
            coords[0] = Math.min(width, Math.max(0, coords[0]));
            coords[1] = Math.min(height, Math.max(0, coords[1]));
            if (this.interactionMode === ChartToolbar.MODE_LASSO) {
                this.lassoPathArray.push({x: coords[0], y: coords[1]});
                this.lassoRef.current.setAttribute('d', arrayToSvgPath(this.lassoPathArray));
            } else if (this.interactionMode === ChartToolbar.MODE_PAN) {
                let data = this.props.data;
                let translateX = event.clientX - this.mouseDownPoint.x;
                let translateY = event.clientY - this.mouseDownPoint.y;
                let tx = this.xToPixScale.invert(translateX) - this.xToPixScale.invert(0);
                data[0]._xmin = data[0].xmin - tx;
                data[0]._xmax = data[0].xmax - tx;
                let ty = this.yToPixScale.invert(translateY) - this.yToPixScale.invert(0);
                data[0]._ymin = data[0].ymin - ty;
                data[0]._ymax = data[0].ymax - ty;
                let _this = this;
                requestAnimationFrame(() => _this.redraw());
            } else if (this.interactionMode === ChartToolbar.MODE_BRUSH || this.interactionMode === ChartToolbar.MODE_ZOOM) {
                this.rect.x = this.mouseDownPoint.x;
                this.rect.y = this.mouseDownPoint.y;
                this.rect.width = coords[0] - this.mouseDownPoint.x;
                this.rect.height = coords[1] - this.mouseDownPoint.y;

                if (this.rect.width < 0) {
                    this.rect.width = this.mouseDownPoint.x - coords[0];
                    this.rect.x = coords[0];
                }
                if (this.rect.height < 0) {
                    this.rect.height = this.mouseDownPoint.y - coords[1];
                    this.rect.y = Math.max(0, coords[1]);
                }


                this.brushRef.current.setAttribute('x', this.rect.x);
                this.brushRef.current.setAttribute('y', this.rect.y);
                this.brushRef.current.setAttribute('width', this.rect.width);
                this.brushRef.current.setAttribute('height', this.rect.height);
            }
        }
    };


    redraw() {
        let start = new Date().getTime();
        //let quadTree = d3.geom.quadtree(data);
        let backingScale = this.backingScale;
        let node = this.chartRef.current;
        const context = node.getContext('2d');
        let layout = this.props.layout;
        let height = layout.height;
        let width = layout.width;
        context
            .clearRect(0, 0, width * backingScale, height * backingScale);
        context.scale(backingScale, backingScale);
        this.drawContext(context);
        console.log(new Date().getTime() - start);
    }


    drawContext(context) {
        let data = this.props.data;
        let layout = this.props.layout;
        let height = layout.height;
        let width = layout.width;
        let trace = data[0];
        if (trace.xmin == null) {
            let xmin = Number.MAX_VALUE;
            let xmax = -Number.MAX_VALUE;
            let ymin = Number.MAX_VALUE;
            let ymax = -Number.MAX_VALUE;
            for (let i = 0, n = trace.x.length; i < n; i++) {
                let x = trace.x[i];
                let y = trace.y[i];
                xmin = x < xmin ? x : xmin;
                xmax = x > xmax ? x : xmax;
                ymin = y < ymin ? y : ymin;
                ymax = y > ymax ? y : ymax;
            }
            trace.xmin = xmin;
            trace.xmax = xmax;
            trace.ymin = ymin;
            trace.ymax = ymax;
            trace._xmin = xmin;
            trace._xmax = xmax;
            trace._ymin = ymin;
            trace._ymax = ymax;
        }
        let markerSize = trace.marker.size;
        let unselectedMarkerSize = trace.unselected.marker.size;
        let maxMarkerSize = Math.max(markerSize, unselectedMarkerSize);
        let markerOpacity = trace.marker.opacity;
        let xToPixScale = scaleLinear().domain([trace._xmin, trace._xmax]).range([maxMarkerSize, width - maxMarkerSize]);
        let yToPixScale = scaleLinear().domain([trace._ymin, trace._ymax]).range([height - maxMarkerSize, maxMarkerSize]);
        this.xToPixScale = xToPixScale;
        this.yToPixScale = yToPixScale;
        window.test = this.yToPixScale;

        const PI2 = 2 * Math.PI;
        if (trace.selectedpoints == null) {
            context.globalAlpha = markerOpacity;
            for (let i = 0, n = trace.x.length; i < n; i++) {
                let x = trace.x[i];
                let y = trace.y[i];
                if (x >= trace._xmin && x <= trace._xmax && y >= trace._ymin && y <= trace._ymax) {
                    let xpix = this.xToPixScale(x);
                    let ypix = this.yToPixScale(y);
                    context.fillStyle = trace.marker.color[i];
                    context.beginPath();
                    context.arc(xpix, ypix, markerSize, 0, PI2);
                    context.closePath();
                    context.fill();
                }
            }
        } else {
            let unselectedOpacity = trace.unselected.marker.opacity;
            let selectedPoints = trace.selectedpoints;
            let selectedPointsIndex = 0;
            for (let i = 0, n = trace.x.length; i < n; i++) {
                let isSelected = false;
                if (i === selectedPoints[selectedPointsIndex]) {
                    isSelected = true;
                    selectedPointsIndex++;
                }
                let x = trace.x[i];
                let y = trace.y[i];
                if (x >= trace._xmin && x <= trace._xmax && y >= trace._ymin && y <= trace._ymax) {
                    let xpix = this.xToPixScale(x);
                    let ypix = this.yToPixScale(y);
                    context.globalAlpha = isSelected ? markerOpacity : unselectedOpacity;
                    context.fillStyle = trace.marker.color[i];
                    context.beginPath();
                    context.arc(xpix, ypix, isSelected ? markerSize : unselectedMarkerSize, 0, PI2);
                    context.closePath();
                    context.fill();
                }
            }
        }
        context.setTransform(1, 0, 0, 1, 0, 0);

    }

    componentDidMount() {
        this.redraw();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.data != this.props.data || prevProps.layout != this.props.layout) {
            this.redraw();
        }
    }

    render() {

        let backingScale = 1;
        if (typeof window !== 'undefined' && 'devicePixelRatio' in window) {
            backingScale = window.devicePixelRatio;
        }
        this.backingScale = backingScale;
        let layout = this.props.layout;
        let height = layout.height;
        let width = layout.width;

        let style = {width: width, height: height, position: 'absolute'};
        if (this.props.style) {
            style = Object.assign({}, style, this.props.style);
        }

        return (
            <div style={{position: 'relative', width: width, height: height + 16, overflow: 'hidden'}}>
                <canvas width={width * backingScale} height={height * backingScale}
                        ref={this.chartRef}
                        style={style}

                ></canvas>
                <div style={{
                    color: 'white',
                    position: 'absolute',
                    background: 'rgba(0,0,0,0.5)'
                }}
                     ref={this.tooltipRef}></div>
                <svg style={{width: width, height: height, position: 'absolute'}}
                     onMouseDown={this.onMouseDown}
                     ref={this.svgRef}
                     onMouseMove={this.onTooltip}
                     onMouseOut={this.onMouseExit}
                >
                    <g>
                        <path fillOpacity={0.1} fill='#0bb' strokeDasharray='2 2' strokeWidth='2px'
                              stroke='black'
                              ref={this.lassoRef}></path>
                        <rect fillOpacity={0.1} fill='#0bb' strokeDasharray='2 2' strokeWidth='2px'
                              stroke='black'
                              ref={this.brushRef}></rect>
                    </g>
                </svg>
                <ChartToolbar onHome={this.onHome}
                              onZoom={this.onZoom}
                              onPan={this.onPan}
                              onBrush={this.onBrush}
                              onLasso={this.onLasso}
                              onSaveImage={this.onSaveImage}
                />
            </div>

        );

    }
}

export default Scatter2d;

