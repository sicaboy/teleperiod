/**
 * Selection
 *
 *
 * @param {teleperiod}   teleperiod
 */
function Selection(teleperiod) {

    'use strict';

    this.teleperiod = teleperiod;

    /**
     * @var {Date}
     */
    this.dtstart = null;

    /**
     * @var {Date}
     */
    this.dtend = null;

    var selection = this;

    this.overlayItems = [];

    /**
     * @return {boolean}
     */
    this.isValid = function()
    {
        if (null === selection.dtend || null === selection.dtstart) {
            return false;
        }

        return (selection.dtstart.getTime() < selection.dtend.getTime());
    };


    /**
     * set new date
     * if the pointerDate is the first date, define the dtstart,
     * if dtstart allready set and pointerDate is after, define the dtend
     * if pointerDate is before dtstart, overwrite dtstart
     *
     * return true if a period is set
     *
     * @param {Date} pointerDate
     *
     * @return {boolean}
     */
    this.setDate = function(pointerDate)
    {
        pointerDate.setMilliseconds(0);

        if (null === selection.dtstart || selection.dtstart.getTime() > pointerDate.getTime() || selection.isValid()) {
            selection.dtstart = pointerDate;
            selection.dtend = null;
            selection.resetOverlay();
            return false;
        }


        if (selection.dtstart.getTime() < pointerDate.getTime()) {
            selection.dtend = pointerDate;

            if (selection.isValid()) {
                selection.highlightPeriods();
            }

            selection.notifyUpdated();
            return true;
        }

        selection.resetOverlay();
        return false;
    };


    this.notifyUpdated = function() {


        if (selection.teleperiod.settings.onUpdated) {
            selection.teleperiod.settings.onUpdated(selection);
        }
    };



    /**
     * Get the list of <g> elements for the period
     * @return array
     */
    this.getDayGroups = function()
    {
        var loop = new Date(selection.dtstart);
        var daygroup;
        var g = [];

        while(loop < selection.dtend) {

            daygroup = selection.teleperiod.getDayGroupByDate(loop);
            g.push(daygroup);

            loop.setDate(loop.getDate() +1);
        }

        return g;
    };


    /**
     * create a cropped period or return the same period if the given parameter is included in selection
     * @param {object} p
     * @return {object}
     */
    this.cropPeriod = function(p)
    {
        if (p.dtstart >= selection.dtstart && p.dtend <= selection.dtend) {
           return p;
        }

        if (p.dtstart >= selection.dtend || p.dtend<= selection.dtstart) {
            return null;
        }

        var cropped = {};

        cropped.dtstart = p.dtstart >= selection.dtstart ? p.dtstart : selection.dtstart;
        cropped.dtend = p.dtend <= selection.dtend ? p.dtend : selection.dtend;

        return cropped;
    };


    /**
     * @param {Date} position
     * @return {Boolean}
     */
    this.isLastMinute = function(position)
    {
        var min = position.getHours()*60 + position.getMinutes();
        return (min === teleperiod.getDayLastMinute());
    };

    /**
     * @param {Date} position
     * @return {Boolean}
     */
    this.isFirstMinute = function(position)
    {
        var min = position.getHours()*60 + position.getMinutes();
        return (min === teleperiod.getDayFirstMinute());
    };


    /**
     * @param {Object} last
     * @param {Object} next
     * @return {Boolean}
     */
    this.testContiguous = function(last, next)
    {
        return (selection.isLastMinute(last.dtend) && selection.isFirstMinute(next.dtstart));
    };



    /**
     * Get an array of periods beetween dtstart and dtend of all working times periods in the interval
     * @param {Boolean} mergeContiguous
     * @return {Array}
     */
    this.getValidPeriods = function(mergeContiguous)
    {
        if (undefined === mergeContiguous) {
            mergeContiguous = true;
        }

        var loop = new Date(selection.dtstart);
        loop.setHours(0, 0, 0);
        var indexDate, workingtime, cropped;
        var workingtimes = [];
        var last;

        while(loop < selection.dtend) {

            if (selection.teleperiod.workingtimesEvents[loop] !== undefined) {
                var workingTimesOnDay = selection.teleperiod.workingtimesEvents[loop];

                for (var i=0; i<workingTimesOnDay.length; i++) {

                    cropped = selection.cropPeriod(workingTimesOnDay[i]);

                    if (cropped) {
                        last = workingtimes[workingtimes.length-1];

                        if (undefined !== last && mergeContiguous && selection.testContiguous(last, cropped)) {

                            // update last event
                            last.dtend = cropped.dtend;
                        } else {
                            workingtimes.push(cropped);
                        }
                    }
                }
            }

            loop.setDate(loop.getDate() +1);
        }

        return workingtimes;
    };

    /**
     * Display the selection on one day
     */
    this.highlightPeriods = function()
    {

        var periods = selection.getValidPeriods(false);

        for(var i=0; i<periods.length; i++) {
            var g = selection.teleperiod.getDayGroupByDate(periods[i].dtstart);
            selection.addOverlay(g, periods[i]);
        }

    };

    /**
     *
     */
    this.addOverlay = function(dayGroup, event)
    {
        var yStart = selection.teleperiod.getDateY(event.dtstart);
        var yEnd = selection.teleperiod.getDateY(event.dtend);

        var rect = dayGroup.append('rect');

        rect
            .attr('class', 'selection')
            .attr('y', yStart)
            .attr('height', yEnd - yStart)
            .attr('width', selection.teleperiod.getDateWidth() -1)

            .on('mouseover', function() {
                selection.setOverlayClassed('mouseover' , true);
            })

            .on('mouseout', function() {
                selection.setOverlayClassed('mouseover' , false);
            })

            .on('click', function() {

                selection.dtstart = null;
                selection.dtend = null;
                selection.resetOverlay();
            })
        ;


        selection.overlayItems.push(rect);

        return rect;
    };

    /**
     * Remove all overlay of the selection
     *
     */
    this.removeOverlay = function()
    {
        for (var i=0; i<selection.overlayItems.length; i++) {
            selection.overlayItems[i].remove();
        }

        selection.overlayItems = [];

    };


    /**
     * Apply or remove a classname on all averlay items
     * @param string classname
     * @param bool   status
     */
    this.setOverlayClassed = function(classname, status)
    {
        for (var i=0; i<selection.overlayItems.length; i++) {
            selection.overlayItems[i].classed(classname , status);
        }
    };


    /**
     * Remove existing overlay
     * and fire the callback
     */
    this.resetOverlay = function()
    {
        selection.removeOverlay();
        selection.notifyUpdated();

    };


    /**
     * Get selection duration in ms
     * @return {int}
     */
    this.getDuration = function()
    {
        var periods = selection.getValidPeriods(false);
        var duration = 0;

        for(var i=0; i<periods.length; i++) {

            if (periods[i].dtstart && periods[i].dtend) {
                var start = periods[i].dtstart.getTime();
                var end = periods[i].dtend.getTime();

                if (start < end) {
                    duration += (end - start);
                }
            }
        }

        return duration;
    };

}
