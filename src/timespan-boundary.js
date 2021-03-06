/**
 * A timespan boundary
 * relative date from the initDate
 *
 * @param Date initDate
 */
function TimespanBoundary(initDate)
{
    'use strict';

    /**
     * @var Date
     */
    this.initDate = initDate;

    /**
     * Relative position date
     * @var Date
     */
    this.currentDate = initDate;

    /**
     * Relative position in days
     * @var Int
     */
    this.dayPosition = 0;

    /**
     * @var function
     */
    this.onUpdateCallback = null;

    var boundary = this;

    /**
     * Update the position of the boundary by adding days
     * @param {Int} nbDays positive or negative value
     */
    this.add = function(nbDays)
    {
        boundary.dayPosition += nbDays;

        var oldDate = new Date(boundary.currentDate);
        var newDate = new Date(boundary.currentDate);
        newDate.setDate(boundary.currentDate.getDate() + nbDays);
        boundary.currentDate = newDate;

        if (null !== boundary.onUpdateCallback) {
            var newCopy = new Date(newDate);
            if (newCopy.getTime() > oldDate.getTime()) {
                boundary.onUpdateCallback(oldDate, newCopy);
            } else {
                boundary.onUpdateCallback(newCopy, oldDate);
            }
        }
    };


    /**
     * Do something on boundary position update
     * @param {function} callback   get called with the old date and the new date
     */
    this.onUpdate = function(callback)
    {
        boundary.onUpdateCallback = callback;
    };
}
