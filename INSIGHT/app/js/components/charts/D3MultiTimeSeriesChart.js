var d3 = require('d3');

/**
Example props:
{
  width: 700,
  height: 350,
  margins: {left: 10, right: 10, top: 10, bottom: 10}
  strokeWidth: 1
}
Example data:
{
  series: [{ values: [[0, 0.1], [1, 0.15], [2, 0.1], [3, 0.16], [4, 0.11], [5, 0.2], [6, 0.2], [7, 0.21], [8, 0.22], [9, 0.2], [10, 0.16], [11, 0.14], [12, 0.11], [13, 0.1], [14, 0.09], [15, 0.07], [16, 0.09], [17, 0.06], [18, 0.04]],
             color: 'red'
           },
           { values: [[0, 0.03], [1, 0.07], [2, 0.08], [3, 0.09], [4, 0.1], [5, 0.11], [6, 0.1], [7, 0.1], [8, 0.07], [9, 0.05], [10, 0.04], [11, 0.03], [12, 0.02], [13, 0.01], [14, 0.0]],
             color: 'blue'
           }],
  domains: {x: [0, 20], y: [0, 1]},
  warpingPath: [[18, 14], [17, 13], [16, 12], [15, 11], [14, 10], [13, 9], [12, 8], [11, 7], [10, 6], [9, 5], [8, 4], [7, 3], [6, 2], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 0]]
},

*/

var D3MultiTimeSeriesChart = function() {
  this._pointRadius = 3;
};

D3MultiTimeSeriesChart.prototype.create = function(el, props, data) {
  this.props = props;

  var width = props.width;
  var height = props.height;
  var margins = props.margins;

  // Append a drawing area
  var svg = d3.select(el).append('svg')
              .attr('width', width + margins.left + margins.right)
              .attr('height', height + margins.top + margins.bottom);

  // Set up groups of components
  svg.append('g').attr('class', 'xaxisWrapper')
     .attr('transform', 'translate(' + margins.left + ', ' + (height + margins.top) + ')')
  svg.append('g').attr('class', 'yaxisWrapper')
     .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
  svg.append('g').attr('class', 'linesWrapper').attr('transform', this._translate());
  svg.append('g').attr('class', 'warpingPathWrapper').attr('transform', this._translate());
  svg.append('g').attr('class', 'pointsWrapper').attr('transform', this._translate());
  svg.append('g').attr('class', 'voronoiWrapper').attr('transform', this._translate());
  var tooltipWrapper = svg.append('g').attr('class', 'tooltipWrapper').attr('transform', this._translate())

  // Tooltip is hidden initially
  tooltipWrapper.style('opacity', 0)
  tooltipWrapper.append('rect')
                .attr('id', 'tooltip')
                .attr('fill', 'lightsteelblue')
                .attr('rx', 5)
                .attr('ry', 5)
                .style('pointer-events', 'none');
  tooltipWrapper.append('text')
                .attr('id', 'tooltipText')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .style('pointer-events', 'none')
                .style('font-family', 'sans-serif')
                .style('text-anchor', 'middle');

  this.update(el, data);
};

D3MultiTimeSeriesChart.prototype.update = function(el, data) {
  var svg = d3.select(el).select('svg'); 

  this._drawAxis(svg, data);
  this._drawLines(svg, data);
  this._drawPoints(svg, data);
  this._drawWarpingPath(svg, data);
  this._drawVoronoi(svg, data);
};

D3MultiTimeSeriesChart.prototype.destroy = function(el) {
  d3.select(el).select('svg').remove();
}

D3MultiTimeSeriesChart.prototype._scales = function(domains) {
  var x = d3.scaleLinear()
            .domain(domains.x)
            .range([0, this.props.width]);

  var y = d3.scaleLinear()
            .domain(domains.y)
            .range([this.props.height, 0]);
  return {x: x, y: y};
}

D3MultiTimeSeriesChart.prototype._drawAxis = function(svg, data) {
  var height = this.props.height;
  var width = this.props.width;
  var domains = data.domains;
  var scales = this._scales(domains);
  var yaxisWrapper = d3.axisLeft(scales.y)
                       .tickSizeInner(-width)
                       .tickPadding(7)
                       .ticks(Math.round(height / 40));
  var xaxisWrapper = d3.axisBottom(scales.x)
                       .tickSizeInner(-height)
                       .tickPadding(7)
                       .ticks(Math.min(Math.round(width / 40), domains.x[1]))
                       .tickFormat(d3.format('d'));

  svg.select('g.xaxisWrapper')
     .call(xaxisWrapper);

  svg.select('g.yaxisWrapper')
     .call(yaxisWrapper);

  svg.selectAll('.tick line')
     .style('opacity', 0.2);
}

D3MultiTimeSeriesChart.prototype._translate = function() {
  return 'translate(' + this.props.margins.left + ',' + this.props.margins.top + ')';
};

D3MultiTimeSeriesChart.prototype._extractRawPointCoords = function(series) {
  var flatten = series.map(function(s) { return s.values; })
                      .reduce(function(prev, cur) { 
                        return prev.concat(cur); 
                      }, []);
  return flatten;
};

D3MultiTimeSeriesChart.prototype._drawLines = function(svg, data) {
  var scales = this._scales(data.domains);
  var series = data.series;
  var strokeWidth = this.props.strokeWidth || 1;
  var lineFunc = d3.line()
                   .x(function(d) { return scales.x(d[0]); })
                   .y(function(d) { return scales.y(d[1]); })
                   .curve(d3.curveLinear);

  var pathGroup = svg.select('g.linesWrapper');

  pathGroup.attr('transform', this._translate());

  var paths = pathGroup.selectAll('path').data(series);

  // enter + update
  paths.enter()
       .append('path')
       .merge(paths)
       .attr('d', function(d) { return lineFunc(d.values); })
       .attr('stroke', function(d) { return d.color || 'black'; })
       .attr('stroke-width', strokeWidth)
       .attr('fill', 'none');
       
  // exit
  paths.exit().remove();

};

D3MultiTimeSeriesChart.prototype._drawPoints = function(svg, data) {
  var scales = this._scales(data.domains);
  var points = this._extractRawPointCoords(data.series);
  var pointGroup = svg.select('g.pointsWrapper');
  var circles = pointGroup.selectAll('circle').data(points);

  // enter + update
  circles.enter()
         .append('circle')
         .merge(circles)
         .attr('cx', function(d) { return scales.x(d[0]); })
         .attr('cy', function(d) { return scales.y(d[1]); })
         .attr('r', this._pointRadius)
         .attr('class', function(d, i) { return 'circle_' + i; });

  // exit
  circles.exit().remove();
};

D3MultiTimeSeriesChart.prototype._drawWarpingPath = function(svg, data) {
  var scales = this._scales(data.domains);
  var series = data.series;
  var warpingPathData = data.warpingPath || [];
  var warpingPathGroup = svg.select('g.warpingPathWrapper');
  var lines = warpingPathGroup.selectAll('line').data(warpingPathData);

  // enter + update
  lines.enter()
       .append('line')
       .merge(lines)
       .attr('x1', function(d) { return scales.x(series[0].values[d[0]][0]); })
       .attr('y1', function(d) { return scales.y(series[0].values[d[0]][1]); })
       .attr('x2', function(d) { return scales.x(series[1].values[d[1]][0]); })
       .attr('y2', function(d) { return scales.y(series[1].values[d[1]][1]); })
       .attr('stroke-width', 1)
       .attr('stroke', 'gray')
       .attr('stroke-dasharray', '5, 5');

  // exit
  lines.exit().remove();
}

D3MultiTimeSeriesChart.prototype._drawVoronoi = function(svg, data) {
  var scales = this._scales(data.domains);
  // TODO: handle the case of duplicated points 
  var points = this._extractRawPointCoords(data.series);
  var width = this.props.width;
  var height = this.props.height;
  var voronoi = d3.voronoi()
                  .x(function(d) { return scales.x(d[0]); })
                  .y(function(d) { return scales.y(d[1]); })
                  .extent([[0, 0], [width, height]]);

  var voronoiGroup = svg.select('g.voronoiWrapper')             
  
  var polygons = voronoi(points).polygons();

  var voronoiPaths = voronoiGroup.selectAll('path').data(polygons);
  var that = this;
  voronoiPaths.enter()
              .append('path')
              .merge(voronoiPaths)
              .attr('d', function(d) { 
                return d && ('M' + d.join('L') + 'Z'); 
              })
              .style('stroke', 'none')
              .style('fill', 'none')
              .style('pointer-events', 'all')
              .on('mouseover', function(d, i) {
                d3.select('circle.circle_' + i)
                  .attr('fill', 'red');
                that._showToolTip(svg, scales.x(d.data[0]), scales.y(d.data[1]), d.data[1]);
              })
              .on('mouseout', function(d, i) {
                d3.select('circle.circle_' + i)
                  .attr('fill', 'black');
                that._removeToolTip(svg);
              });

  voronoiPaths.exit().remove();
}

D3MultiTimeSeriesChart.prototype._showToolTip = function(svg, x, y, text) {
  var tooltipWrapper = svg.select('g.tooltipWrapper');
  var tooltip = tooltipWrapper.select('rect#tooltip');
  var tooltipText = tooltipWrapper.select('text#tooltipText');

  tooltipText.text(text);

  // Get bounding box of current text
  var textBBox = tooltipText.node().getBBox();
  var tooltipWidth = textBBox.width + 20;
  var tooltipHeight = textBBox.height + 10;

  tooltipText.attr('x', x)
             .attr('y', y + tooltipHeight / 2 + textBBox.height / 2)

  tooltip.attr('x', x - tooltipWidth / 2)
         .attr('y', y + this._pointRadius)
         .attr('width', tooltipWidth)
         .attr('height', tooltipHeight);

  tooltipWrapper.transition()
                .style('opacity', 0.8);
}

D3MultiTimeSeriesChart.prototype._removeToolTip = function(svg) {
  svg.select('g.tooltipWrapper').transition().style('opacity', 0);
}

module.exports = D3MultiTimeSeriesChart;