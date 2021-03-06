/**
 * Main teleperiod class
 *
 * @param   {Object}   settings [[Description]]
 *
 */
function Teleperiod(settings) {
    'use strict';

    var telep = this;

    this.viewport = settings.object;

    this.settings = settings;

    this.main = null;

    this.wtTooltip = null;

    /**
     * Working times events indexed by day
     */
    this.workingtimesEvents = {};

    /**
     * Regular events indexed by day
     */
    this.events = {};

    this.timelines = [];

    this.loadedIntervals = [];

    this.dayGroupByDate = {};

    this.queued = [];

    this.selection = new Selection(this);

    this.lastMouseDown = null;

    /**
     * Number of days
     * viewportFrom start at zero, decrease if main frame grow to the left
     * and go positive if mainframe grow to the right
     * viewportTo - viewportFrom = width in days
     *
     * @var {Int}
     */
    this.viewportFrom = null;

    /**
     * Number of days
     * viewportTo start at 40 (the with in days), decrease if main frame grow to the left
     * and increase if main frame grow to the right.
     * viewportTo - viewportFrom = width in days
     *
     * @var {Int}
     */
    this.viewportTo = null;

    /**
     * Inferior limit of the loaded timespan
     * @var {TimespanBoundary}
     */
    this.floatFrom = null;

    /**
     * Supperior limit of the loaded timespan
     * @var {TimespanBoundary}
     */
    this.floatTo = null;

    /**
     *
     */
    this.leftButtonGroup = null;

    /**
     *
     */
    this.rightButtonGroup = null;

    /**
     *
     */
    this.timeLineNamesGroup = null;




    /**
     * @return {Int}
     */
    this.getWidth = function() {
        return this.settings.width || telep.viewport.node().parentNode.offsetWidth;
    };

    /**
     * @return {Int}
     */
    this.getDateWidth = function() {
        return this.settings.dateWidth || 30;
    };

    /**
     * @return {Int}
     */
    this.getDateHeight = function() {
        return 250;
    };

    /**
     * @return {Int}
     */
    this.getHeight = function() {
        return telep.getHeaderHeight() + telep.getGraphHeight() + telep.getTimelinesHeight();
    };

    /**
     * @return {Int}
     */
    this.getTimelinesHeight = function() {
        return telep.timelines.length * (telep.getTimelineHeight() + telep.getTimelineMarginTop());
    };

    /**
     * @return {Int}
     */
    this.getHeaderHeight = function() {
        return 50;
    };


    /**
     * @return {Int}
     */
    this.getGraphHeight = function() {
        return 300;
    };

    /**
     * @return {Int}
     */
    this.getTimelineHeight = function() {
        return 20;
    };

    /**
     * Space between timelines
     * @return {Int}
     */
    this.getTimelineMarginTop = function() {
        return this.settings.timelineMarginTop || 10;
    };

    /**
     * @return {Int}
     */
    this.getButtonWidth = function() {
        return this.settings.buttonWidth || 30;
    };

    /**
     * @return {Array}
     */
    this.getDayOff = function() {
        return this.settings.dayOff || [6,0];
    };

    /**
     * @return {Int}
     */
    this.getMoveDays = function() {
        return 7;
    };

    /**
     * @return {Int}
     */
    this.getDayFirstMinute = function() {
        return this.settings.dayFirstMinute || (7 * 60);
    };

    /**
     * @return {Int}
     */
    this.getDayLastMinute = function() {
        return this.settings.dayLastMinute || (20 * 60);
    };

    /**
     * @return {Int}
     */
    this.getSnapDistance = function() {
        return this.settings.snapDistance || 10;
    };

    /**
     * @return {String}
     */
    this.getDateLocale = function() {
        return this.settings.dateLocale;
    };

    /**
     * @return {Date}
     */
    this.getFocusDate = function() {
        return this.settings.focusDate || new Date();
    };

    /**
     * move graph to date
     * @param {Date} date
     */
    this.moveTo = function(date) {
        this.settings.focusDate = date;
        this.createSlidingItems();
    };

    /**
     * Init the laded timespan boundaries from the focus date
     */
    this.initFloatDates = function() {
        var focus = new Date(telep.getFocusDate());
        focus.setHours(0, 0, 0);
        telep.floatFrom = new TimespanBoundary(focus);
        telep.floatTo = new TimespanBoundary(focus);


        telep.floatFrom.onUpdate(this.drawIntervalDates);
        telep.floatTo.onUpdate(this.drawIntervalDates);

        var viewPortDays = 1 + Math.round(telep.getWidth() / telep.getDateWidth());

        telep.viewportFrom = 0;
        telep.viewportTo = viewPortDays;

        telep.main.attr('width', viewPortDays * telep.getDateWidth());
        telep.floatTo.add(viewPortDays);
    };

    /**
     * Set viewport size
     */
    this.setSize = function() {
        telep.viewport
            .attr("width", telep.getWidth())
            .attr("height", telep.getHeight());
    };


    this.createSlidingItems = function()
    {
        if (null !== telep.main) {
            telep.main.remove();
        }

        telep.main = telep.viewport.append('svg');

        telep.main
            .attr('class', 'main')
            .attr('x', 0)
            .attr("width", 0)
            .attr('height', telep.getHeaderHeight() + telep.getGraphHeight() + telep.getTimelinesHeight());

        telep.initFloatDates();

        // recreate buttons to be on top of text
        telep.leftButton();
        telep.rightButton();
        telep.timeLineNames();
        telep.createTooltip();
    };

    /**
     * Create main frame with the grid
     */
    this.createMain = function()
    {
        this.createSlidingItems();
        this.setupDragBeavior();
    };


    this.createTooltip = function()
    {
        if (null !== this.wtTooltip) {
            this.wtTooltip.remove();
        }


        telep.wtTooltip = telep.viewport.append('svg')
            .attr('width', telep.getDateWidth() + 100)
            .attr('height', 50)
            .style("opacity", 0)
        ;

        telep.wtTooltip.append('polygon')
            .attr("class", "wtTooltip")
            .attr('transform', 'translate('+telep.getDateWidth()+',0)')
            .attr('points', '15,0 100,0 100,50 15,50 15,25 0,2 15,8')
        ;

        telep.wtTooltip.append('line')
            .attr('x1', 0).attr('y1', 3)
            .attr('x2', telep.getDateWidth() -1).attr('y2', 3)
            .attr('stroke', "red")
            .attr('stroke-width', "2")
            .attr('pointer-events', 'none')
        ;

        var textX = telep.getDateWidth() + 23;

        telep.wtTooltip.append('text').attr('y', 20).attr('x', textX).attr('class', 'wtTooltipDate');
        telep.wtTooltip.append('text').attr('y', 40).attr('x', textX).attr('class', 'wtTooltipHour');

    };


    this.timeLineNames = function()
    {
        if (null !== this.timeLineNamesGroup) {
            this.timeLineNamesGroup.remove();
        }

        this.timeLineNamesGroup = telep.viewport.append('svg');

        for(var i=0; i<telep.timelines.length; i++) {
            this.timeLineNamesGroup.append('text')
                .attr('class', 'timeline-name')
                .attr('x', 20)
                .attr('y', telep.getGraphHeight() + 5 + telep.getTimelineHeight() + i *(telep.getTimelineMarginTop() + telep.getTimelineHeight()))
                .text(telep.timelines[i].name)
            ;
        }
    };


    /**
     * Setup the horizontal drag beaviour
     */
    this.setupDragBeavior = function()
    {


        var mouseDrag = null;

        telep.main.on("mousedown", function(d) {
            mouseDrag = new MouseDrag(telep);
        });



        // Define drag beavior
        telep.main.call(d3.behavior.drag().on("drag", function() {
            if (mouseDrag) {
                mouseDrag.dragmove();
            }
        }));
    };



    /**
     * Draw the teleperiod widget
     */
    this.draw = function()
    {
        telep.viewport.classed('teleperiod', true);
        telep.setSize();
        telep.createMain();
    };



    /**
     * Append left button to the viewport frame
     */
    this.leftButton = function()
    {
        if (null !== this.leftButtonGroup) {
            this.leftButtonGroup.remove();
        }

        this.leftButtonGroup = telep.viewport.append('svg')
            .attr('width', telep.getButtonWidth())
            .attr('height', telep.getHeaderHeight())
            .attr('class', 'button')
            .on('mousedown', function(){ d3.event.preventDefault(); }) // prevent text selection on double-click
            .on("click", function() { telep.queue(telep.backward); })
        ;

        this.leftButtonGroup.append('rect')
            .attr('class', 'buttonbg')
            .attr('width', telep.getButtonWidth())
            .attr('height', telep.getHeaderHeight())

        ;

        this.leftButtonGroup.append('polygon')
            .attr('class', 'buttonarrow')
            .attr('points', '25,5 25,45 5,25')
        ;
    };

    /**
     * Append right button to the viewport frame
     */
    this.rightButton = function()
    {
        if (null !== this.rightButtonGroup) {
            this.rightButtonGroup.remove();
        }

        this.rightButtonGroup = telep.viewport.append('svg')
            .attr('width', telep.getButtonWidth())
            .attr('height', telep.getHeaderHeight())
            .attr('class', 'button')
            .attr('x', telep.getWidth() - telep.getButtonWidth())
            .on('mousedown', function(){ d3.event.preventDefault(); }) // prevent text selection on double-click
            .on("click", function() { telep.queue(telep.forward); })
        ;

        this.rightButtonGroup.append('rect')
            .attr('class', 'buttonbg')
            .attr('width', telep.getButtonWidth())
            .attr('height', telep.getHeaderHeight())
        ;


        this.rightButtonGroup.append('polygon')
            .attr('class', 'buttonarrow')
            .attr('points', '5,5 25,25 5,45')
        ;
    };


    this.drawIntervalDates = function(from, to)
    {
        var loopDate = new Date(from);

        while (loopDate < to) {
            var dayDate = new Date(loopDate);
            var dayGroup = telep.drawDate(loopDate);
            loopDate.setDate(loopDate.getDate()+1);

            dayDate.setHours(0,0,0);

            telep.dayGroupByDate[dayDate] = dayGroup;
        }


        telep.load(from, to);
    };

    /**
     * Convert a date to a X postion
     * @param   {Date} d [[Description]]
     * @returns {Integer} [[Description]]
     */
    this.getDateX = function(d)
    {
        var ds = d.getTime() /1000;
        var fs = telep.floatFrom.currentDate.getTime() /1000;

        var dd = Math.ceil(ds /86400);
        var fd = Math.ceil(fs /86400);

        var days = dd - fd;

        return days * telep.getDateWidth();
    };


    /**
     * convert a date to a Y position inside the day group
     * @param   {Date} d [[Description]]
     * @returns {int} Size from top
     */
    this.getDateY = function(d)
    {
        var minutes = (d.getHours() * 60) + d.getMinutes();

        if (minutes < telep.getDayFirstMinute()) {
            return 0;
        }

        if (minutes > telep.getDayLastMinute()) {
            return telep.getDayLastMinute();
        }

        var minFromStart = minutes - telep.getDayFirstMinute();
        var minTotal = telep.getDayLastMinute() - telep.getDayFirstMinute();
        return Math.round(minFromStart * telep.getDateHeight() / minTotal);
    };


    /**
     * Get date from X
     *
     * @param   {Int} x [[Description]]
     * @returns {Date} [[Description]]
     */
    this.getDateFromX = function(x)
    {
        var daysFromOrigin = Math.ceil(x / telep.getDateWidth());
        var date = new Date(telep.floatFrom.currentDate);
        date.setDate(date.getDate() + daysFromOrigin);
        date.setHours(0,0,0);

        return date;
    };


    /**
     * convert y position to a number of minutes inside the day group
     * @param   {int} y [[Description]]
     * @returns {int} [[Description]]
     */
    this.getMinutesFromY = function(y)
    {
        var minTotal = telep.getDayLastMinute() - telep.getDayFirstMinute();
        var yPerMin = (telep.getDateHeight() / minTotal);

        var minutes = telep.getDayFirstMinute() + Math.round(y / yPerMin);
        return minutes;
    };



    /**
     * Draw one day
     * @param {Date} d [[Description]]
     */
    this.drawDate = function(d)
    {

        var x = telep.getDateX(d);

        var g = telep.main.append('g')
                .attr('class', 'day')
                .attr('transform', 'translate('+x+','+telep.getHeaderHeight()+')');

            g
                .append('rect')
                .attr('width', telep.getDateWidth() - 1)
                .attr('height', telep.getDateHeight());

        if (-1 !== telep.getDayOff().indexOf(d.getDay())) {
            g.attr('class', 'day dayoff');
        }

        g
        .append('text')
            .attr('class', 'weekday')
            .attr('x', 5)
            .attr('y', -10)
            .attr('transform', "rotate(90)")
            .text(d.toLocaleDateString(telep.getDateLocale(), {weekday: "long"}))
            ;

        g
        .append('text')
            .attr('class', 'date')
            .attr('x', telep.getDateWidth() /2)
            .attr('y', -10)
            .text(d.getDate())
            ;

        if (1 === d.getDate()) {
            g.append('text')
            .attr('class', 'month')
            .attr('x', 5)
            .attr('y', -35)
            .text(d.toLocaleDateString(telep.getDateLocale(), {month: "long", year: "numeric"}))
            ;
        }


        for(var i=0; i<telep.timelines.length; i++) {
            telep.timelines[i].drawDate(g, d, i);
        }



        return g;
    };


    /**
     * add timeline to the bottom of the graph
     * @param {timeline} timeline object instance
     */
    this.addTimeLine = function(timeline) {
        timeline.teleperiod = telep;
        telep.timelines.push(timeline);
    };

    /**
     * Load working times and timelines
     * @param {Date} from [[Description]]
     * @param {Date} to   [[Description]]
     */
    this.load = function(from, to) {

        var interval = {
            from: from,
            to: to
        };



        telep.loadedIntervals.push(interval);
        telep.loadWorkingTimes(interval);
        telep.loadEvents(interval);


        for(var i=0; i<telep.timelines.length; i++) {
            telep.timelines[i].load(from, to);
        }

    };


    /**
     * Split one events into a list of daily periods
     * @param {object} event
     * @return {Array}
     */
    this.getWorkingTimesFromEvent = function(event) {

        var sameYear = (event.dtstart.getFullYear() === event.dtend.getFullYear());
        var sameMonth = (event.dtstart.getMonth() === event.dtend.getMonth());
        var sameDate = (event.dtstart.getDate() === event.dtend.getDate());

        if (sameYear && sameMonth && sameDate) {
            return [event];
        }

        var loopDate = new Date(event.dtstart);
        loopDate.setHours(0, 0, 0, 0);

        var workingDays = [];
        var dayPeriod;

        while(loopDate < event.dtend) {

            if (loopDate < event.dtstart) {
                dayPeriod = {
                    dtstart: event.dtstart
                };
            } else {
                dayPeriod = {
                    dtstart: new Date(loopDate)
                };
                dayPeriod.dtstart.setHours(0, telep.getDayFirstMinute(), 0);
            }

            loopDate.setDate(loopDate.getDate()+1);

            if (loopDate > event.dtend) {
                dayPeriod.dtend = event.dtend;
            } else {
                dayPeriod.dtend = new Date(event.dtstart);
                dayPeriod.dtend.setHours(0, telep.getDayLastMinute(), 59);
            }

            workingDays.push(dayPeriod);
        }

        return workingDays;
    };


    /**
     * Load working times
     * index working times by date
     * @param {object} interval
     */
    this.loadWorkingTimes = function(interval) {

        var workingtimes = [];
        var indexDate;

        function addDayEvent(dayEvent) {
            indexDate = new Date(dayEvent.dtstart);
            indexDate.setHours(0, 0, 0);

            if (telep.workingtimesEvents[indexDate] === undefined) {
                telep.workingtimesEvents[indexDate] = [];
            }

            telep.workingtimesEvents[indexDate].push(dayEvent);
            workingtimes.push(dayEvent);
        }


        function addEvent(event) {
            telep.getWorkingTimesFromEvent(event).forEach(addDayEvent);
        }


        telep.settings.workingtimes(interval).then(function(arr) {

            arr.forEach(addEvent);
            telep.addWorkingtimes(workingtimes);
        }, telep.onError);
    };


    /**
     * Load event and index by date
     * @param {object} interval
     */
    this.loadEvents = function(interval) {


        var indexDate;
        var selectedEvents = telep.settings.selectedEvents;

        // clear events in this interval

        var loop = new Date(interval.from);
        var items;

        while (loop < interval.to) {
            items = telep.getDayGroupByDate(loop).selectAll('.event-item');
            items.remove();
            loop.setDate(loop.getDate()+1);
        }


        // load events in this interval
        telep.settings.events(interval).then(function(arr) {

            var events = [];

            var selection = {
                dtstart: null,
                dtend: null
            };

            for(var i=0; i<arr.length; i++) {

                // ignore events out off the interval
                if (arr[i].dtstart > interval.to || arr[i].dtend < interval.from) {
                    continue;
                }

                if (undefined !== selectedEvents && undefined !== arr[i].uid && -1 !== selectedEvents.indexOf(arr[i].uid)) {

                    // ignore creation of event if it is selected

                    if (null === selection.dtstart || selection.dtstart > arr[i].dtstart) {
                         selection.dtstart = arr[i].dtstart;
                    }

                    if (null === selection.dtend || selection.dtend < arr[i].dtend) {
                         selection.dtend = arr[i].dtend;
                    }

                    continue; // ignore event creation
                }

                indexDate = new Date(arr[i].dtstart);
                indexDate.setHours(0, 0, 0, 0);

                if (telep.events[indexDate] === undefined) {
                    telep.events[indexDate] = [];
                }

                telep.events[indexDate].push(arr[i]);
                events.push(arr[i]);
            }

            if (null !== selection.dtstart && null !== selection.dtend) {
                telep.setSelection(selection.dtstart, selection.dtend);
            }

            telep.addRegularEvents(events);
        }, telep.onError);
    };


    /**
     * get day group element from date
     * @param {Date} d
     *
     * @return {array}
     */
    this.getDayGroupByDate = function(d)
    {
        var day = new Date(d);
        day.setHours(0,0,0);

        if (telep.dayGroupByDate[day] === undefined) {
            return null;
        }

        return telep.dayGroupByDate[day];
    };



    /**
     * Add workingtimes periods on exiting days
     * @param {Array} workingtimes [[Description]]
     */
    this.addWorkingtimes = function(workingtimes)
    {

        telep.addEvents(workingtimes, 'workingtime', {
            mouseover: function() {
                telep.wtTooltip
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
            },
            mouseout: function() {
                telep.wtTooltip
                    .transition()
                    .duration(500)
                    .style("opacity", 0);
            },
            mousemove: telep.updateWtTooltip,
            click: function() {
                telep.selection.setDate(telep.getPointerDate(this));
            }
        });
    };


    this.addRegularEvents = function(events)
    {
        telep.addEvents(events, 'event', {});
    };



    /**
     * @param {Date} d
     * @return {Date}
     */
    this.getDayBegin = function(d)
    {
        var r = new Date(d);
        r.setHours(0, telep.getDayFirstMinute(), 0);

        return r;
    };


    /**
     *
     * @param {Date} d
     * @return {Date}
     */
    this.getDayEnd = function(d)
    {
        var r = new Date(d);
        var min = telep.getDayLastMinute();

        r.setHours(0, min, 0);


        return r;
    };



    /**
     * @param {array} events the list of events to add
     * @param {string} className class to set on the created rect
     * @param {object} cb object with events callback for mouseover, mouseout, mousemove, click
     */
    this.addEvents = function(events, className, cb)
    {
        for (var i=0; i < events.length; i++) {
            telep.drawEvent(events[i], className, cb);
        }
    };

    /**
     * Remove loaded events, reload events in viewport
     */
    this.refreshEvents = function()
    {
        if (null === telep.floatFrom || null === telep.floatTo) {
            // Do not refresh if teleperiod not drawn
            return;
        }

        var interval = {
            from: telep.floatFrom.currentDate,
            to: telep.floatTo.currentDate
        };

        telep.main.selectAll('.event-item').remove();
        telep.loadEvents(interval);
    };


    /**
     * change the selectedEvents setting and refresh events
     * @param {array} uidList
     */
    this.editEvents = function(uidList)
    {
        telep.settings.selectedEvents = uidList;
        telep.refreshEvents();
    };



    var generateID = (function() {
        var globalIdCounter = 1;
        return function() {
            return('clip' + globalIdCounter++);
        };
    })();


    /**
     * @param {object} dayGroup     d3 selection for the day group
     * @param {String} className    class name of the event
     * @return {Array}
     */
    this.getDayGroupEvents = function(dayGroup, className)
    {
        var events = [];
        dayGroup.selectAll('.'+className).each(function() {
            events.push(this._teleperiodEvent);
        });

        return events;
    };

    /**
     * @param {object} dayGroup     d3 selection for the day group
     * @param {object} event        Event to draw
     * @return {Array}
     */
    this.getOverlappedEvents = function(dayGroup, event)
    {
        var events = [];
        telep.getDayGroupEvents(dayGroup, 'event').forEach(function(evt) {
            if (evt.dtend < event.dtstart || evt.dtstart > event.dtend) {
                return;
            }

            events.push(evt);
        });

        return events;
    };


    /**
     * Tet if the event is in the list of conflicts with UID and dates compare
     * @param {object} event    The event object to test uid from
     * @param {Array} list of events to compare with
     * @return {Boolean}
     */
    this.isEventIn = function(event, conflicts)
    {
        if (undefined === event.uid) {
            return false;
        }


        for(var i=0; i<conflicts.length; i++) {

            var sameUid = (undefined !== conflicts[i].uid && conflicts[i].uid === event.uid);
            var sameDtstart = conflicts[i].dtstart.getTime() === event.dtstart.getTime();
            var sameDtend = conflicts[i].dtend.getTime() === event.dtend.getTime();

            if (sameUid && sameDtstart && sameDtend) {
                return true;
            }
        }

        return false;
    };



    /**
     * @param {object} event
     * @param {string} className class to set on the created rect
     * @param {object} cb object with events callback for mouseover, mouseout, mousemove, click
     */
    this.drawEvent = function(event, className, cb)
    {
        var x, yStart, yEnd, loop, dayBegin, dayEnd;



        loop = new Date(event.dtstart);
        while (loop.getTime() < event.dtend.getTime()) {

            if (loop < telep.floatFrom.currentDate || loop > telep.floatTo.currentDate) {
                // ignore dates not in timespan
                loop.setDate(loop.getDate() + 1);
                continue;
            }

            x = telep.getDateX(loop);

            dayBegin = telep.getDayBegin(loop);
            dayEnd = telep.getDayEnd(loop);

            if (event.dtstart > dayBegin) {
                yStart = telep.getDateY(event.dtstart);
            } else {
                yStart = telep.getDateY(dayBegin);
            }

            if (event.dtend < dayEnd) {
                yEnd = telep.getDateY(event.dtend);
            } else {
                yEnd = telep.getDateY(dayEnd);
            }

            var dayGroup = telep.getDayGroupByDate(loop);


            if ('event' === className) {
                var conflicts = telep.getOverlappedEvents(dayGroup, event);
                if (conflicts.length > 0) {

                    // can be a conflict or an event inserted twice
                    // event is ignored if conflict but error message only if the uid does not match a conflict

                    if (undefined !== console) {
                        if (!telep.isEventIn(event, conflicts)) {
                            console.warn('Event ignored because of a conflict', event, 'others in same day', conflicts);
                        }
                    }

                    loop.setDate(loop.getDate() + 1);
                    continue;
                }
            }

            var clipId = generateID();

            var clip = dayGroup.append('clipPath')
                .attr('id', clipId)
                .attr('class', className+'-item');

            clip.append('rect')
                .attr('class', className+'-item')
                .attr('y', yStart)
                .attr('width', telep.getDateWidth() -1 )
                .attr('height', yEnd - yStart -6)
                .attr('y', yStart + 5)
                .attr('x', -10)
                .attr('transform', "rotate(-90)");

            var mainClass = className;
            var summaryClass = className+'-summary';

            if (event.categories) {
                var cats = event.categories;
                if (!(cats instanceof Array)) {
                    cats = cats.split(',');
                }

                mainClass += ' '+cats.map(function(cat) {
                    return 'category-'+cat;
                }).join(' ');

		summaryClass += ' '+cats.map(function(cat) {
                    return 'summary-category-'+cat;
                }).join(' ');
            }

            var evtRect = dayGroup.append('rect')
                .attr('class', mainClass+' '+className+'-item')
                .attr('y', yStart)
                .attr('height', yEnd - yStart)
                .attr('width', telep.getDateWidth() -1)
                .on('mouseover', cb.mouseover)
                .on('mouseout', cb.mouseout)
                .on('mousemove', cb.mousemove)
                .on('click', cb.click)
            ;

            evtRect[0][0]._teleperiodEvent = event;


            if (event.summary) {
                dayGroup.append('text')
                    .attr('class', className+'-item '+summaryClass)
                    .attr('x', yStart + 5)
                    .attr('y', -10)
                    .attr('transform', "rotate(90)")
                    .attr('clip-path', 'url(#'+clipId+')')
                    .text(event.summary)
                ;
            }

            loop.setDate(loop.getDate() + 1);
        }
    };


    /**
     * Get rounded date every 10 minutes
     * @param {HTMLElement} workingTimesItem
     *
     * @return {Date}
     */
    this.getPointerDate = function(workingTimesItem)
    {
        var mouse = d3.mouse(workingTimesItem);
        var y = mouse[1];

        var g = d3.select(workingTimesItem.parentNode);
        var x = parseInt(g.attr('transform').match(/translate\((\d+),\d+\)/)[1], 10);

        var pointerDate = telep.getDateFromX(x);



         // Snap Y to top or bottom if necessary

        var d3Item = d3.select(workingTimesItem);
        var topY = parseInt(d3Item.attr('y'), 10);
        var bottomY = topY + parseInt(d3Item.attr('height'), 10);
        var snap = telep.getSnapDistance();

        if (y - topY < snap) {
            y = topY;
        }

        if (bottomY - y < snap) {
            y = bottomY;
        }

        var min = telep.getMinutesFromY(y);

        var h = Math.floor(min / 60);
        var i = min % 60;

        // round every 10 min
        i = Math.round(i / 10) * 10;

        pointerDate.setHours(h,i,0);







        return pointerDate;
    };





    this.updateWtTooltip = function()
    {
        var pointerDate = telep.getPointerDate(this);

        var mouse = d3.mouse(this);
        var x = mouse[0];
        var y = mouse[1];

        var g = d3.select(this.parentNode);

        x = parseInt(g.attr('transform').match(/translate\((\d+),\d+\)/)[1], 10);
        x += parseInt(telep.main.attr('x'), 10);


        // set the y position according to the rounded date
        y = telep.getDateY(pointerDate);

        telep.wtTooltip.attr('x', x);
        telep.wtTooltip.attr('y', telep.getHeaderHeight() + y - 4);

        telep.wtTooltip.select('text.wtTooltipDate').text(
            pointerDate.toLocaleDateString(telep.getDateLocale())
        );

        telep.wtTooltip.select('text.wtTooltipHour').text(
            pointerDate.toLocaleTimeString(telep.getDateLocale(), {hour: "2-digit", minute: "2-digit" })
        );

    };




    /**
     * Slide main frame into viewport
     * @param   {Int} nbDays number of days to slide
     *
     */
    this.slideMain = function(nbDays) {

        return telep.main.transition().attr('x', function() {
            return parseInt(this.getAttribute('x'), 10) + (nbDays * telep.getDateWidth());
        });
    };


    /**
     * Process functions in queue
     * @param {function} fn function must return a d3 transition
     */
    this.queue = function(fn) {
        telep.queued.push(fn);

        if (1 < telep.queued.length) {
            // console.log('Skip process in queue');
            return;
        }

        telep.processQueued();
    };

    this.processQueued = function() {

        var oldest = telep.queued[0];
        var transition = oldest();

        var transitions = 0;

        transition.each( "start", function() {
            transitions++;
        }).each( "end", function() {
            if( --transitions === 0 ) {
                telep.queued.shift();

                if (0 >= telep.queued.length) {
                    return false;
                }

                telep.processQueued();
            }
        });
    };


    /**
     * @param {int} nbDays
     */
    this.createSpaceOnLeft = function(nbDays) {

        var currentwidth = parseInt(telep.main.attr('width'), 10);
        telep.main.attr('width', currentwidth + (nbDays * telep.getDateWidth()));

        telep.main.attr('x', function() {
            return parseInt(this.getAttribute('x'), 10) - (nbDays * telep.getDateWidth());
        });

        return telep.main.selectAll('.day').attr('transform', function() {

            var m = this.getAttribute('transform').match(/\((\d+),(\d+)\)/);

            if (!m) {
                return null;
            }

            var newX = parseInt(m[1], 10)+ (nbDays * telep.getDateWidth());

            return 'translate('+newX+','+m[2]+')';
        });
    };


    /**
     * grow main frame backward
     * @return {bool}
     */
    this.backwardGrow = function() {
        telep.viewportFrom -= telep.getMoveDays();
        telep.viewportTo -= telep.getMoveDays();

        // move the days in main frame 7 days to the right (create space for 7 days)

        if (telep.viewportFrom < telep.floatFrom.dayPosition) {
            var enlarge = telep.viewportFrom - telep.floatFrom.dayPosition;
            var transition = telep.createSpaceOnLeft(-1 * enlarge);
            telep.floatFrom.add(enlarge);

            return true;
        }

        return false;
    };


    /**
     * grow main frame forward
     * @return {bool}
     */
    this.forwardGrow = function() {
        telep.viewportFrom += telep.getMoveDays();
        telep.viewportTo += telep.getMoveDays();

        if (telep.viewportTo > telep.floatTo.dayPosition) {

            var enlarge = telep.viewportTo - telep.floatTo.dayPosition;
            var width = Math.abs(parseInt(telep.main.attr('x'), 10)) + telep.getWidth();
            var enlargePx = Math.abs(enlarge * telep.getDateWidth());

            telep.main.attr("width", width + enlargePx);

            telep.floatTo.add(enlarge);

            return true;
        }

        return false;

    };


    /**
     * Click the left button
     */
    this.backward = function() {

        telep.backwardGrow();

        return telep.slideMain(telep.getMoveDays());
    };

    /**
     * Click the right button
     */
    this.forward = function() {
        telep.forwardGrow();
        return telep.slideMain(-1 * telep.getMoveDays());
    };


    /**
     * Initialize selection
     * Highlight period only if working hours exists
     *
     * @param {Date} from
     * @param {Date} to
     */
    this.setSelection = function(from, to) {
        telep.selection.resetOverlay();

        telep.selection.setDate(from);
        telep.selection.setDate(to);

        if (telep.selection.isValid()) {
            telep.selection.highlightPeriods();
        }
    };


    /**
     * Error from promised events
     * @param {Error|String} err
     */
    this.onError = function(err) {
        if (console !== undefined) {
            console.log(err);
        }
    };
}
