// sparky.fn.calendar
//
// <div sparky-fn="calendar:'2018-01-01',14">

(function(window) {
    "use strict";

    var Fn         = window.Fn;
    var Stream     = window.Stream;
    var Observable = window.Observable;
    var dom        = window.dom;
    var Time       = window.Time;
    var Sparky     = window.Sparky;

    var curry      = Fn.curry;
    var get        = Fn.get;
    var observe    = Observable.observe;

	Sparky.fn.calendar = function(node, scopes, params) {
        var floor     = params[2] || 'day';
        var startDate = params[0] ? Time(params[0]) : Time.now().floor('day');
        var stopDate  = startDate.add('0000-00-' + (params[1] || '35'));
        var scope = Observable({
            startDate: startDate,
            stopDate:  stopDate,
            data: []
        });

        // View

        function updateTime(time) {
            scope.data.forEach(function(object) {
                object.relativeDate = Time.secToDays(Time(object.date) - time.floor('day'));
            });
        }

        function updateStartStop() {
            scope.data.length = 0;

            var d1 = scope.startDate.floor(floor);
            var d2 = d1.add('0000-00-' + (params[1] || '35'));
            var d  = d1;

            while (d < d2) {
                scope.data.push({
                    date: d.date
                });

                d = d.add('0000-00-01');
            }

            updateTime(Time.now());
        }

        observe(scope, 'startDate', updateStartStop);
        observe(scope, 'stopDate', updateStartStop);
        updateStartStop();

        // Check date every 5 minutes
        var clock = Stream
        .clock(300)
        .map(function() { return Time.now(); })
        .each(updateTime);

        this.then(clock.stop);

        // Controller

        dom.event('click', node)
        .map(get('target'))
        .map(dom.attribute('sparky-calendar-start'))
        .each(function(value) {
            scope.startDate = scope.startDate.add(value);
            scope.stopDate  = scope.stopDate.add(value);
        });

        return Fn.of(scope);
    };


    Sparky.fn['times'] = function(node, scopes, params) {

        // View

        var startTime = params[0] ? Time(params[0]) : Time('00:00');
        var stopTime  = params[1] ? Time(params[1]) : Time('24:00');
        var stepTime  = params[2] || '00:20';
        var scope = Observable([]);

        var t1 = startTime;
        var t2 = stopTime;

        while (t1 < t2) {
            scope.push({ time: t1 });
            t1 = t1.add(stepTime);
        }

        // Controller

        var changes;

        scopes.each(function(scope) {
            changes && changes.stop();

            changes = dom
            .event('change', node)
            .map(get('target'))
            .each(function(input) {
                if (input.checked) {
                    scope.times.push({
                        date: scope.date,
                        time: input.value
                    })
                }
                else {

                }
            });
        });

        return Fn.of(scope);
    };
})(this);
