import {transform} from 'ol/proj';
import debounce from 'lodash/debounce';
import {mouse, select} from 'd3-selection';
import {transition} from 'd3-transition'; // eslint-disable-line no-unused-vars
import {scaleLinear, scaleTime} from 'd3-scale';
import {bisector, extent} from 'd3-array';
import {format} from 'd3-format';
import {timeFormat} from 'd3-time-format';
import {geoDistance} from 'd3-geo';
import {axisBottom, axisLeft} from 'd3-axis';
import {timeHour} from 'd3-time';
import {line} from 'd3-shape';

/**
 * @param {angular.Scope} $scope Scope.
 * @param {?GeoJSONFeatureCollection} mapFeatureCollection FeatureCollection of
 *    features shown on the map.
 * @param {app.Lang} LangService Lang service.
 * @constructor
 * @ngInject
 */
export default class ElevationProfileController {
  constructor($scope, mapFeatureCollection, LangService) {
    'ngInject';

    /**
     * @type {angular.Scope}
     * @private
     */
    this.scope_ = $scope;

    /**
     * @type {?GeoJSONFeatureCollection}
     * @private
     */
    this.featureCollection_ = mapFeatureCollection;

    /**
     * @export
     */
    this.mode = 'distance';

    /**
     * @private
     */
    this.i18n_ = {
      elevation: LangService.gettext('Elevation'),
      elevation_legend: LangService.gettext('Elevation (m)'),
      meters: LangService.gettext('meters'),
      distance: LangService.gettext('Distance'),
      distance_legend: LangService.gettext('Distance (km)'),
      km: LangService.gettext('kilometers'),
      time: LangService.gettext('Time'),
      duration: LangService.gettext('Duration'),
      duration_legend: LangService.gettext('Duration (hrs)')
    };

    const lines = mapFeatureCollection.features.filter((feature) => {
      return feature.geometry.type === 'LineString' ||
            feature.geometry.type === 'MultiLineString';
    });
    if (!lines) {
      $('#elevation-profile-title').remove();
      $('#elevation-profile').closest('.finfo').remove();
      return;
    }

    let coords = [];
    if (lines[0].geometry.type === 'MultiLineString') {
      lines[0].geometry.coordinates.forEach((linestring) => {
        coords = coords.concat(linestring);
      });
    } else {
      coords = lines[0].geometry.coordinates;
    }

    // we consider the track contains time if all points have this information
    const timeAvailable = coords.every((coord) => {
      return coord.length > 3;
    });
    this.timeAvailable = timeAvailable;
    const startDate = timeAvailable ? new Date(coords[0][3] * 1000) : undefined;
    let totalDist = 0;

    this.data = coords.map((coord, i, coords) => {
      const date = timeAvailable ? new Date(coord[3] * 1000) : undefined;
      let d = 0;
      if (i > 0) {
        // convert from web mercator to lng/lat
        const deg1 = transform([coords[i][0], coords[i][1]], 'EPSG:3857', 'EPSG:4326');
        const deg2 = transform([coords[i - 1][0], coords[i - 1][1]], 'EPSG:3857', 'EPSG:4326');
        // arc distance x earth radius
        d = geoDistance(deg1, deg2) * 6371;
      }
      totalDist += d;
      return {
        date,
        ele: coord[2] || 0,
        d: totalDist,
        elapsed: timeAvailable ? date - startDate : undefined
      };
    });
    if (!this.data.find(coord => coord.ele > 0)) {
      $('#elevation-profile-title').remove();
      $('#elevation-profile').closest('.finfo').remove();
      return;
    }
    this.createChart_();
  }

  /**
   * @private
   */
  createChart_() {
    const wrapper = $('#elevation-profile').closest('.finfo');
    let width = wrapper.width();
    const size = {
      width,
      height: 300
    };
    this.margin = {
      top: 40,
      right: 20,
      bottom: 30,
      left: 50
    };
    width = size.width - this.margin.left - this.margin.right;
    const height = size.height - this.margin.top - this.margin.bottom;

    if (!this.timeAvailable) {
      $('.xaxis-dimension').hide();
    }

    // Add an SVG element with the desired dimensions and margin
    this.svg = select('#elevation-profile-chart')
      .append('svg')
      .attr('width', width + this.margin.left + this.margin.right)
      .attr('height', height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // Scales and axes
    this.x1 = scaleLinear().range([0, width]);

    this.y = scaleLinear().range([height, 0]);

    this.x1Axis = axisBottom(this.x1);

    this.yAxis = axisLeft(this.y)
      .tickFormat(format('.0f'));

    this.x1
      .domain(extent(this.data, d => d.d))
      .nice();

    const yExtent = extent(this.data, d => d.ele);
    this.y.domain(yExtent).nice();

    if (this.timeAvailable) {
      this.x2 = scaleTime().range([0, width]);

      this.x2Axis = axisBottom(this.x2)
        // force display of elapsed time as hrs:mins. It is not datetime!
        .tickFormat(t => ~~(t / 3600000) + ':' + format('02d')(~~(t % 3600000 / 60000)));

      this.x2
        .domain(extent(this.data, d => d.elapsed))
        .nice(timeHour);
    }

    this.svg
      .append('g')
      .attr('class', 'y axis')
      .call(this.yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text(this.i18n_.elevation_legend);

    this.svg
      .append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)
      .call(this.x1Axis)
      .append('text')
      .attr('x', size.width - this.margin.left - this.margin.right)
      .attr('dy', '-.71em')
      .attr('class', 'x axis legend')
      .style('text-anchor', 'end')
      .text(this.i18n_.distance_legend);

    // data lines
    this.dLine = line()
      .x(d => this.x1(d.d))
      .y(d => this.y(d.ele));

    if (this.timeAvailable) {
      this.tLine = line()
        .x(d => this.x2(d.elapsed))
        .y(d => this.y(d.ele));
    }

    // display line path
    this.line = this.svg
      .append('path')
      .datum(this.data)
      .attr('class', 'line')
      .attr('d', this.dLine);

    // Display point information one hover
    this.focusv = this.svg
      .append('line')
      .attr('class', 'target')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', size.height - this.margin.bottom - this.margin.top)
      .style('display', 'none');

    this.focush = this.svg
      .append('line')
      .attr('class', 'target')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', size.width - this.margin.right - this.margin.left)
      .attr('y2', 0)
      .style('display', 'none');

    this.focus = this.svg
      .append('circle')
      .attr('class', 'circle')
      .attr('r', 4.5)
      .style('display', 'none');

    this.bubble1 = this.svg
      .append('text')
      .attr('x', (size.width - this.margin.left - this.margin.right) / 2)
      .attr('dy', '-.71em')
      .attr('class', 'bubble')
      .style('text-anchor', 'middle')
      .style('display', 'none')
      .text('');
    this.bubble2 = this.svg
      .append('text')
      .attr('x', (size.width - this.margin.left - this.margin.right) / 2)
      .attr('dy', '-1.71em')
      .attr('class', 'bubble')
      .style('text-anchor', 'middle')
      .style('display', 'none')
      .text('');

    this.svg
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .on(
        'mouseover',
        () => {
          this.focus.style('display', null);
          this.focush.style('display', null);
          this.focusv.style('display', null);
          this.bubble1.style('display', null);
          this.bubble2.style('display', null);
        }
      )
      .on(
        'mouseout',
        () => {
          this.focus.style('display', 'none');
          this.focush.style('display', 'none');
          this.focusv.style('display', 'none');
          this.bubble1.style('display', 'none');
          this.bubble2.style('display', null);
        }
      )
      .on('mousemove', this.mousemove_.bind(this));

    // listen to changes to mode variable to update chart
    this.scope_.$watch(() => this.mode, this.updateChart_.bind(this));
    // listen to width changes to redraw graph
    $(window).on('resize', debounce(this.resizeChart_.bind(this), 300));
  }

  /**
   * @private
   */
  updateChart_() {
    const nLine = this.mode === 'distance' ? this.dLine : this.tLine;
    const axis = this.mode === 'distance' ? this.x1Axis : this.x2Axis;
    const legend = this.mode === 'distance' ?
      this.i18n_.distance_legend :
      this.i18n_.duration_legend;
    this.line.transition().duration(1000).attr('d', nLine);

    select('.x.axis').call(axis);
    select('.x.axis.legend').text(legend);
  }

  /**
   * @private
   */
  resizeChart_() {
    const wrapper = $('#elevation-profile').closest('.finfo');
    const width = wrapper.width() - this.margin.left - this.margin.right;
    const div = select('#elevation-profile');

    this.x1.range([0, width]);
    if (this.timeAvailable) {
      this.x2.range([0, width]);
    }
    const axis = this.mode === 'distance' ? this.x1Axis : this.x2Axis;
    div.select('.x.axis').call(axis);
    div.select('.x.axis.legend').attr('x', width);
    this.line.attr('d', this.mode === 'distance' ? this.dLine : this.tLine);
    this.focush.attr('x2', width);
    this.bubble1.attr('x', (width - this.margin.left - this.margin.right) / 2);
    this.bubble2.attr('x', (width - this.margin.left - this.margin.right) / 2);
    div.select('svg').attr('width', width + this.margin.left + this.margin.right);
    div.select('rect.overlay').attr('width', width);

    this.focus.style('display', null);
    this.focush.style('display', null);
    this.focusv.style('display', null);
    this.bubble1.style('display', null);
    this.bubble2.style('display', null);
  }

  /**
   * @private
   */
  mousemove_() {
    const bisectDistance = bisector(d => d.d).left;
    const bisectDate = bisector(d => d.elapsed).left;
    const formatDistance = format('.2r');
    const formatDate = timeFormat('%H:%M');
    const formatMinutes = format('02d');

    const bisect = this.mode === 'distance' ? bisectDistance : bisectDate;
    const x0 = this.mode === 'distance' ?
      this.x1.invert(mouse(this.svg.node())[0]) :
      this.x2.invert(mouse(this.svg.node())[0]);
    const i = bisect(this.data, x0, 1, this.data.length - 1);
    const d0 = this.data[i - 1];
    const d1 = this.data[i];
    const d = this.mode === 'distance' ?
      x0 - d0.d > d1.d - x0 ? d1 : d0 :
      x0 - d0.elapsed > d1.elapsed - x0 ? d1 : d0;

    const dy = this.y(d.ele);
    const dx = this.mode === 'distance' ? this.x1(d.d) : this.x2(d.elapsed);

    this.focus.attr('transform', `translate(${dx},${dy})`);
    this.focush.attr('transform', `translate(0,${dy})`);
    this.focusv.attr('transform', `translate(${dx},0)`);

    this.bubble1.text(
      this.i18n_.elevation +
        ' ' +
        Math.round(d.ele) +
        this.i18n_.meters +
        ' / ' +
        this.i18n_.distance +
        ' ' +
        formatDistance(d.d) +
        this.i18n_.km
    );
    if (this.timeAvailable) {
      const elapsed = d.elapsed / 1000;
      this.bubble2.text(
        this.i18n_.time +
          ' ' +
          formatDate(d.date) +
          ' / ' +
          this.i18n_.duration +
          ' ' +
          ~~(elapsed / 3600) +
          ':' +
          formatMinutes(~~(elapsed % 3600 / 60))
      );
    }
  }
}
