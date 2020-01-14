var Sparky = (function (exports) {
    'use strict';

    /*
    cache(fn)
    Returns a function that caches the output values of `fn(input)`
    against input values in a map, such that for each input value
    `fn` is only ever called once.
    */

    function cache(fn) {
        var map = new Map();

        return function cache(object) {

            if (map.has(object)) {
                return map.get(object);
            }

            var value = fn(object);
            map.set(object, value);
            return value;
        };
    }

    /*
    curry(fn [, muteable, arity])
    */
    const A     = Array.prototype;

    function applyFn(fn, args) {
        return typeof fn === 'function' ? fn.apply(null, args) : fn ;
    }

    function curry(fn, muteable, arity) {
        arity = arity || fn.length;

        var memo = arity === 1 ?
            // Don't cache if `muteable` flag is true
            muteable ? fn : cache(fn) :

            // It's ok to always cache intermediate memos, though
            cache(function(object) {
                return curry(function() {
                    var args = [object];
                    args.push.apply(args, arguments);
                    return fn.apply(null, args);
                }, muteable, arity - 1) ;
            }) ;

        return function partial(object) {
            return arguments.length === 0 ?
                partial :
            arguments.length === 1 ?
                memo(object) :
            arguments.length === arity ?
                fn.apply(null, arguments) :
            arguments.length > arity ?
                applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
            applyFn(memo(object), A.slice.call(arguments, 1)) ;
        };
    }

    //function curry(fn, muteable, arity) {
    //    arity = arity || fn.length;
    //    return function curried() {
    //        return arguments.length >= arity ?
    //            fn.apply(null, arguments) :
    //            curried.bind(null, ...arguments) ;
    //    };
    //}

    {
        const _curry = curry;

        // Feature test
    	const isFunctionLengthDefineable = (function() {
    		var fn = function() {};

    		try {
    			// Can't do this on Safari - length non configurable :(
    			Object.defineProperty(fn, 'length', { value: 2 });
    		}
    		catch(e) {
    			return false;
    		}

    		return fn.length === 2;
    	})();

        const setFunctionProperties = function setFunctionProperties(text, parity, fn1, fn2) {
            // Make the string representation of fn2 display parameters of fn1
            fn2.toString = function() {
                return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
            };

            // Where possible, define length so that curried functions show how
            // many arguments they are yet expecting
            if (isFunctionLengthDefineable) {
                Object.defineProperty(fn2, 'length', { value: parity });
            }

            return fn2;
        };

        // Make curried functions log a pretty version of their partials
        curry = function curry(fn, muteable, arity) {
            arity  = arity || fn.length;
            return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
        };
    }


    var curry$1 = curry;

    /*
    rest(n, array)
    */

    function rest(i, object) {
        if (object.slice) { return object.slice(i); }
        if (object.rest)  { return object.rest(i); }

        var a = [];
        var n = object.length - i;
        while (n--) { a[n] = object[n + i]; }
        return a;
    }

    /*
    choose(fn, map)
    Returns a function that takes its first argument as a key and uses it
    to select a function in `map` which is invoked with the remaining arguments.

    Where `map` has a function `default`, that function is run when a key
    is not found, otherwise unfound keys will error.

    ```
    var fn = choose({
        'fish':  function fn1(a, b) {...},
        'chips': function fn2(a, b) {...}
    });

    fn('fish', a, b);   // Calls fn1(a, b)
    ```
    */

    function choose(map) {
        return function choose(key) {
            var fn = map[key] || map.default;
            return fn && fn.apply(this, rest(1, arguments)) ;
        };
    }

    /*
    noop()
    Returns undefined.
    */

    function noop() {}

    /*
    requestTick(fn)
    Call `fn` on the next tick.
    */

    const resolved = Promise.resolve();

    function requestTick(fn) {
        resolved.then(fn);
        return fn;
    }

    /*
    toArray(object)
    */

    function toArray(object) {
        if (object.toArray) { return object.toArray(); }

        // Speed test for array conversion:
        // https://jsperf.com/nodelist-to-array/27

        var array = [];
        var l = object.length;
        var i;

        if (typeof object.length !== 'number') { return array; }

        array.length = l;

        for (i = 0; i < l; i++) {
            array[i] = object[i];
        }

        return array;
    }

    const A$1 = Array.prototype;
    const S = String.prototype;

    /*
    by(fn, a, b)
    Compares `fn(a)` against `fn(b)` and returns `-1`, `0` or `1`. Useful for sorting
    objects by property:

    ```
    [{id: '2'}, {id: '1'}].sort(by(get('id')));  // [{id: '1'}, {id: '2'}]
    ```
    */

    function by(fn, a, b) {
        const fna = fn(a);
        const fnb = fn(b);
        return fnb === fna ? 0 : fna > fnb ? 1 : -1 ;
    }

    function byAlphabet(a, b) {
        return S.localeCompare.call(a, b);
    }

    function each(fn, object) {
        // A stricter version of .forEach, where the callback fn
        // gets a single argument and no context.
        var l, n;

        if (typeof object.each === 'function') {
            object.each(fn);
        }
        else {
            l = object.length;
            n = -1;
            while (++n < l) { fn(object[n]); }
        }

        return object;
    }

    function map(fn, object) {
        return object && object.map ? object.map(fn) : A$1.map.call(object, fn) ;
    }

    function filter(fn, object) {
        return object.filter ?
            object.filter(fn) :
            A$1.filter.call(object, fn) ;
    }

    function reduce(fn, seed, object) {
        return object.reduce ?
            object.reduce(fn, seed) :
            A$1.reduce.call(object, fn, seed);
    }

    function sort(fn, object) {
        return object.sort ? object.sort(fn) : A$1.sort.call(object, fn);
    }

    function concat(array2, array1) {
        // A.concat only works with arrays - it does not flatten array-like
        // objects. We need a robust concat that will glue any old thing
        // together.
        return Array.isArray(array1) ?
            // 1 is an array. Convert 2 to an array if necessary
            array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

        array1.concat ?
            // It has it's own concat method. Lets assume it's robust
            array1.concat(array2) :
        // 1 is not an array, but 2 is
        toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
    }

    function contains(value, object) {
        return object.includes ?
            object.includes(value) :
        object.contains ?
            object.contains(value) :
        A$1.includes ?
            A$1.includes.call(object, value) :
            A$1.indexOf.call(object, value) !== -1 ;
    }

    function find(fn, object) {
        return A$1.find.call(object, fn);
    }


    function slice(n, m, object) {
        return object.slice ?
            object.slice(n, m) :
            A$1.slice.call(object, n, m) ;
    }

    /*
    call(fn)
    Returns a function that calls `fn()` with no arguments.
    */

    function call(fn) {
        return fn();
    }

    /*
    choke(fn, time)

    Returns a function that waits for `time` seconds without being invoked
    before calling `fn` using the context and arguments from the latest
    invocation.
    */

    function choke(fn, time) {
        var timer, context, args;
        var cue = function cue() {
            if (timer) { clearTimeout(timer); }
            timer = setTimeout(update, (time || 0) * 1000);
        };

        function update() {
            timer = false;
            fn.apply(context, args);
        }

        function cancel() {
            // Don't permit further changes to be queued
            cue = noop;

            // If there is an update queued apply it now
            if (timer) { clearTimeout(timer); }
        }

        function wait() {
            // Store the latest context and arguments
            context = this;
            args = arguments;

            // Cue the update
            cue();
        }

        wait.cancel = cancel;
        return wait;
    }

    // Choke or wait? A simpler implementation without cancel(), I leave this here for reference...
    //	function choke(seconds, fn) {
    //		var timeout;
    //
    //		function update(context, args) {
    //			fn.apply(context, args);
    //		}
    //
    //		return function choke() {
    //			clearTimeout(timeout);
    //			timeout = setTimeout(update, seconds * 1000, this, arguments);
    //		};
    //	}

    /*
    compose(fn2, fn1)
    Calls `fn1`, passes the result to `fn2`, and returns that result.
    */

    function compose(fn2, fn1) {
        return function compose() {
            return fn2(fn1.apply(null, arguments));
        };
    }

    /*
    id(value)
    Returns `value`.
    */

    function id(value) { return value; }

    /*
    isDefined(value)
    Check for value – where `value` is `undefined`, `NaN` or `null`, returns
    `false`, otherwise `true`.
    */


    function isDefined(value) {
        // !!value is a fast out for non-zero numbers, non-empty strings
        // and other objects, the rest checks for 0, '', etc.
        return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
    }

    function latest(source) {
        var value = source.shift();
        return value === undefined ? arguments[1] : latest(source, value) ;
    }

    /*
    not(value)
    Returns `!value`.
    */

    function not(n) { return !n; }

    const done     = { done: true };
    const iterator = { next: () => done };

    var nothing = Object.freeze({
        // Standard array methods
        shift: noop,
        push:  noop,

        // Stream methods
        start: noop,
        stop:  noop,

        // Make it look like an empty array
        length: 0,

        // Make it an iterable with nothing in it
        [Symbol.iterator]: () => iterator
    });

    function now() {
        // Return time in seconds
        return +new Date() / 1000;
    }

    /*
    overload(fn, map)

    Returns a function that calls a function at the property of `object` that
    matches the result of calling `fn` with all arguments.</p>

    ```
    var fn = overload(toType, {
        string: function a(name, n) {...},
        number: function b(n, m) {...}
    });

    fn('pie', 4); // Returns a('pie', 4)
    fn(1, 2);     // Returns b(1, 2)
    ```
    */


    function overload(fn, map) {
        return typeof map.get === 'function' ?
            function overload() {
                var key = fn.apply(null, arguments);
                return map.get(key).apply(this, arguments);
            } :
            function overload() {
                const key     = fn.apply(null, arguments);
                const handler = (map[key] || map.default);
                if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
                return handler.apply(this, arguments);
            } ;
    }

    function apply(value, fn) {
        return fn(value);
    }

    /*
    pipe(fn1, fn2, ...)
    Returns a function that calls `fn1`, `fn2`, etc., passing the result of
    calling one function to the next and returning the the last result.
    */

    const A$2 = Array.prototype;

    function pipe() {
        const fns = arguments;
        return fns.length ?
            (value) => A$2.reduce.call(fns, apply, value) :
            id ;
    }

    const $private = Symbol('private');

    function privates(object) {
        return object[$private] ?
            object[$private] :
            Object.defineProperty(object, $private, {
                value: {}
            })[$private] ;
    }

    /*
    toClass(object)
    */

    const O = Object.prototype;

    function toClass(object) {
        return O.toString.apply(object).slice(8, -1);
    }

    /*
    parseInt(string)
    Parse to integer without having to worry about the radix parameter,
    making it suitable, for example, to use in `array.map(parseInt)`.
    */

    function parseInteger(object) {
        return object === undefined ?
            undefined :
            parseInt(object, 10);
    }

    /*
    toString(object)
    Returns `object.toString()`.
    */

    function toString(object) {
    	return object.toString();
    }

    /*
    toType(object)
    Returns `typeof object`.
    */

    function toType(object) {
        return typeof object;
    }

    function prepend(string1, string2) {
        return '' + string1 + string2;
    }

    const assign = Object.assign;

    function isDone(source) {
        return source.length === 0 || source.status === 'done' ;
    }

    function create(object, fn) {
        var functor = Object.create(object);
        functor.shift = fn;
        return functor;
    }

    function arrayReducer(array, value) {
        array.push(value);
        return array;
    }

    function shiftTap(shift, fn) {
        return function tap() {
            var value = shift();
            value !== undefined && fn(value);
            return value;
        };
    }

    function sortedSplice(array, fn, value) {
        // Splices value into array at position determined by result of fn,
        // where result is either in the range [-1, 0, 1] or [true, false]
        var n = sortIndex(array, function(n) {
            return fn(value, n);
        });
        array.splice(n, 0, value);
    }

    function sortIndex(array, fn) {
        var l = array.length;
        var n = l + l % 2;
        var i = 0;

        while ((n = Math.floor(n / 2)) && (i + n <= l)) {
            if (fn(array[i + n - 1]) >= 0) {
                i += n;
                n += n % 2;
            }
        }

        return i;
    }

    /* Properties */

    /*
    .status
    Reflects the running status of the stream. When all values have been consumed
    status is `'done'`.
    */

    function Fn(fn) {
        // Accept constructor without `new`
        if (!this || !Fn.prototype.isPrototypeOf(this)) {
            return new Fn(fn);
        }

        var source = this;

        if (!fn) {
            source.status = 'done';
            return;
        }

        var value = fn();

        if (value === undefined) {
            source.status = 'done';
            return;
        }

        this.shift = function shift() {
            if (source.status === 'done') { return; }

            var v = value;

            // Where the next value is undefined mark the functor as done
            value = fn();
            if (value === undefined) {
                source.status = 'done';
            }

            return v;
        };
    }


    assign(Fn, {

        // Constructors

        of: function() { return Fn.from(arguments); },

        from: function(object) {
            var i;

            // object is an array or array-like object. Iterate over it without
            // mutating it.
            if (typeof object.length === 'number') {
                i = -1;

                return new Fn(function shiftArray() {
                    // Ignore undefined holes in arrays
                    return ++i >= object.length ?
                        undefined :
                    object[i] === undefined ?
                        shiftArray() :
                        object[i] ;
                });
            }

            // object is an object with a shift function
            if (typeof object.shift === "function" && object.length === undefined) {
                return new Fn(function shiftObject() {
                    return object.shift();
                });
            }

            // object is an iterator
            if (typeof object.next === "function") {
                return new Fn(function shiftIterator() {
                    var result = object.next();

                    // Ignore undefined holes in iterator results
                    return result.done ?
                        result.value :
                    result.value === undefined ?
                        shiftIterator() :
                        result.value ;
                });
            }

            throw new Error('Fn: from(object) object is not a list of a known kind (array, functor, stream, iterator).')
        }
    });


    function scanChunks(data, value) {
        data.accumulator.push(value);
        ++data.count;

        if (data.count % data.n === 0) {
            data.value = data.accumulator;
            data.accumulator = [];
        }
        else {
            data.value = undefined;
        }

        return data;
    }

    assign(Fn.prototype, {
        shift: noop,

        // Input

        of: function() {
            // Delegate to the constructor's .of()
            return this.constructor.of.apply(this.constructor, arguments);
        },

        // Transform

        ap: function(object) {
            var stream = this;

            return create(this, function ap() {
                var fn = stream.shift();
                return fn && object.map(fn) ;
            });
        },

        /*
        .unshift(...values)
        Creates a buffer of values at the end of the stream that are read first.
        */

        unshift: function() {
            var source = this;
            var buffer = toArray(arguments);

            return create(this, function() {
                return (buffer.length ? buffer : source).shift() ;
            });
        },

        catch: function(fn) {
            var source = this;

            return create(this, function() {
                try {
                    return source.shift();
                }
                catch(e) {
                    return fn(e);
                }
            });
        },

        syphon: function(fn) {
            var shift   = this.shift;
            var buffer1 = [];
            var buffer2 = [];

            this.shift = function() {
                if (buffer1.length) { return buffer1.shift(); }

                var value;

                while ((value = shift()) !== undefined && fn(value)) {
                    buffer2.push(value);
                }

                return value;
            };

            return create(this, function filter() {
                if (buffer2.length) { return buffer2.shift(); }

                var value;

                while ((value = shift()) !== undefined && !fn(value)) {
                    buffer1.push(value);
                }

                return value;
            });
        },

        clone: function() {
            var source  = this;
            var shift   = this.shift;
            var buffer1 = [];
            var buffer2 = [];
            var doneFlag = false;

            // Messy. But it works. Just.

            this.shift = function() {
                var value;

                if (buffer1.length) {
                    value = buffer1.shift();

                    if (!buffer1.length && doneFlag) {
                        source.status = 'done';
                    }

                    return value;
                }

                if (!doneFlag) {
                    value = shift();

                    if (source.status === 'done') {
                        doneFlag = true;
                    }

                    if (value !== undefined) {
                        buffer2.push(value);
                    }

                    return value;
                }
            };

            var clone = new Fn(function shiftClone() {
                var value;

                if (buffer2.length) {
                    return buffer2.shift();
                    //if (!buffer2.length && doneFlag) {
                    //	clone.status = 'done';
                    //}
                }

                if (!doneFlag) {
                    value = shift();

                    if (source.status === 'done') {
                        doneFlag = true;
                        source.status = undefined;
                    }

                    if (value !== undefined) {
                        buffer1.push(value);
                    }

                    return value;
                }
            });

            return clone;
        },

        concat: function() {
            var sources = toArray(arguments);
            var source  = this;

            var stream  = create(this, function concat() {
                if (source === undefined) {
                    stream.status = 'done';
                    return;
                }

                if (isDone(source)) {
                    source = sources.shift();
                    return concat();
                }

                var value = source.shift();

                stream.status = sources.length === 0 && isDone(source) ?
                    'done' : undefined ;

                return value;
            });

            return stream;
        },

        /*
        .dedup()

        Filters out consecutive equal values.
        */

        dedup: function() {
            var v;
            return this.filter(function(value) {
                var old = v;
                v = value;
                return old !== value;
            });
        },

        /*
        .filter(fn)

        Filter values according to the truthiness of `fn(value)`.
        */

        filter: function(fn) {
            var source = this;

            return create(this, function filter() {
                var value;
                while ((value = source.shift()) !== undefined && !fn(value));
                return value;
            });
        },

        /*
        .flat()
        Flattens a list of lists into a single list.
        */

        join: function() {
            console.trace('Fn.join() is now Fn.flat() to mirror name of new Array method');
            return this.flat();
        },

        flat: function() {
            var source = this;
            var buffer = nothing;

            return create(this, function flat() {
                var value = buffer.shift();
                if (value !== undefined) { return value; }
                // Support array buffers and stream buffers
                //if (buffer.length === 0 || buffer.status === 'done') {
                    buffer = source.shift();
                    if (buffer !== undefined) { return flat(); }
                    buffer = nothing;
                //}
            });
        },

        /*
        .flatMap()
        Maps values to lists – `fn(value)` must return an array, stream
        or other type with a `.shift()` method – and flattens those lists into a
        single stream.
        */

        flatMap: function(fn) {
            return this.map(fn).flat();
        },

        chain: function(fn) {
            console.trace('Stream.chain() is now Stream.flatMap()');
            return this.map(fn).flat();
        },

        /*
        .latest()

        When the stream has a values buffered, passes the last value
        in the buffer.
        */

        latest: function() {
            var source = this;
            return create(this, function shiftLast() {
                return latest(source);
            });
        },

        /*
        .map(fn)
        Maps values to the result of `fn(value)`.
        */

        map: function(fn) {
            return create(this, compose(function map(object) {
                return object === undefined ? undefined : fn(object) ;
            }, this.shift));
        },

        ///*
        //.chunk(n)
        //Batches values into arrays of length `n`.
        //*/

        chunk: function(n) {
            return this
            .scan(scanChunks, {
                n: n,
                count: 0,
                accumulator: []
            })
            .map(function(accumulator) {
                return accumulator.value;
            });
        },

        partition: function(fn) {
            var source = this;
            var buffer = [];
            var streams = new Map();

            fn = fn || Fn.id;

            function createPart(key, value) {
                // Todo: Nope, no pull
                var stream = Stream.of().on('pull', shiftPull);
                stream.key = key;
                streams.set(key, stream);
                return stream;
            }

            function shiftPull(type, pullStream) {
                var value  = source.shift();
                if (value === undefined) { return; }

                var key    = fn(value);
                var stream = streams.get(key);

                if (stream === pullStream) { return value; }

                if (stream === undefined) {
                    stream = createPart(key);
                    buffer.push(stream);
                }

                stream.push(value);
                return shiftPull(type, pullStream);
            }

            return create(this, function shiftStream() {
                if (buffer.length) { return buffer.shift(); }

                var value = source.shift();
                if (value === undefined) { return; }

                var key    = fn(value);
                var stream = streams.get(key);

                if (stream === undefined) {
                    stream = createPart(key);
                    stream.push(value);
                    return stream;
                }

                stream.push(value);
                return shiftStream();
            });
        },

        fold: function reduce(fn, seed) {
            return this.scan(fn, seed).latest().shift();
        },

        /*
        .scan(fn, seed)

        Calls `fn(accumulator, value)` and emits `accumulator` for each value
        in the stream.
        */

        scan: function scan(fn, accumulator) {
            return this.map(function scan(value) {
                var acc = fn(accumulator, value);
                accumulator = acc;
                return accumulator;
            });
        },

        /*
        .take(n)

        Filters the stream to the first `n` values.
        */

        take: function(n) {
            var source = this;
            var i = 0;

            return create(this, function take() {
                var value;

                if (i < n) {
                    value = source.shift();
                    // Only increment i where an actual value has been shifted
                    if (value === undefined) { return; }
                    if (++i === n) {
                        this.push = noop;
                        this.stop = noop;
                        this.status = 'done';
                    }
                    return value;
                }
            });
        },

        sort: function(fn) {
            fn = fn || Fn.byGreater ;

            var source = this;
            var buffer = [];

            return create(this, function sort() {
                var value;

                while((value = source.shift()) !== undefined) {
                    sortedSplice(buffer, fn, value);
                }

                return buffer.shift();
            });
        },

        split: function(fn) {
            var source = this;
            var buffer = [];

            return create(this, function split() {
                var value = source.shift();
                var temp;

                if (value === undefined) {
                    if (buffer.length) {
                        temp = buffer;
                        buffer = [];
                        return temp;
                    }

                    return;
                }

                if (fn(value)) {
                    temp = buffer;
                    buffer = [value];
                    return temp.length ? temp : split() ;
                }

                buffer.push(value);
                return split();
            });
        },

        /*
        .rest(n)

        Filters the stream to all values after the `n`th value.
        */

        rest: function(i) {
            var source = this;

            return create(this, function rest() {
                while (i-- > 0) { source.shift(); }
                return source.shift();
            });
        },

        /*
        .unique()

        Filters the stream to remove any value already emitted.
        */

        unique: function() {
            var source = this;
            var values = [];

            return create(this, function unique() {
                var value = source.shift();

                return value === undefined ? undefined :
                    values.indexOf(value) === -1 ? (values.push(value), value) :
                    unique() ;
            });
        },

        // Consumers

        each: function(fn) {
            var value;

            while ((value = this.shift()) !== undefined) {
                fn.call(this, value);
            }

            return this;
        },

        find: function(fn) {
            return this
            .filter(fn)
            .first()
            .shift();
        },

        next: function() {
            return {
                value: this.shift(),
                done:  this.status
            };
        },

        /*
        .pipe(stream)

        Pipes the current stream into `stream`.
        */

        pipe: function(stream) {
            this.each(stream.push);
            return stream;
        },

        /*
        .tap(fn)

        Calls `fn(value)` for each value in the stream without modifying
        the stream. Note that values are only tapped when there is a
        consumer attached to the end of the stream to suck them through.
        */

        tap: function(fn) {
            // Overwrite shift to copy values to tap fn
            this.shift = shiftTap(this.shift, fn);
            return this;
        },

        toJSON: function() {
            const array = [];
            this.scan(arrayReducer, array).each(noop);
            return array;
        },

        toString: function() {
            return this.reduce(prepend, '');
        }
    });

    Fn.prototype.toArray = Fn.prototype.toJSON;

    // Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
    //
    // equals: 'fantasy-land/equals',
    // lte: 'fantasy-land/lte',
    // concat: 'fantasy-land/concat',
    // empty: 'fantasy-land/empty',
    // map: 'fantasy-land/map',
    // contramap: 'fantasy-land/contramap',
    // ap: 'fantasy-land/ap',
    // of: 'fantasy-land/of',
    // alt: 'fantasy-land/alt',
    // zero: 'fantasy-land/zero',
    // reduce: 'fantasy-land/reduce',
    // traverse: 'fantasy-land/traverse',
    // chain: 'fantasy-land/chain',
    // chainRec: 'fantasy-land/chainRec',
    // extend: 'fantasy-land/extend',
    // extract: 'fantasy-land/extract',
    // bimap: 'fantasy-land/bimap',
    // promap: 'fantasy-land/promap'


    if (window.Symbol) {
        // A functor is it's own iterator
        Fn.prototype[Symbol.iterator] = function() {
            return this;
        };
    }

    /*
    remove(array, value)
    Remove `value` from `array`. Where `value` is not in `array`, does nothing.
    */

    function remove(array, value) {
        if (array.remove) { array.remove(value); }
        var i = array.indexOf(value);
        if (i !== -1) { array.splice(i, 1); }
        return value;
    }

    /*
    Timer(duration, getTime)

    Create an object with a request/cancel pair of functions that
    fires request(fn) callbacks at a given duration.
    */

    function Timer(duration, getTime) {
        if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

        // Optional second argument is a function that returns
        // current time (in seconds)
        getTime = getTime || now;

        var fns = [];
        var id;
        var t0  = -Infinity;

        function frame() {
            var n = fns.length;

            id = undefined;
            t0 = getTime();

            while (n--) {
                fns.shift()(t0);
            }
        }

        return {
            now: getTime,

            request: function(fn) {
                if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

                // Add fn to queue
                fns.push(fn);

                // If the timer is cued do nothing
                if (id) { return; }

                var t1 = getTime();

                // Set the timer and return something truthy
                if (t0 + duration > t1) {
                    id = setTimeout(frame, (t0 + duration - t1) * 1000);
                }
                else {
                    requestTick(frame) ;
                }

                // Use the fn reference as the request id, because why not
                return fn;
            },

            cancel: function(fn) {
                var i = fns.indexOf(fn);
                if (i === -1) { return; }

                fns.splice(i, 1);

                if (!fns.length) {
                    clearTimeout(id);
                    id = undefined;
                }
            }
        };
    }

    var DEBUG$1     = window.DEBUG !== false;
    var A$3         = Array.prototype;
    var assign$1    = Object.assign;

    function isValue(n) { return n !== undefined; }

    function isDone$1(stream) {
        return stream.status === 'done';
    }

    function notify(object) {
        var events = privates(object).events;
        if (!events) { return; }

        var n = -1;
        var l = events.length;
        var value;

        while (++n < l) {
            value = events[n](object);
            if (value !== undefined) { return value; }
        }
    }

    function done$1(stream, privates) {
        stream.status = 'done';
        privates.source = nothing;
        privates.resolve();
    }

    function createSource(stream, privates, Source, buffer) {
        buffer = buffer === undefined ? [] :
            buffer.shift ? buffer :
            Array.from(buffer) ;

        // Flag to tell us whether we are using an internal buffer - which
        // depends on the existence of source.shift
        var buffered = true;
        var initialised = false;

        function push() {
            // Detect that buffer exists and is not an arguments object, if so
            // we push to it
            buffered && buffer.push.apply(buffer, arguments);
            initialised && notify(stream);
        }

        function stop(n) {
            // If stop count is not given, use buffer length (if buffer exists and
            // is not arguments object) by default
            n = n !== undefined ? n :
                buffered ? buffer.length :
                0 ;

            // Neuter events
            delete privates.events;

            // If no n, shut the stream down
            if (!n) {
                privates.stops && privates.stops.forEach((fn) => fn());
                privates.stops = undefined;
                done$1(stream, privates);
            }

            // Schedule shutdown of stream after n values
            else {
                privates.source = new StopSource(stream, privates.source, privates, n, done$1);
                privates.stops && privates.stops.forEach((fn) => fn());
                privates.stops = undefined;
            }
        }

        const source = Source.prototype ?
            // Source is constructable
            new Source(push, stop) :
            // Source is an arrow function
            Source(push, stop) ;

        initialised = true;

        // Where source has .shift() override the internal buffer
        if (source.shift) {
            buffered = false;
            buffer = undefined;
        }

        // Otherwise give it a .shift() for the internal buffer
        else {
            source.shift = function () {
                return buffer.shift();
            };
        }

        // Gaurantee that source has a .stop() method
        if (!source.stop) {
            source.stop = noop;
        }

        return (privates.source = source);
    }

    function shiftBuffer(shift, state, one, two, buffer) {
        if (buffer.length && state.buffered === one) {
            return buffer.shift();
        }

        const value = shift();
        if (value === undefined) { return; }

        buffer.push(value);
        state.buffered = two;
        return value;
    }

    function flat(output, input) {
        input.pipe ?
            // Input is a stream
            input.pipe(output) :
            // Input is an array-like
            output.push.apply(output, input) ;

        return output;
    }

    // StartSource

    function StartSource(stream, privates, Source, buffer) {
        this.stream   = stream;
        this.privates = privates;
        this.Source   = Source;
        this.buffer   = buffer;
    }

    assign$1(StartSource.prototype, {
        create: function() {
            return createSource(this.stream, this.privates, this.Source, this.buffer);
        },

        shift: function shift() {
            return this.create().shift();
        },

        push: function push() {
            const source = this.create();
            if (!source.push) { throw new Error('Attempt to .push() to unpushable stream'); }
            source.push.apply(source, arguments);
        },

        start: function start() {
            const source = this.create();
            if (!source.start) { throw new Error('Attempt to .start() unstartable stream'); }
            source.start.apply(source, arguments);
        },

        stop: function done() {
            const source = this.create();

            if (!source.stop) {
                done(this.stream, this.privates);
            }

            source.stop.apply(source, arguments);
        }
    });


    // StopSource

    function StopSource(stream, source, privates, n, done) {
        this.stream   = stream;
        this.source   = source;
        this.privates = privates;
        this.n        = n;
        this.done     = done;
    }

    assign$1(StopSource.prototype, nothing, {
        shift: function() {
            const value = this.source.shift();
            if (--this.n < 1) { this.done(this.stream, this.privates); }
            return value;
        },

        start: function() {
            throw new Error('Cannot .start() stopped stream');
        },

        push: function() {
            throw new Error('Cannot .push() to stopped stream');
        }
    });


    /* Construct */

    /*
    Stream(fn)

    Construct a new stream. `fn(push, stop)` is invoked when the stream is started,
    and it must return a 'producer' – an object with methods to control the flow of
    data:

    ```js
    const stream = Stream(function(push, stop) {
        return {
            push:  fn,  // Optional. Makes the stream pushable.
            start: fn,  // Optional. Makes the stream extarnally startable.
            stop:  fn   // Optional. Makes the stream externally stoppable.
            shift: fn,  // Optional. Overrides the stream's internal buffer.
        };
    });
    ```
    */

    function Stream$1(Source, buffer) {
        if (DEBUG$1) {
            if (arguments.length > 2) {
                throw new Error('Stream(setup, buffer) takes 2 arguments. Recieved ' + arguments.length + '.');
            }
        }

        // Enable construction without the `new` keyword
        if (!Stream$1.prototype.isPrototypeOf(this)) {
            return new Stream$1(Source, buffer);
        }

        // Privates

        const privates$1 = privates(this);
        privates$1.stream  = this;
        privates$1.events  = [];
        privates$1.resolve = noop;
        privates$1.source  = new StartSource(this, privates$1, Source, buffer);

        // Methods

        this.shift = function shift() {
            return privates$1.source.shift();
        };

        // Keep it as an instance method for just now
        this.push = function push() {
            const source = privates$1.source;
            source.push.apply(source, arguments);
            return this;
        };
    }

    Stream$1.prototype = assign$1(Object.create(Fn.prototype), {
        constructor: Stream$1,

        /* Write */

        /*
        .push(value)
        Pushes a `value` (or multiple values) into the head of a writeable stream.
        If the stream is not writeable, it does not have a `.push()` method.
        */

        /* Map */

        ///*
        //.chunk(n)
        //Batches values into arrays of length `n`.
        //*/

        /*
        .flat()
        Flattens a stream of streams or arrays into a single stream.
        */

        flat: function() {
            const output = this.constructor.of();

            this
            .scan(flat, output)
            .each(noop);

            return output;
        },

        /*
        .flatMap(fn)
        Maps values to lists – `fn(value)` must return an array, functor, stream
        (or any other duck with a `.shift()` method) and flattens those lists into a
        single stream.
        */

        /*
        .map(fn)
        Maps values to the result of `fn(value)`.
        */

        /*
        .merge(stream)
        Merges this stream with `stream`, which may be an array, array-like
        or functor.
        */

        merge: function merge() {
            var sources = toArray(arguments);
            sources.unshift(this);
            return Stream$1.Merge.apply(null, sources);
        },

        /*
        .scan(fn, seed)
        Calls `fn(accumulator, value)` and emits `accumulator` for each value
        in the stream.
        */


        /* Filter */

        /*
        .dedup()
        Filters out consecutive equal values.
        */

        /*
        .filter(fn)
        Filter values according to the truthiness of `fn(value)`.
        */

        /*
        .latest()
        When the stream has a values buffered, passes the last value
        in the buffer.
        */

        /*
        .rest(n)
        Filters the stream to the `n`th value and above.
        */

        /*
        .take(n)
        Filters the stream to the first `n` values.
        */

        ///*
        //.clock(timer)
        //Emits values at the framerate of `timer`, one-per-frame. No values
        //are discarded.
        //*/
        //
        //clock: function clock(timer) {
        //    return this.pipe(Stream.clock(timer));
        //},

        /*
        .throttle(time)
        Throttles values such that the latest value is emitted every `time` seconds.
        Other values are discarded. The parameter `time` may also be a timer options
        object, an object with `{ request, cancel, now }` functions,
        allowing the creation of, say, and animation frame throttle.
        */

        throttle: function throttle(timer) {
            return this.pipe(Stream$1.throttle(timer));
        },

        /*
        .wait(time)
        Emits the latest value only after `time` seconds of inactivity.
        Other values are discarded.
        */

        wait: function wait(time) {
            return this.pipe(Stream$1.Choke(time));
        },

        combine: function(fn, source) {
            return Stream$1.Combine(fn, this, source);
        },


        /* Read */

        /*
        .clone()
        Creates a read-only copy of the stream.
        */

        clone: function clone() {
            const source = this;
            const shift  = this.shift.bind(this);
            const buffer = [];

            const state = {
                // Flag telling us which stream has been buffered,
                // source (1) or copy (2)
                buffered: 1
            };

            this.shift = function() {
                return shiftBuffer(shift, state, 1, 2, buffer);
            };

            return new Stream$1(function(notify, stop) {
                source.on(notify);
                source.done(stop);

                return {
                    shift: function() {
                        return shiftBuffer(shift, state, 2, 1, buffer);
                    },

                    stop: function() {
                        stop(0);
                    }
                }
            });
        },

        /*
        .each(fn)
        Thirstilly consumes the stream, calling `fn(value)` whenever
        a value is available.
        */

        each: function each(fn) {
            var args   = arguments;
            var source = this;

            // Flush and observe
            Fn.prototype.each.apply(source, args);

            // Delegate to Fn#each().
            return this.on(() => Fn.prototype.each.apply(source, args));
        },

        /*
        .last(fn)
        Consumes the stream when stopped, calling `fn(value)` with the
        last value read from the stream.
        */

        last: function last(fn) {
            const privates$1 = privates(this);
            privates$1.stops = privates$1.stops || [];
            const value = this.latest().shift();
            value !== undefined && privates$1.stops.push(() => fn(value));
            return this;
        },

        /*
        .fold(fn, accumulator)
        Consumes the stream when stopped, calling `fn(accumulator, value)`
        for each value in the stream. Returns a promise.
        */

        fold: function fold(fn, accumulator) {
            // Fold to promise
            return new Promise((resolve, reject) => {
                this
                .scan(fn, accumulator)
                .last(resolve);
            });
        },

        ///*
        //.reduce(fn, accumulator)
        //Consumes the stream when stopped, calling `fn(accumulator, value)`
        //for each value in the stream. Returns a promise that resolves to
        //the last value returned by `fn(accumulator, value)`.
        //*/

        reduce: function reduce(fn, accumulator) {
            // Support array.reduce semantics with optional seed
            return accumulator ?
                this.fold(fn, accumulator) :
                this.fold((acc, value) => (acc === undefined ? value : fn(acc, value)), this.shift()) ;
        },

        /*
        .shift()
        Reads a value from the stream. If no values are in the stream, returns
        `undefined`. If this is the last value in the stream, `stream.status`
        is `'done'`.
        */

        /* Lifecycle */

        /*
        .done(fn)
        Calls `fn()` after the stream is stopped and all values have been drained.
        */

        done: function done(fn) {
            const privates$1 = privates(this);
            const promise = privates$1.promise || (
                privates$1.promise = this.status === 'done' ?
                    Promise.resolve() :
                    new Promise((resolve, reject) => assign$1(privates$1, { resolve, reject }))
            );

            promise.then(fn);
            return this;
        },

        /*
        .start()
        If the stream's producer is startable, starts the stream.
        */

        start: function start() {
            const source = privates(this).source;
            source.start.apply(source, arguments);
            return this;
        },

        /*
        .stop()
        Stops the stream. No more values can be pushed to the stream and any
        consumers added will do nothing. However, depending on the stream's source
        the stream may yet drain any buffered values into an existing consumer
        before entering `'done'` state. Once in `'done'` state a stream is
        entirely inert.
        */

        stop: function stop() {
            const source = privates(this).source;
            source.stop.apply(source, arguments);
            return this;
        },

        on: function on(fn) {
            if (typeof fn === 'string') {
                throw new Error('stream.on(fn) no longer takes type');
            }

            var events = privates(this).events;
            if (!events) { return this; }

            events.push(fn);
            return this;
        },

        off: function off(fn) {
            if (typeof fn === 'string') {
                throw new Error('stream.off(fn) no longer takes type');
            }

            var events = privates(this).events;
            if (!events) { return this; }

            // Remove all handlers
            if (!fn) {
                events.length = 0;
                return this;
            }

            // Remove handler fn for type
            var n = events.length;
            while (n--) {
                if (events[n] === fn) { events.splice(n, 1); }
            }

            return this;
        }
    });


    /*
    Stream.from(values)
    Returns a writeable stream that consumes the array or array-like `values` as
    its buffer.
    */

    function Pushable(push, stop) {
        return { push, stop };
    }

    Stream$1.from = function(values) {
        return new Stream$1(Pushable, values);
    };


    /*
    Stream.fromPromise(promise)
    Returns a stream that uses the given promise as its source. When the promise
    resolves the stream is given its value and stopped. If the promise errors
    the stream is stopped without value. This stream is not pushable, but may
    be stopped before the promise resolves.
    */

    Stream$1.fromPromise = function(promise) {
        return new Stream$1(function(push, stop) {
            promise.then(push);
            promise.finally(stop);
            return { stop };
        });
    };

    /*
    Stream.fromProperty(name, object)
    Returns a stream of mutations made to the `name` property of `object`,
    assuming those mutations are made to the Observer proxy of object - see
    [Observer](#observer).
    */


    // Clock Stream

    const clockEventPool = [];

    function TimeSource(notify, end, timer) {
        this.notify = notify;
        this.end    = end;
        this.timer  = timer;

        const event = this.event = clockEventPool.shift() || {};
        event.stopTime = Infinity;

        this.frame = (time) => {
            // Catch the case where stopTime has been set before or equal the
            // end time of the previous frame, which can happen if start
            // was scheduled via a promise, and therefore should only ever
            // happen on the first frame: stop() catches this case thereafter
            if (event.stopTime <= event.t2) { return; }

            // Wait until startTime
            if (time < event.startTime) {
                this.requestId = this.timer.request(this.frame);
                return;
            }

            // Reset frame fn without checks
            this.frame = (time) => this.update(time);
            this.frame(time);
        };
    }

    assign$1(TimeSource.prototype, {
        shift: function shift() {
            var value = this.value;
            this.value = undefined;
            return value;
        },

        start: function(time) {
            const now = this.timer.now();

            this.event.startTime = time !== undefined ? time : now ;
            this.event.t2 = time > now ? time : now ;

            // If the currentTime (the last frame time) is greater than now
            // call the frame for up to this point, otherwise add an arbitrary
            // frame duration to now.
            const frameTime = this.timer.currentTime > now ?
                this.timer.currentTime :
                now + 0.08 ;

            if (this.event.startTime > frameTime) {
                // Schedule update on the next frame
                this.requestId = this.timer.request(this.frame);
            }
            else {
                // Run the update on the next tick, in case we schedule stop
                // before it gets chance to fire. This also gaurantees all stream
                // pushes are async.
                Promise.resolve(frameTime).then(this.frame);
            }
        },

        stop: function stop(time) {
            if (this.event.startTime === undefined) {
                // This is a bit of an arbitrary restriction. It wouldnt
                // take much to support this.
                throw new Error('TimeStream: Cannot call .stop() before .start()');
            }

            this.event.stopTime = time || this.timer.now();

            // If stopping during the current frame cancel future requests.
            if (this.event.stopTime <= this.event.t2) {
                this.requestId && this.timer.cancel(this.requestId);
                this.end();
            }
        },

        update: function(time) {
            const event = this.event;
            event.t1 = event.t2;

            this.requestId = undefined;
            this.value     = event;

            if (time >= event.stopTime) {
                event.t2 = event.stopTime;
                this.notify();
                this.end();

                // Release event
                clockEventPool.push(event);
                return;
            }

            event.t2 = time;
            this.notify();
            // Todo: We need this? Test.
            this.value     = undefined;
            this.requestId = this.timer.request(this.frame);
        }
    });


    /*
    Stream.fromTimer(timer)
    Create a stream from a `timer` object. A `timer` is an object
    with the properties:

    ```
    {
        request:     fn(fn), calls fn on the next frame, returns an id
        cancel:      fn(id), cancels request with id
        now:         fn(), returns the time
        currentTime: time at the start of the latest frame
    }
    ```

    Here is how a stream of animation frames may be created:

    ```
    const frames = Stream.fromTimer({
        request: window.requestAnimationFrame,
        cancel: window.cancelAnimationFrame,
        now: () => window.performance.now()
    });
    ```

    This stream is not pushable.
    */

    Stream$1.fromTimer = function TimeStream(timer) {
        return new Stream$1(function(push, stop) {
            return new TimeSource(push, stop, timer);
        });
    };


    /*
    Stream.of(...values)
    Returns a writeable stream that uses arguments as its source.
    */

    Stream$1.of = function() {
        return Stream$1.from(arguments);
    };


    // Stream.Combine

    function toValue(data) {
        var source = data.source;
        var value  = data.value;
        return data.value = value === undefined ? latest(source) : value ;
    }

    function CombineSource(notify, stop, fn, sources) {
        var object = this;

        this._notify  = notify;
        this._stop    = stop;
        this._fn      = fn;
        this._sources = sources;
        this._hot     = true;

        this._store = sources.map(function(source) {
            var data = {
                source: source,
                listen: listen
            };

            // Listen for incoming values and flag as hot
            function listen() {
                data.value = undefined;
                object._hot = true;
            }

            source.on(listen);
            source.on(notify);
            return data;
        });
    }

    assign$1(CombineSource.prototype, {
        shift: function combine() {
            // Prevent duplicate values going out the door
            if (!this._hot) { return; }
            this._hot = false;

            var sources = this._sources;
            var values  = this._store.map(toValue);
            if (sources.every(isDone$1)) { this._stop(0); }
            return values.every(isValue) && this._fn.apply(null, values) ;
        },

        stop: function stop() {
            var notify = this._notify;

            // Remove listeners
            each(function(data) {
                var source = data.source;
                var listen = data.listen;
                source.off(listen);
                source.off(notify);
            }, this._store);

            this._stop(this._hot ? 1 : 0);
        }
    });

    Stream$1.Combine = function(fn) {
        var sources = A$3.slice.call(arguments, 1);

        if (sources.length < 2) {
            throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
        }

        return new Stream$1(function setup(notify, stop) {
            return new CombineSource(notify, stop, fn, sources);
        });
    };


    // Stream.Merge

    function MergeSource(notify, stop, sources) {
        var values = [];

        function update(source) {
            values.push.apply(values, toArray(source));
        }

        this.values  = values;
        this.notify  = notify;
        this.sources = sources;
        this.update  = update;
        this.cueStop = stop;

        each(function(source) {
            // Flush the source
            update(source);

            // Listen for incoming values
            source.on(update);
            source.on(notify);
        }, sources);
    }

    assign$1(MergeSource.prototype, {
        shift: function() {
            if (this.sources.every(isDone$1)) {
                this.stop();
            }

            return this.values.shift();
        },

        stop: function() {
            this.cueStop(this.values.length);
        }
    });

    Stream$1.Merge = function(source1, source2) {
        const sources = Array.from(arguments);
        return new Stream$1(function(push, stop) {
            return new MergeSource(push, stop, sources);
        });
    };


    // Stream Timers

    Stream$1.Choke = function(time) {
        return new Stream$1(function setup(notify, done) {
            var value;
            var update = choke(function() {
                // Get last value and stick it in buffer
                value = arguments[arguments.length - 1];
                notify();
            }, time);

            return {
                shift: function() {
                    var v = value;
                    value = undefined;
                    return v;
                },

                push: update,

                stop: function stop() {
                    update.cancel(false);
                    done();
                }
            };
        });
    };


    // Frame timer

    var frameTimer = {
        now:     now,
        request: requestAnimationFrame.bind(window),
        cancel:  cancelAnimationFrame.bind(window)
    };


    // Stream.throttle

    function schedule() {
        this.queue = noop;
        this.ref   = this.timer.request(this.update);
    }

    function ThrottleSource(notify, stop, timer) {
        this._stop   = stop;
        this.timer   = timer;
        this.queue   = schedule;
        this.update  = function update() {
            this.queue = schedule;
            notify();
        };
    }

    assign$1(ThrottleSource.prototype, {
        shift: function shift() {
            var value = this.value;
            this.value = undefined;
            return value;
        },

        stop: function stop(callLast) {
            var timer = this.timer;

            // An update is queued
            if (this.queue === noop) {
                timer.cancel && timer.cancel(this.ref);
                this.ref = undefined;
            }

            // Don't permit further changes to be queued
            this.queue = noop;

            // If there is an update queued apply it now
            // Hmmm. This is weird semantics. TODO: callLast should
            // really be an 'immediate' flag, no?
            this._stop(this.value !== undefined && callLast ? 1 : 0);
        },

        push: function throttle() {
            // Store the latest value
            this.value = arguments[arguments.length - 1];

            // Queue the update
            this.queue();
        }
    });

    Stream$1.throttle = function(timer) {
        return new Stream$1(function(notify, stop) {
            timer = typeof timer === 'number' ? new Timer(timer) :
                timer ? timer :
                frameTimer;

            return new ThrottleSource(notify, stop, timer);
        });
    };

    /* Observer */

    const $observer = Symbol('observer');

    const A$4            = Array.prototype;
    const nothing$1      = Object.freeze([]);
    const isExtensible = Object.isExtensible;


    // Utils

    function isArrayLike(object) {
    	return object
    	&& typeof object === 'object'
    	// Slows it down a bit
    	//&& object.hasOwnProperty('length')
    	&& typeof object.length === 'number' ;
    }


    // Listeners

    function getListeners(object, name) {
    	return object[$observer].properties[name]
    		|| (object[$observer].properties[name] = []);
    }

    function fire(fns, value, record) {
    	if (!fns) { return; }
        fns = fns.slice(0);
    	var n = -1;
    	while (fns[++n]) {
            // For OO version
            //fns[n].update(value, record);
    		fns[n](value, record);
    	}
    }


    // Observer proxy

    function trapGet(target, name, self) {
    	// Ignore symbols
    	let desc;
    	return typeof name !== 'symbol'
    		&& ((desc = Object.getOwnPropertyDescriptor(target, name)), !desc || desc.writable)
    		&& Observer(target[name])
    		|| target[name] ;
    }

    const arrayHandlers = {
    	get: trapGet,

    	set: function(target, name, value, receiver) {
    		// We are setting a symbol
    		if (typeof name === 'symbol') {
    			target[name] = value;
    			return true;
    		}

    		var old = target[name];
    		var length = target.length;

    		// If we are setting the same value, we're not really setting at all
    		if (old === value) { return true; }

    		var properties = target[$observer].properties;
    		var change;

    		// We are setting length
    		if (name === 'length') {
    			if (value >= target.length) {
    				// Don't allow array length to grow like this
    				target.length = value;
    				return true;
    			}

    			change = {
    				index:   value,
    				removed: A$4.splice.call(target, value),
    				added:   nothing$1,
    			};

    			while (--old >= value) {
    				fire(properties[old], undefined);
    			}
    		}

    		// We are setting an integer string or number
    		else if (+name % 1 === 0) {
    			name = +name;

    			if (value === undefined) {
    				if (name < target.length) {
    					change = {
    						index:   name,
    						removed: A$4.splice.call(target, name, 1),
    						added:   nothing$1
    					};

    					value = target[name];
    				}
    				else {
    					return true;
    				}
    			}
    			else {
    				change = {
    					index:   name,
    					removed: A$4.splice.call(target, name, 1, value),
    					added:   [value]
    				};
    			}
    		}

    		// We are setting some other key
    		else {
    			target[name] = value;
    		}

    		if (target.length !== length) {
    			fire(properties.length, target.length);
    		}

            // Notify the observer
    		fire(properties[name], Observer(value) || value);

            var mutate = target[$observer].mutate;
            fire(mutate, receiver, change);

    		// Return true to indicate success
    		return true;
    	}
    };

    const objectHandlers = {
    	get: trapGet,

    	set: function(target, name, value, receiver) {
    		// If we are setting the same value, we're not really setting at all
    		if (target[name] === value) { return true; }

            // Set value on target, then use that as value
    		target[name] = value;
    		value = target[name];

            // Notify the observer
            var properties = target[$observer].properties;
    		fire(properties[name], Observer(value) || value);

            var mutate = target[$observer].mutate;
            fire(mutate, receiver, {
    			name:    name,
    			removed: target[name],
    			added:   value
    		});

    		// Return true to indicate success
    		return true;
    	}

        //			apply: function(target, context, args) {
        //console.log('MethodProxy', target, context, args);
        //debugger;
        //				return Reflect.apply(target, context, args);
        //			}
    };

    function createObserver(target) {
    	var observer = new Proxy(target, isArrayLike(target) ?
    		arrayHandlers :
    		objectHandlers
    	);

    	// This is strict but slow
    	//define(target, $observer, {
        //    value: {
        //        observer:   observer,
        //        properties: {},
        //        mutate:     []
        //    }
        //});

    	// An order of magnitude faster
    	target[$observer] = {
    		target:     target,
    		observer:   observer,
    		properties: {},
    		mutate:     []
    	};

    	return observer;
    }

    function isObservable(object) {
    	// Many built-in objects and DOM objects bork when calling their
    	// methods via a proxy. They should be considered not observable.
    	// I wish there were a way of whitelisting rather than
    	// blacklisting, but it would seem not.

    	return object
    		// Reject primitives and other frozen objects
    		// This is really slow...
    		//&& !isFrozen(object)
    		// I haven't compared this, but it's necessary for audio nodes
    		// at least, but then only because we're extending with symbols...
    		// hmmm, that may need to change...
    		&& isExtensible(object)
    		// This is less safe but faster.
    		//&& typeof object === 'object'
    		// Reject DOM nodes
    		&& !Node.prototype.isPrototypeOf(object)
    		// Reject WebAudio context
    		&& (typeof BaseAudioContext === 'undefined' || !BaseAudioContext.prototype.isPrototypeOf(object))
    		// Reject dates
    		&& !(object instanceof Date)
    		// Reject regex
    		&& !(object instanceof RegExp)
    		// Reject maps
    		&& !(object instanceof Map)
    		&& !(object instanceof WeakMap)
    		// Reject sets
    		&& !(object instanceof Set)
    		&& !(window.WeakSet && object instanceof WeakSet)
    		// Reject TypedArrays and DataViews
    		&& !ArrayBuffer.isView(object) ;
    }

    /*
    Observer(object)
    Create an Observer proxy around `object`. In order for `observe(...)` to detect
    mutations, changes must be made to this proxy rather than the original
    `object`.
    */

    function Observer(object) {
    	return !object ? undefined :
    		object[$observer] ? object[$observer].observer :
    		isObservable(object) ?
    			createObserver(object) :
    			undefined ;
    }

    ///*
    //Target(object)
    //*/

    function Target(object) {
    	return object
    		&& object[$observer]
    		&& object[$observer].target
    		|| object ;
    }

    /*
    parseSelector(string)

    Takes a string of the form '[key=value, ... ]' and returns a function isMatch
    that returns true when passed an object that matches the selector.
    */

    //                 1 key                 2 quote 3 value           4 comma 5 closing bracket
    const rselector = /^([^\]=,\s]+)\s*(?:=\s*(['"])?([^\]=,\s]+)\2\s*)?(?:(,)|(])(\s*\.$)?)\s*/;

    const fselector = {
        3: function parseValue(match, tokens) {
            match[tokens[1]] =
                tokens[2] ? tokens[3] :
                tokens[3] === 'true' ? true :
                tokens[3] === 'false' ? false :
                isFloatString(tokens[3]) ? parseFloat(tokens[3]) :
                tokens[3] ;

            return match;
        },

        4: parseSelector,

        5: function(match, tokens) {
            return function isMatch(object) {
                let key;

                for (key in match) {
                    if (object[key] !== match[key]) {
                        return false;
                    }
                }

                return true;
            };
        },

        6: function(match, tokens) {
            throw new Error('Observer: A path may not end with "[key=value]." ' + tokens.input);
        }
    };

    function isFloatString(string) {
    	// Convert to float and back to string to check if it retains
    	// the same value.
    	const float = parseFloat(string);
    	return (float + '') === string;
    }

    function parse(regex, fns, acc, path) {
        // If path is a regex result, get path from latest index
        const string = typeof path !== 'string' ?
            path.input.slice(path.index + path[0].length + (path.consumed || 0)) :
            path ;

        const tokens = regex.exec(string);
        if (!tokens) {
            throw new Error('Observer: Invalid path: ' + string + ' : ' + path.input);
        }

        let n = -1;
        while (++n < tokens.length) {
            acc = (tokens[n] !== undefined && fns[n]) ? fns[n](acc, tokens) : acc ;
        }

        path.consumed = tokens.index + tokens[0].length + (tokens.consumed || 0);

        return acc;
    }

    function parseSelector(match, path) {
        return parse(rselector, fselector, match, path);
    }

    function parseSelector$1(path) {
        return parse(rselector, fselector, {}, path);
    }

    { window.observeCount = 0; }

    const A$5       = Array.prototype;
    const nothing$2 = Object.freeze([]);

    //                   1 .name         [2 number  3 'quote' 4 "quote" ]
    const rpath   = /^\.?([^.[\s]+)\s*|^\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|^\[\s*/;

    function isPrimitive(object) {
        return !(object && typeof object === 'object');
    }

    function observePrimitive(primitive, data) {
    	if (primitive !== data.value) {
    		data.old   = data.value;
    		data.value = primitive;
    		data.fn(primitive);
    	}

    	return noop;
    }

    function observeMutable(object, data) {
    	var fns = object[$observer].mutate;
    	fns.push(data.fn);

        { ++window.observeCount; }

    	if (object !== data.value) {
    		data.old   = data.value;
    		data.value = object;
    		data.fn(object, {
    			index:   0,
    			removed: data.old ? data.old : nothing$2,
    			added:   data.value
    		});
    	}

    	return () => {
    		remove(fns, data.fn);

            { --window.observeCount; }
    	};
    }

    function observeSelector(object, isMatch, path, data) {
    	var unobserve = noop;

    	function update(array) {
    		var value = array && A$5.find.call(array, isMatch);
    		unobserve();
    		unobserve = observeUnknown(value, path, data);
    	}

    	// We create an intermediate data object to go with the new update
    	// function. The original data object is passed on inside update.
    	var unobserveMutable = observeMutable(object, { fn: update });

    	return () => {
    		unobserve();
    		unobserveMutable();
    	};
    }

    function observeProperty(object, name, path, data) {
    	var fns = getListeners(object, name);
    	var unobserve = noop;

    	function update(value) {
    		unobserve();
    		unobserve = observeUnknown(value, path, data);
    	}

    	fns.push(update);
        update(object[name]);

        { ++window.observeCount; }

    	return () => {
    		unobserve();
    		remove(fns, update);

            { --window.observeCount; }
    	};
    }

    function readSelector(object, isMatch, path, data) {
    	var value = object && A$5.find.call(object, isMatch);
    	return observeUnknown(Observer(value) || value, path, data);
    }

    function readProperty(object, name, path, data) {
    	return observeUnknown(Observer(object[name]) || object[name], path, data);
    }

    function observeUnknown(object, path, data) {
        // path is ''
        if (!path.length) {
    		return observePrimitive(object, data) ;
    	}

        // path is '.'
        if (path === '.') {
            // We assume the full isObserver() check has been done –
            // this function is internal after all
            return object && object[$observer] ?
                observeMutable(object, data) :
                observePrimitive(object, data) ;
        }

        // Object is primitive
        if (isPrimitive(object)) {
    		return observePrimitive(undefined, data);
    	}

        const tokens = rpath.exec(path);

        if (!tokens) {
            throw new Error('Observer: Invalid path: ' + path + ' : ' + path.length);
        }

        // path is .name, [number], ['name'] or ["name"]
        const name = tokens[1] || tokens[2] || tokens[3] || tokens[4] ;

        if (name) {
            path = tokens.input.slice(tokens.index + tokens[0].length);
            return object[$observer] ?
                observeProperty(object, name, path, data) :
                readProperty(object, name, path, data) ;
        }

        const isMatch = parseSelector$1(tokens);
        path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

        // path is '[key=value]'
        return object[$observer] ?
            observeSelector(object, isMatch, path, data) :
            readSelector(object, isMatch, path, data) ;
    }

    /*
    observe(path, fn, object [, init])

    Observe `path` in `object` and call `fn(value)` with the value at the
    end of that path when it mutates. Returns a function that destroys this
    observer.

    The callback `fn` is called immediately on initialisation if the value at
    the end of the path is not equal to `init`. In the default case where
    `init` is `undefined`, paths that end in `undefined` do not cause the
    callback to be called.

    (To force the callback to always be called on setup, pass in `NaN` as an
    `init` value. In JS `NaN` is not equal to anything (even `NaN`), so it
    always initialises.)
    */

    function observe(path, fn, object, initialValue) {
        return observeUnknown(Observer(object) || object, path + '', {
            value: initialValue,
            fn:    fn
        });
    }

    //import { setPath } from './paths.js';

    function ObserveSource(push, stop, args) {
        const path   = args[0];
        const object = args[1];

    	this.end = stop;
    	this.unobserve = observe(path, (value) => {
    		this.value = value === undefined ? null : value ;
    		push(this.value);
    	}, object);
    }

    ObserveSource.prototype = {
    	shift: function() {
    		var value = this.value;
    		this.value = undefined;
    		return value;
    	},

    	stop: function() {
    		this.unobserve();
    		this.end();
    	},

    	unobserve: noop
    };

    function mutations(path, object) {
    	const args = arguments;
    	return new Stream$1(function(push, stop) {
    		return new ObserveSource(push, stop, args);
    	});
    }

    function requestTime(s, fn) {
        return setTimeout(fn, s * 1000);
    }

    /*
    equals(a, b)
    Perform a deep equality comparison of `a` and `b`. Returns `true` if
    they are equal.
    */

    function equals(a, b) {
        // Fast out if references are for the same object
        if (a === b) { return true; }

        // If either of the values is null, or not an object, we already know
        // they're not equal so get out of here
        if (a === null ||
            b === null ||
            typeof a !== 'object' ||
            typeof b !== 'object') {
            return false;
        }

        // Compare their enumerable keys
        const akeys = Object.keys(a);
        let n = akeys.length;

        while (n--) {
            // Has the property been set to undefined on a?
            if (a[akeys[n]] === undefined) {
                // We don't want to test if it is an own property of b, as
                // undefined represents an absence of value
                if (b[akeys[n]] === undefined) {
                    return true;
                }
            }
            else {
                //
                if (b.hasOwnProperty(akeys[n]) && !equals(a[akeys[n]], b[akeys[n]])) {
                    return false;
                }
            }
        }

        return true;
    }

    /*
    exec(regex, fn, string)
    */

    function exec(regex, fn, string) {
        let data;

        // If string looks like a regex result, get rest of string
        // from latest index
        if (string.input !== undefined && string.index !== undefined) {
            data   = string;
            string = data.input.slice(
                string.index
                + string[0].length
                + (string.consumed || 0)
            );
        }

        // Look for tokens
        const tokens = regex.exec(string);
        if (!tokens) { return; }

        const output = fn(tokens);

        // If we have a parent tokens object update its consumed count
        if (data) {
            data.consumed = (data.consumed || 0)
                + tokens.index
                + tokens[0].length
                + (tokens.consumed || 0) ;
        }

        return output;
    }

    /*
    get(name, object)
    Get property `name` of `object`.
    */

    function get(key, object) {
        // Todo? Support WeakMaps and Maps and other map-like objects with a
        // get method - but not by detecting the get method
        return object[key];

        // Why are we protecting against null again? To innoculate ourselves
        // against DOM nodes?
        //return value === null ? undefined : value ;
    }

    /*
    has(key, value, object)
    Returns `true` if `object[key]` is strictly equal to `value`.
    */

    function has(key, value, object) {
        return object[key] === value;
    }

    /*
    is(a, b)
    Perform a strict equality check of `a === b`.
    */


    var is = Object.is || function is(a, b) { return a === b; };

    /*
    invoke(name, parameters, object)
    Invokes `object.name()` with `parameters` as arguments. For example:

    ```
    models.forEach(invoke('save', [version]));
    ```
    */

    function invoke(name, values, object) {
        return object[name].apply(object, values);
    }

    /*
    matches(selector, object)
    Where `selector` is an object containing properties to be compared against
    properties of `object`. If they are all strictly equal, returns `true`,
    otherwise `false`.

    ```
    const vegeFoods = menu.filter(matches({ vegetarian: true }));
    ```
    */

    function matches(object, item) {
    	let property;
    	for (property in object) {
    		if (object[property] !== item[property]) { return false; }
    	}
    	return true;
    }

    function error(regex, reducers, string) {
        if (string.input !== undefined && string.index !== undefined) {
            string = string.input;
        }

        throw new Error('Cannot capture() in invalid string "' + string + '"');
    }

    function reduce$1(reducers, acc, tokens) {
        let n = -1;

        while (++n < tokens.length) {
            acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
        }

        // Call the optional close fn
        return reducers.close ?
            reducers.close(acc, tokens) :
            acc ;
    }

    /*
    capture(regex, reducers, accumulator, string)
    Parse `string` with `regex`, calling functions in `reducers` to modify
    and return `accumulator`.

    Reducers is an object of functions keyed by the index of their capturing
    group in the regexp result (`0` corresponding to the entire regex match,
    the first capturing group being at index `1`). Reducer functions are
    called in capture order for all capturing groups that captured something.
    Reducers may also define the function 'close', which is called at the end
    of every capture. All functions are passed the paremeters
    `(accumulator, tokens)`, where `tokens` is the regexp result. Functions
    must return an accumulator.

    Reducers may also define a function `'catch'`, which is called when a match
    has not been made (where `'catch'` is not defined an error is thrown).

    ```
    const rvalue = /^\s*(-?\d*\.?\d+)(\w+)?\s*$/;
    const parseValue = capture(rvalue, {
        // Create a new accumulator object each call
        0: () => ({}),

        1: (acc, tokens) => {
            acc.number = parseFloat(tokens[1]);
            return acc;
        },

        2: (acc, tokens) => {
            acc.unit = tokens[2];
            return acc;
        }
    }, {});

    const value = parseValue('36rem');    // { value: 36, unit: 'rem' }
    ```
    */

    function capture(regex, reducers, acc, string) {
        const output = exec(regex, (tokens) => reduce$1(reducers, acc, tokens), string);

        // If tokens is undefined exec has failed apply regex to string
        return output === undefined ?
            // If there is a catch function, call it, otherwise error out
            reducers.catch ?
                reducers.catch(acc, string) :
                error(regex, reducers, string) :

            // Return the accumulator
            output ;
    }

    /*
    set(key, object, value)

    ```
    // Set `input.value` whenever a value is pushed into a stream:
    stream.scan(set('value'), input);
    ```
    */

    function set(key, object, value) {
        return typeof object.set === "function" ?
            object.set(key, value) :
            (object[key] = value) ;
    }

    /*
    toFixed(number)
    */

    const N     = Number.prototype;
    const isNaN = Number.isNaN;

    function toFixed(n, value) {
        if (isNaN(value)) {
            return '';
            // throw new Error('Fn.toFixed does not accept NaN.');
        }

        return N.toFixed.call(value, n);
    }

    var rpath$1  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

    function findByProperty(key, value, array) {
        var l = array.length;
        var n = -1;

        while (++n < l) {
            if (array[n][key] === value) {
                return array[n];
            }
        }
    }


    /* Get path */

    function getRegexPathThing(regex, path, object, fn) {
        var tokens = regex.exec(path);

        if (!tokens) {
            throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
        }

        var key      = tokens[1];
        var property = tokens[3] ?
            findByProperty(key,
                tokens[2] ? tokens[3] :
                tokens[4] ? Boolean(tokens[4]) :
                parseFloat(tokens[5]),
            object) :
            object[key] ;

        return fn(regex, path, property);
    }

    function getRegexPath(regex, path, object) {
        return regex.lastIndex === path.length ?
            object :
        !(object && typeof object === 'object') ?
            undefined :
        getRegexPathThing(regex, path, object, getRegexPath) ;
    }

    function getPath(path, object) {
        rpath$1.lastIndex = 0;
        return getRegexPath(rpath$1, path, object) ;
    }


    /* Set path */

    function setRegexPath(regex, path, object, thing) {
        var tokens = regex.exec(path);

        if (!tokens) {
            throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
        }

        var key = tokens[1];

        if (regex.lastIndex === path.length) {
            // Cannot set to [prop=value] selector
            if (tokens[3]) {
                throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
            }

            return object[key] = thing;
        }

        var value = tokens[3] ?
            findByProperty(key,
                tokens[2] ? tokens[3] :
                tokens[4] ? Boolean(tokens[4]) :
                parseFloat(tokens[5])
            ) :
            object[key] ;

        if (!(value && typeof value === 'object')) {
            value = {};

            if (tokens[3]) {
                if (object.push) {
                    value[key] = tokens[2] ?
                        tokens[3] :
                        parseFloat(tokens[3]) ;

                    object.push(value);
                }
                else {
                    throw new Error('Not supported');
                }
            }

            set(key, object, value);
        }

        return setRegexPath(regex, path, value, thing);
    }

    function setPath(path, object, value) {
        rpath$1.lastIndex = 0;
        return setRegexPath(rpath$1, path, object, value);
    }

    function ap(data, fns) {
    	let n = -1;
    	let fn;
    	while (fn = fns[++n]) {
    		fn(data);
    	}
    }

    /*
    insert(fn, array, object)
    Inserts `object` into `array` at the first index where the result of
    `fn(object)` is greater than `fn(array[index])`.
    */

    const A$6 = Array.prototype;

    function insert(fn, array, object) {
        var n = -1;
        var l = array.length;
        var value = fn(object);
        while(++n < l && fn(array[n]) <= value);
        A$6.splice.call(array, n, 0, object);
        return object;
    }

    /*
    take(n, array)
    */

    function take(i, object) {
        if (object.slice) { return object.slice(0, i); }
        if (object.take)  { return object.take(i); }

        var a = [];
        var n = i;
        while (n--) { a[n] = object[n]; }
        return a;
    }

    const assign$2 = Object.assign;

    /*
    update(fn, array, object)

    Compares the result of calling `fn` on `object` to the result of calling `fn`
    on each value in `array`. If a match is found, `object` has its properties
    assigned to that target, and if not the `object` is spliced into the
    array (preserving a sort order based on the result of `fn(object)`).

    Returns the updated object.
    */

    function update(fn, construct, array, source) {
        const id  = fn(source);
        const obj = array.find((obj) => fn(obj) === id);

        return obj ?
            assign$2(obj, source) :
            insert(fn, array, construct(source)) ;
    }

    function diff(array, object) {
        var values = toArray(array);

        return filter(function(value) {
            var i = values.indexOf(value);
            if (i === -1) { return true; }
            values.splice(i, 1);
            return false;
        }, object)
        .concat(values);
    }

    function intersect(array, object) {
        var values = toArray(array);

        return filter(function(value) {
            var i = values.indexOf(value);
            if (i === -1) { return false; }
            values.splice(i, 1);
            return true;
        }, object);
    }

    function unite(array, object) {
        var values = toArray(array);

        return map(function(value) {
            var i = values.indexOf(value);
            if (i > -1) { values.splice(i, 1); }
            return value;
        }, object)
        .concat(values);
    }

    /*
    last(array)
    Gets the last value from an array.
    */

    function last(array) {
        if (typeof array.length === 'number') {
            return array[array.length - 1];
        }

        // Todo: handle Fns and Streams
    }

    /*
    .append(str2, str1)

    Returns `str1 + str2` as string.
    */

    function append$1(string1, string2) {
        return '' + string2 + string1;
    }

    function prepad(chars, n, value) {
        var string = value + '';
        var i = -1;
        var pre = '';

        while (pre.length < n - string.length) {
            pre += chars[++i % chars.length];
        }

        string = pre + string;
        return string.slice(string.length - n);
    }

    function postpad(chars, n, value) {
        var string = value + '';

        while (string.length < n) {
            string = string + chars;
        }

        return string.slice(0, n);
    }

    /*
    slugify(string)

    Replaces any series of non-word characters with a `'-'` and lowercases the rest.

        slugify('Party on #mydudes!') // 'party-on-mydudes'
    */

    function slugify(string) {
        if (typeof string !== 'string') { return; }
        return string
        .trim()
        .toLowerCase()
        .replace(/^[\W_]+/, '')
        .replace(/[\W_]+$/, '')
        .replace(/[\W_]+/g, '-');
    }

    function toCamelCase(string) {
        // Be gracious in what we accept as input
        return string.replace(/-(\w)?/g, function($0, letter) {
            return letter ? letter.toUpperCase() : '';
        });
    }

    const DEBUG$2 = window.DEBUG === undefined || window.DEBUG;

    const defs = {
        // Primitive types

        'boolean': (value) =>
            typeof value === 'boolean',

        'function': (value) =>
            typeof value === 'function',

        'number': (value) =>
            typeof value === 'number',

        'object': (value) =>
            typeof value === 'object',

        'symbol': (value) =>
            typeof value === 'symbol',

        // Functional types
        // Some of these are 'borrowed' from SancturyJS
        // https://github.com/sanctuary-js/sanctuary-def/tree/v0.19.0

        'Any': noop,

        'Array': (value) =>
            Array.isArray(value),

        'ArrayLike': (value) =>
            typeof value.length === 'number',

        'Boolean': (value) =>
            typeof value === 'boolean',

        'Date': (value) =>
            value instanceof Date
            && !Number.isNaN(value.getTime()),

        'Error': (value) =>
            value instanceof Error,

        'Integer': (value) =>
            Number.isInteger(value)
            && Number.MIN_SAFE_INTEGER <= value
            && Number.MAX_SAFE_INTEGER >= value,

        'NegativeInteger': (value) =>
            Number.isInteger(value)
            && Number.MIN_SAFE_INTEGER <= value
            && Number.MAX_SAFE_INTEGER >= value
            && value < 0,

        'NonPositiveInteger': (value) =>
            Number.isInteger(value)
            && Number.MIN_SAFE_INTEGER <= value
            && Number.MAX_SAFE_INTEGER >= value
            && value <= 0,

        'PositiveInteger': (value) =>
            Number.isInteger(value)
            && Number.MIN_SAFE_INTEGER <= value
            && Number.MAX_SAFE_INTEGER >= value
            && value > 0,

        'NonNegativeInteger': (value) =>
            Number.isInteger(value)
            && Number.MIN_SAFE_INTEGER <= value
            && Number.MAX_SAFE_INTEGER >= value
            && value >= 0,

        'Number': (value) =>
            typeof value === 'number'
            && !Number.isNaN(value),

        'NegativeNumber': (value) =>
            typeof value === 'number'
            && value < 0,

        'NonPositiveNumber': (value) =>
            typeof value === 'number'
            && value <= 0,

        'PositiveNumber': (value) =>
            typeof value === 'number'
            && value > 0,

        'NonNegativeNumber': (value) =>
            typeof value === 'number'
            && value >= 0,

        'Null': (value) =>
            value === null,

        'Object': (value) =>
            !!value
            && typeof value === 'object',

        'RegExp': (value) =>
            value instanceof RegExp
    };

    const checkType = DEBUG$2 ? function checkType(type, value, file, line, message) {
        if (!defs[type]) {
            throw new RangeError('Type "' + type + '" not recognised');
        }

        if (!defs[type](value)) {
            throw new Error(message || 'value not of type "' + type + '": ' + value, file, line);
        }
    } : noop ;

    const checkTypes = DEBUG$2 ? function checkTypes(types, args, file, line) {
        var n = types.length;

        while (n--) {
            checkType(types[n], args[n], file, line, 'argument ' + n + ' not of type "' + types[n] + '": ' + args[n]);
        }
    } : noop ;

    function def(notation, fn, file, line) {
        // notation is of the form:
        // 'Type, Type -> Type'
        // Be generous with what we accept as output marker '->' or '=>'
        var parts = notation.split(/\s*[=-]>\s*/);
        var types = parts[0].split(/\s*,\s*/);
        var returnType = parts[1];

        return DEBUG$2 ? function() {
            checkTypes(types, arguments, file, line);
            const output = fn.apply(this, arguments);
            checkType(returnType, output, file, line, 'return value not of type "' + returnType + '": ' + output);
            return output;
        } : fn ;
    }

    // Cubic bezier function (originally translated from
    // webkit source by Christian Effenberger):
    // http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

    /*
    cubicBezier(point1, point2, duration, x)
    Where `point1` and `point2` are `[x, y]` arrays describing control points.
    */

    function sampleCubicBezier(a, b, c, t) {
        // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
        return ((a * t + b) * t + c) * t;
    }

    function sampleCubicBezierDerivative(a, b, c, t) {
        return (3 * a * t + 2 * b) * t + c;
    }

    function solveCubicBezierX(a, b, c, x, epsilon) {
        // Solve x for a cubic bezier
        var x2, d2, i;
        var t2 = x;

        // First try a few iterations of Newton's method -- normally very fast.
        for(i = 0; i < 8; i++) {
            x2 = sampleCubicBezier(a, b, c, t2) - x;
            if (Math.abs(x2) < epsilon) {
                return t2;
            }
            d2 = sampleCubicBezierDerivative(a, b, c, t2);
            if (Math.abs(d2) < 1e-6) {
                break;
            }
            t2 = t2 - x2 / d2;
        }

        // Fall back to the bisection method for reliability.
        var t0 = 0;
        var t1 = 1;

        t2 = x;

        if(t2 < t0) { return t0; }
        if(t2 > t1) { return t1; }

        while(t0 < t1) {
            x2 = sampleCubicBezier(a, b, c, t2);
            if(Math.abs(x2 - x) < epsilon) {
                return t2;
            }
            if (x > x2) { t0 = t2; }
            else { t1 = t2; }
            t2 = (t1 - t0) * 0.5 + t0;
        }

        // Failure.
        return t2;
    }

    function cubicBezier(p1, p2, duration, x) {
        // The epsilon value to pass given that the animation is going
        // to run over duruation seconds. The longer the animation, the
        // more precision is needed in the timing function result to
        // avoid ugly discontinuities.
        var epsilon = 1 / (200 * duration);

        // Calculate the polynomial coefficients. Implicit first and last
        // control points are (0,0) and (1,1).
        var cx = 3 * p1[0];
        var bx = 3 * (p2[0] - p1[0]) - cx;
        var ax = 1 - cx - bx;
        var cy = 3 * p1[1];
        var by = 3 * (p2[1] - p1[1]) - cy;
        var ay = 1 - cy - by;

        var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
        return sampleCubicBezier(ay, by, cy, y);
    }

    // Normalisers take a min and max and transform a value in that range
    // to a value on the normal curve of a given type

    const linear = def(
        'Number, Number, Number => Number',
        (min, max, value) => (value - min) / (max - min)
    );

    const quadratic = def(
        'Number, Number, Number => Number',
        (min, max, value) => Math.pow((value - min) / (max - min), 1/2)
    );

    const cubic = def(
        'Number, Number, Number => Number',
        (min, max, value) => Math.pow((value - min) / (max - min), 1/3)
    );

    const logarithmic = def(
        'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
        (min, max, value) => Math.log(value / min) / Math.log(max / min)
    );

    const linearLogarithmic = def(
        'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
        (min, max, value) => {
            // The bottom 1/9th of the range is linear from 0 to min, while
            // the top 8/9ths is dB linear from min to max.
            return value <= min ?
                (value / min) / 9 :
                (0.1111111111111111 + (Math.log(value / min) / Math.log(max / min)) / 1.125) ;
        }
    );

    // cubicBezier
    // `begin` and `end` are objects of the form
    // { point:  [x, y], handle: [x, y] }

    const cubicBezier$1 = def(
        'Object, Object, Number => Number',
        (begin, end, value) => cubicBezier({
            0: linear(begin.point[0], end.point[0], begin.handle[0]),
            1: linear(begin.point[0], end.point[0], begin.handle[0])
        }, {
            0: linear(begin.point[0], end.point[0], end.handle[0]),
            1: linear(begin.point[0], end.point[0], end.handle[0])
        }, 1, linear(begin.point[0], end.point[0], value))
    );

    var normalise = /*#__PURE__*/Object.freeze({
        __proto__: null,
        linear: linear,
        quadratic: quadratic,
        cubic: cubic,
        logarithmic: logarithmic,
        linearLogarithmic: linearLogarithmic,
        cubicBezier: cubicBezier$1
    });

    // Denormalisers take a min and max and transform a value into that range
    // from the range of a curve of a given type

    const linear$1 = def(
        'Number, Number, Number => Number',
        (min, max, value) => value * (max - min) + min
    );

    const quadratic$1 = def(
        'Number, Number, Number => Number',
        (min, max, value) => Math.pow(value, 2) * (max - min) + min
    );

    const cubic$1 = def(
        'Number, Number, Number => Number',
        (min, max, value) => Math.pow(value, 3) * (max - min) + min
    );

    const logarithmic$1 = def(
        'PositiveNumber, PositiveNumber, Number => Number',
        (min, max, value) => min * Math.pow(max / min, value)
    );

    const linearLogarithmic$1 = def(
        'PositiveNumber, PositiveNumber, Number => Number',
        (min, max, value) => {
            // The bottom 1/9th of the range is linear from 0 to min, while
            // the top 8/9ths is dB linear from min to max.
            return value <= 0.1111111111111111 ?
                value * 9 * min :
                min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
        }
    );

    // cubicBezier
    // `begin` and `end` are objects of the form
    // { point:  [x, y], handle: [x, y] }

    const cubicBezier$2 = def(
        'Object, Object, Number => Number',
        (begin, end, value) => linear$1(begin.point[1], end.point[1], cubicBezier({
            0: linear(begin.point[0], end.point[0], begin.handle[0]),
            1: linear(begin.point[1], end.point[1], begin.handle[1])
        }, {
            0: linear(begin.point[0], end.point[0], end.handle[0]),
            1: linear(begin.point[1], end.point[1], end.handle[1])
        }, 1, value))
    );

    var denormalise = /*#__PURE__*/Object.freeze({
        __proto__: null,
        linear: linear$1,
        quadratic: quadratic$1,
        cubic: cubic$1,
        logarithmic: logarithmic$1,
        linearLogarithmic: linearLogarithmic$1,
        cubicBezier: cubicBezier$2
    });

    // Constant for converting radians to degrees
    const angleFactor = 180 / Math.PI;

    function sum(a, b)  { return b + a; }
    function multiply(a, b) { return b * a; }
    function min(a, b)  { return a > b ? b : a ; }
    function max(a, b)  { return a < b ? b : a ; }
    function pow(n, x)  { return Math.pow(x, n); }
    function exp(n, x)  { return Math.pow(n, x); }
    function log(n, x)  { return Math.log(x) / Math.log(n); }
    function root(n, x) { return Math.pow(x, 1/n); }

    /*
    mod(divisor, n)
    JavaScript's modulu operator (`%`) uses Euclidean division, but for
    stuff that cycles through 0 the symmetrics of floored division are often
    are more useful.
    */

    function mod(d, n) {
        var value = n % d;
        return value < 0 ? value + d : value ;
    }

    /*
    limit(min, max, n)
    */

    function limit(min, max, n) {
        return n > max ? max : n < min ? min : n ;
    }

    function wrap(min, max, n) {
        return (n < min ? max : min) + (n - min) % (max - min);
    }

    /*
    gcd(a, b)
    */

    function gcd(a, b) {
        // Greatest common divider
        return b ? gcd(b, a % b) : a ;
    }

    /*
    lcm(a, b)
    */

    function lcm(a, b) {
        // Lowest common multiple.
        return a * b / gcd(a, b);
    }

    function factorise(n, d) {
        // Reduce a fraction by finding the Greatest Common Divisor and
        // dividing by it.
        var f = gcd(n, d);
        return [n/f, d/f];
    }

    /*
    todB(level)
    */

    // A bit disturbingly, a correction factor is needed to make todB() and
    // to toLevel() reciprocate more accurately. This is quite a lot to be off
    // by... Todo: investigate?
    const dBCorrectionFactor = (60 / 60.205999132796244);

    function todB(n)    { return 20 * Math.log10(n) * dBCorrectionFactor; }

    /*
    toLevel(dB)
    */

    function toLevel(n) { return Math.pow(2, n / 6); }

    function toRad(n)   { return n / angleFactor; }
    function toDeg(n)   { return n * angleFactor; }

    // Exponential functions
    //
    // e - exponent
    // x - range 0-1
    //
    // eg.
    // var easeInQuad   = exponential(2);
    // var easeOutCubic = exponentialOut(3);
    // var easeOutQuart = exponentialOut(4);

    function exponentialOut(e, x) {
        return 1 - Math.pow(1 - x, e);
    }

    /*
    toPolar(cartesian)
    */

    function toPolar(cartesian) {
        var x = cartesian[0];
        var y = cartesian[1];

        return [
            // Distance
            x === 0 ?
                Math.abs(y) :
            y === 0 ?
                Math.abs(x) :
                Math.sqrt(x*x + y*y) ,
            // Angle
            Math.atan2(x, y)
        ];
    }

    /*
    toCartesian(polar)
    */

    function toCartesian(polar) {
        var d = polar[0];
        var a = polar[1];

        return [
            Math.sin(a) * d ,
            Math.cos(a) * d
        ];
    }

    function createOrdinals(ordinals) {
    	var array = [], n = 0;

    	while (n++ < 31) {
    		array[n] = ordinals[n] || ordinals.n;
    	}

    	return array;
    }

    var langs = {
    	'en': {
    		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
    		months:   ('January February March April May June July August September October November December').split(' '),
    		ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
    	},

    	'fr': {
    		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
    		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
    		ordinals: createOrdinals({ n: "ième", 1: "er" })
    	},

    	'de': {
    		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
    		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
    		ordinals: createOrdinals({ n: "er" })
    	},

    	'it': {
    		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
    		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
    		ordinals: createOrdinals({ n: "o" })
    	}
    };


    // Date string parsing
    //
    // Don't parse date strings with the JS Date object. It has variable
    // time zone behaviour. Set up our own parsing.
    //
    // Accept BC dates by including leading '-'.
    // (Year 0000 is 1BC, -0001 is 2BC.)
    // Limit months to 01-12
    // Limit dates to 01-31

    var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
    //                sign   year        month       day               T or -
    var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

    /*
    parseDate(date)
    Parse a date, where, `date` may be:

    - a string in ISO date format
    - a number in seconds UNIX time
    - a date object

    Returns a date object, or *the* date object, if it validates.
    */

    const parseDate = overload(toType, {
    	number:  secondsToDate,
    	string:  exec$1(rdate, createDate),
    	object:  function(date) {
    		return isValidDate(date) ? date : undefined ;
    	},
    	default: function(date) {
            throw new TypeError('parseDate(date) date is not of a supported type (' + (typeof date) + ')');
        }
    });

    /*
    parseDateLocal(date)
    As `parseDate(date)`, but returns a date object with local time set to the
    result of the parse (or the original date object, if it validates).
    */

    const parseDateLocal = overload(toType, {
    	number:  secondsToDate,
    	string:  exec$1(rdate, createDateLocal),
    	object:  function(date) {
    		return isValidDate(date) ? date : undefined ;
    	},
    	default: function(date) {
            throw new Error('parseDateLocal: date is not of a supported type (number, string, Date)');
        }
    });

    function isValidDate(date) {
    	return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
    }

    function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
    	// Month must be 0-indexed for the Date constructor
    	month = parseInt(month, 10) - 1;

    	var date = new Date(
    		ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
    		second ? Date.UTC(year, month, day, hour, minute, second) :
    		minute ? Date.UTC(year, month, day, hour, minute) :
    		hour ?   Date.UTC(year, month, day, hour) :
    		day ?    Date.UTC(year, month, day) :
    		month ?  Date.UTC(year, month) :
    		Date.UTC(year)
    	);

    	if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
    		setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
    	}

    	return date;
    }

    function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
    	if (zone) {
    		throw new Error('Time.parseDateLocal() will not parse a string with a time zone "' + zone + '".');
    	}

    	// Month must be 0-indexed for the Date constructor
    	month = parseInt(month, 10) - 1;

    	return ms ?  new Date(year, month, day, hour, minute, second, ms) :
    		second ? new Date(year, month, day, hour, minute, second) :
    		minute ? new Date(year, month, day, hour, minute) :
    		hour ?   new Date(year, month, day, hour) :
    		day ?    new Date(year, month, day) :
    		month ?  new Date(year, month) :
    		new Date(year) ;
    }

    function exec$1(regex, fn, error) {
    	return function exec(string) {
    		var parts = regex.exec(string);
    		if (!parts && error) { throw error; }
    		return parts ?
    			fn.apply(null, parts) :
    			undefined ;
    	};
    }

    function secondsToDate(n) {
    	return new Date(secondsToMilliseconds(n));
    }

    function setTimeZoneOffset(sign, hour, minute, date) {
    	if (sign === '+') {
    		date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
    		if (minute) {
    			date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
    		}
    	}
    	else if (sign === '-') {
    		date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
    		if (minute) {
    			date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
    		}
    	}

    	return date;
    }



    // Date object formatting
    //
    // Use the internationalisation methods for turning a date into a UTC or
    // locale string, the date object for turning them into a local string.

    var dateFormatters = {
    	YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
    	YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
    	MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
    	MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
    	MMMM: function(date, lang) { return langs[lang || Time.lang].months[date.getMonth()]; },
    	D:    function(date)       { return '' + date.getDate(); },
    	DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
    	ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
    	dddd: function(date, lang) { return langs[lang || Time.lang].days[date.getDay()]; },
    	hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
    	//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
    	mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
    	ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
    	sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
    	ms:   function(date)       { return '' + date.getMilliseconds(); },

    	// Experimental
    	am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
    	zz:   function(date) {
    		return (date.getTimezoneOffset() < 0 ? '+' : '-') +
    			 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
    	},
    	th:   function(date, lang) { return langs[lang || Time.lang].ordinals[date.getDate()]; },
    	n:    function(date) { return +date; },
    	ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
    };

    var componentFormatters = {
    	YYYY: function(data)       { return data.year; },
    	YY:   function(data)       { return ('0' + data.year).slice(-2); },
    	MM:   function(data)       { return data.month; },
    	MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
    	MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
    	D:    function(data)       { return parseInt(data.day, 10) + ''; },
    	DD:   function(data)       { return data.day; },
    	ddd:  function(data)       { return data.weekday.slice(0,3); },
    	dddd: function(data, lang) { return data.weekday; },
    	hh:   function(data)       { return data.hour; },
    	//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
    	mm:   function(data)       { return data.minute; },
    	ss:   function(data)       { return data.second; },
    	//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
    	//ms:   function(data)       { return '' + date.getMilliseconds(); },
    };

    var componentKeys = {
    	// Components, in order of appearance in the locale string
    	'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
    	// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
    	// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
    	default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
    };

    var options$1 = {
    	// Time zone
    	timeZone:      'UTC',
    	// Use specified locale matcher
    	formatMatcher: 'basic',
    	// Use 24 hour clock
    	hour12:        false,
    	// Format string components
    	weekday:       'long',
    	year:          'numeric',
    	month:         '2-digit',
    	day:           '2-digit',
    	hour:          '2-digit',
    	minute:        '2-digit',
    	second:        '2-digit',
    	//timeZoneName:  'short'
    };

    var rtoken    = /([YZMDdhmswz]{2,4}|D|\+-)/g;
    var rusdate   = /\w{3,}|\d+/g;
    var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

    function matchEach(regex, fn, text) {
    	var match = regex.exec(text);

    	return match ? (
    		fn.apply(null, match),
    		matchEach(regex, fn, text)
    	) :
    	undefined ;
    }

    function toLocaleString(timezone, locale, date) {
    	options$1.timeZone = timezone || 'UTC';
    	var string = date.toLocaleString(locale, options$1);
    	return string;
    }

    function toLocaleComponents(timezone, locale, date) {
    	var localedate = toLocaleString(timezone, locale, date);
    	var components = {};
    	var keys       = componentKeys[locale] || componentKeys.default;
    	var i          = 0;

    	matchEach(rusdate, function(value) {
    		components[keys[i++]] = value;
    	}, localedate);

    	return components;
    }

    function _formatDate(string, timezone, locale, date) {
    	// Derive lang from locale
    	var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

    	// Todo: only en-US and fr supported for the time being
    	locale = locale === 'en' ? 'en-US' :
    		locale ? locale :
    		'en-US';

    	var data    = toLocaleComponents(timezone, locale, date);
    	var formats = componentFormatters;

    	return string.replace(rtoken, function($0) {
    		return formats[$0] ? formats[$0](data, lang) : $0 ;
    	});
    }

    /*
    formatDateLocal(format, locale, date)
    */

    function formatDateLocal(string, locale, date) {
    	var formatters = dateFormatters;
    	var lang = locale.slice(0, 2);

    	// Use date formatters to get time as current local time
    	return string.replace(rtoken, function($0) {
    		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
    	});
    }

    /*
    formatDateISO(date)
    Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
    a string in the ISO date format.
    */

    function formatDateISO(date) {
    	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
    }


    // Time operations

    var days   = {
    	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
    };

    var dayMap = [6,0,1,2,3,4,5];

    /*
    toDay(date)
    Returns day of week as a number, where monday is `0`.
    */

    function toDay(date) {
    	return dayMap[date.getDay()];
    }

    /*
    cloneDate(date)
    Returns new date object set to same time.
    */

    function cloneDate(date) {
    	return new Date(+date);
    }

    function addDateComponents(sign, yy, mm, dd, date) {
    	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

    	if (!mm) { return; }

    	// Adding and subtracting months can give weird results with the JS
    	// date object. For example, taking a montha way from 2018-03-31 results
    	// in 2018-03-03 (or the 31st of February), whereas adding a month on to
    	// 2018-05-31 results in the 2018-07-01 (31st of June).
    	//
    	// To mitigate this weirdness track the target month and roll days back
    	// until the month is correct, like Python's relativedelta utility:
    	// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
    	var month       = date.getUTCMonth();
    	var monthDiff   = sign * parseInt(mm, 10);
    	var monthTarget = mod(12, month + monthDiff);

    	date.setUTCMonth(month + monthDiff);

    	// If the month is too far in the future scan backwards through
    	// months until it fits. Setting date to 0 means setting to last
    	// day of previous month.
    	while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

    	if (!dd) { return; }

    	date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
    }

    function _addDate(duration, date) {
    	// Don't mutate the original date
    	date = cloneDate(date);

    	// First parse the date portion duration and add that to date
    	var tokens = rdatediff.exec(duration) ;
    	var sign = 1;

    	if (tokens) {
    		sign = tokens[1] === '-' ? -1 : 1 ;
    		addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

    		// If there is no 'T' separator go no further
    		if (!tokens[5]) { return date; }

    		// Prepare duration for time parsing
    		duration = duration.slice(tokens[0].length);

    		// Protect against parsing a stray sign before time
    		if (duration[0] === '-') { return date; }
    	}

    	// Then parse the time portion and add that to date
    	var time = parseTimeDiff(duration);
    	if (time === undefined) { return; }

    	date.setTime(date.getTime() + sign * time * 1000);
    	return date;
    }

    function diff$1(t, d1, d2) {
    	var y1 = d1.getUTCFullYear();
    	var m1 = d1.getUTCMonth();
    	var y2 = d2.getUTCFullYear();
    	var m2 = d2.getUTCMonth();

    	if (y1 === y2 && m1 === m2) {
    		return t + d2.getUTCDate() - d1.getUTCDate() ;
    	}

    	t += d2.getUTCDate() ;

    	// Set to last date of previous month
    	d2.setUTCDate(0);
    	return diff$1(t, d1, d2);
    }

    function _diffDateDays(date1, date2) {
    	var d1 = parseDate(date1);
    	var d2 = parseDate(date2);

    	return d2 > d1 ?
    		// 3rd argument mutates, so make sure we get a clean date if we
    		// have not just made one.
    		diff$1(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
    		diff$1(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
    }

    function floorDateByGrain(grain, date) {
    	var diff, week;

    	if (grain === 'ms') { return date; }

    	date.setUTCMilliseconds(0);
    	if (grain === 'second') { return date; }

    	date.setUTCSeconds(0);
    	if (grain === 'minute') { return date; }

    	date.setUTCMinutes(0);
    	if (grain === 'hour') { return date; }

    	date.setUTCHours(0);
    	if (grain === 'day') { return date; }

    	if (grain === 'week') {
    		date.setDate(date.getDate() - toDay(date));
    		return date;
    	}

    	if (grain === 'fortnight') {
    		week = floorDateByDay(1, new Date());
    		diff = mod(14, _diffDateDays(week, date));
    		date.setUTCDate(date.getUTCDate() - diff);
    		return date;
    	}

    	date.setUTCDate(1);
    	if (grain === 'month') { return date; }

    	date.setUTCMonth(0);
    	if (grain === 'year') { return date; }

    	date.setUTCFullYear(0);
    	return date;
    }

    function floorDateByDay(day, date) {
    	var currentDay = date.getUTCDay();

    	// If we are on the specified day, return this date
    	if (day === currentDay) { return date; }

    	var diff = currentDay - day;
    	if (diff < 0) { diff = diff + 7; }
    	return _addDate('-0000-00-0' + diff, date);
    }

    function _floorDate(grain, date) {
    	// Clone date before mutating it
    	date = cloneDate(date);
    	return typeof grain === 'number' ? floorDateByDay(grain, date) :
            days[grain] ? floorDateByDay(days[grain], date) :
    	    floorDateByGrain(grain, date) ;
    }

    /*
    addDate(diff, date)
    Sums `diff` and `date`, where `diff` is a string in ISO date format. Returns
    a new date object.

    ```
    const addWeek = addDate('0000-00-07');
    const sameTimeNextWeek = addWeek(new Date());
    ```
    */

    const addDate = curry$1(function(diff, date) {
    	return _addDate(diff, parseDate(date));
    });

    const diffDateDays = curry$1(_diffDateDays);

    /*
    floorDate(token, date)
    Floors date to the nearest `token`, where `token` is one of:
    `'year'`,
    `'month'`,
    `'week'`,
    `'day'`,
    `'hour'`,
    `'minute'`
    or `'second'`;
    `'mon'`,
    `'tue'`,
    `'wed'`,
    `'thu'`,
    `'fri'`,
    `'sat'`,
    `'sun'`;
    or a number representing a weekday.

    ```
    const dayCounts = times.map(floorTime('days'));
    ```
    */

    const floorDate = curry$1(function(token, date) {
    	return _floorDate(token, parseDate(date));
    });

    /*
    formatDate(format, date)
    Formats `date` (a string or number or date accepted by `parseDate(date)`)
    to the format of the string `format`. The format string may contain the tokens:

    - `'YYYY'` years
    - `'YY'`   2-digit year
    - `'MM'`   month, 2-digit
    - `'MMM'`  month, 3-letter
    - `'MMMM'` month, full name
    - `'D'`    day of week
    - `'DD'`   day of week, two-digit
    - `'ddd'`  weekday, 3-letter
    - `'dddd'` weekday, full name
    - `'hh'`   hours
    - `'mm'`   minutes
    - `'ss'`   seconds

    ```
    const time = formatTime('+-hh:mm:ss', 3600);   // 01:00:00
    ```
    */

    const formatDate = curry$1(function(string, timezone, locale, date) {
    	return string === 'ISO' ?
    		formatDateISO(parseDate(date)) :
    	timezone === 'local' ?
    		formatDateLocal(string, locale, date) :
    	_formatDate(string, timezone, locale, parseDate(date)) ;
    });


    // Time

    // Decimal places to round to when comparing times
    var precision = 9;
    function minutesToSeconds(n) { return n * 60; }
    function hoursToSeconds(n) { return n * 3600; }

    function secondsToMilliseconds(n) { return n * 1000; }
    function secondsToMinutes(n) { return n / 60; }
    function secondsToHours(n) { return n / 3600; }
    function secondsToDays(n) { return n / 86400; }
    function secondsToWeeks(n) { return n / 604800; }

    function prefix(n) {
    	return n >= 10 ? '' : '0';
    }

    // Hours:   00-23 - 24 should be allowed according to spec
    // Minutes: 00-59 -
    // Seconds: 00-60 - 60 is allowed, denoting a leap second

    //var rtime   = /^([+-])?([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d|60)(?:.(\d+))?)?)?$/;
    //                sign   hh       mm           ss
    var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
    var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

    /*
    parseTime(time)

    Where `time` is a string it is parsed as a time in ISO time format; as
    hours `'13'`, with minutes `'13:25'`, with seconds `'13:25:14'` or with
    decimal seconds `'13:25:14.001'`: it is returned as a number in seconds.

    ```
    const time = parseTime('13:25:14.001');   // 48314.001
    ```

    Where `time` is a number it is assumed to represent a time in seconds
    and is returned directly.

    ```
    const time = parseTime(60);               // 60
    ```
    */

    const parseTime = overload(toType, {
    	number:  id,
    	string:  exec$1(rtime, createTime),
    	default: function(object) {
    		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
    	}
    });

    var parseTimeDiff = overload(toType, {
    	number:  id,
    	string:  exec$1(rtimediff, createTime),
    	default: function(object) {
    		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
    	}
    });

    var _floorTime = choose({
    	week:   function(time) { return time - mod(604800, time); },
    	day:    function(time) { return time - mod(86400, time); },
    	hour:   function(time) { return time - mod(3600, time); },
    	minute: function(time) { return time - mod(60, time); },
    	second: function(time) { return time - mod(1, time); }
    });

    var timeFormatters = {
    	'+-': function sign(time) {
    		return time < 0 ? '-' : '' ;
    	},

    	www: function www(time) {
    		time = time < 0 ? -time : time;
    		var weeks = Math.floor(secondsToWeeks(time));
    		return prefix(weeks) + weeks;
    	},

    	dd: function dd(time) {
    		time = time < 0 ? -time : time;
    		var days = Math.floor(secondsToDays(time));
    		return prefix(days) + days;
    	},

    	hhh: function hhh(time) {
    		time = time < 0 ? -time : time;
    		var hours = Math.floor(secondsToHours(time));
    		return prefix(hours) + hours;
    	},

    	hh: function hh(time) {
    		time = time < 0 ? -time : time;
    		var hours = Math.floor(secondsToHours(time % 86400));
    		return prefix(hours) + hours;
    	},

    	mm: function mm(time) {
    		time = time < 0 ? -time : time;
    		var minutes = Math.floor(secondsToMinutes(time % 3600));
    		return prefix(minutes) + minutes;
    	},

    	ss: function ss(time) {
    		time = time < 0 ? -time : time;
    		var seconds = Math.floor(time % 60);
    		return prefix(seconds) + seconds ;
    	},

    	sss: function sss(time) {
    		time = time < 0 ? -time : time;
    		var seconds = time % 60;
    		return prefix(seconds) + toMaxDecimals(precision, seconds);
    	},

    	ms: function ms(time) {
    		time = time < 0 ? -time : time;
    		var ms = Math.floor(secondsToMilliseconds(time % 1));
    		return ms >= 100 ? ms :
    			ms >= 10 ? '0' + ms :
    			'00' + ms ;
    	}
    };

    function createTime(match, sign, hh, mm, sss) {
    	var time = hoursToSeconds(parseInt(hh, 10))
            + (mm ? minutesToSeconds(parseInt(mm, 10))
                + (sss ? parseFloat(sss, 10) : 0)
            : 0) ;

    	return sign === '-' ? -time : time ;
    }

    function formatTimeString(string, time) {
    	return string.replace(rtoken, function($0) {
    		return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
    	}) ;
    }

    function _formatTimeISO(time) {
    	var sign = time < 0 ? '-' : '' ;

    	if (time < 0) { time = -time; }

    	var hours = Math.floor(time / 3600);
    	var hh = prefix(hours) + hours ;
    	time = time % 3600;
    	if (time === 0) { return sign + hh + ':00'; }

    	var minutes = Math.floor(time / 60);
    	var mm = prefix(minutes) + minutes ;
    	time = time % 60;
    	if (time === 0) { return sign + hh + ':' + mm; }

    	var sss = prefix(time) + toMaxDecimals(precision, time);
    	return sign + hh + ':' + mm + ':' + sss;
    }

    function toMaxDecimals(precision, n) {
    	// Make some effort to keep rounding errors under control by fixing
    	// decimals and lopping off trailing zeros
    	return n.toFixed(precision).replace(/\.?0+$/, '');
    }

    /*
    formatTime(format, time)
    Formats `time` (a string or a number) to the format of the `format` string.
    The format string may contain the tokens:

    - '+-'    sign
    - `'www'` weeks
    - `'dd'`  days
    - `'hhh'` duration hours, unlimited
    - `'hh'`  time hours, 24-hour cycle
    - `'mm'`  time minutes
    - `'ss'`  time seconds
    - `'sss'` time seconds with decimals
    - `'ms'`  time milliseconds

    ```
    const time = formatTime('+-hh:mm:ss', 3600);   // 01:00:00
    ```
    */

    const formatTime = curry$1(function(string, time) {
    	return string === 'ISO' ?
    		_formatTimeISO(parseTime(time)) :
    		formatTimeString(string, parseTime(time)) ;
    });

    /*
    addTime(time1, time2)
    Sums `time2` and `time1`, returning UNIX time as a number in seconds.
    If `time1` is a string, it is parsed as a time diff, where numbers
    are accepted outside the bounds of 0-24 hours or 0-60 minutes or seconds.
    For example, to add 72 minutes to a list of times:

    ```
    const laters = times.map(addTime('00:72'));
    ```
    */

    const addTime = curry$1(function(time1, time2) {
    	return parseTime(time2) + parseTimeDiff(time1);
    });

    const subTime = curry$1(function(time1, time2) {
    	return parseTime(time2) - parseTimeDiff(time1);
    });

    const diffTime = curry$1(function(time1, time2) {
    	return parseTime(time1) - parseTime(time2);
    });

    /*
    floorTime(token, time)
    Floors `time` to the nearest `token`, where `token` is one of: `'week'`, `'day'`,
    `'hour'`, `'minute'` or `'second'`. `time` may be an ISO time string or a time
    in seconds. Returns a time in seconds.

    ```
    const hourCounts = times.map(floorTime('hour'));
    ```
    */

    const floorTime = curry$1(function(token, time) {
    	return _floorTime(token, parseTime(time));
    });

    var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

    var domify = overload(toType$1, {
    	'string': createArticle,

    	'function': function(template, name, size) {
    		return createArticle(multiline(template), name, size);
    	},

    	'default': function(template) {
    		// WHAT WHY?
    		//var nodes = typeof template.length === 'number' ? template : [template] ;
    		//append(nodes);
    		//return nodes;
    	}
    });

    var browser = /firefox/i.test(navigator.userAgent) ? 'FF' :
    	document.documentMode ? 'IE' :
    	'standard' ;

    const createSection = cache(function createSection() {
    	const section = document.createElement('section');
    	section.setAttribute('class', 'test-section');
    	document.body.appendChild(section);
    	return section;
    });

    function createArticle(html, name, size) {
    	const section = createSection();

    	const article = document.createElement('article');
    	article.setAttribute('class', 'span-' + (size || 2) + '-test-article test-article');

    	const title = document.createElement('h2');
    	title.setAttribute('class', 'test-title');
    	title.innerHTML = name;

    	const div = document.createElement('div');
    	div.setAttribute('class', 'test-fixture');

    	div.innerHTML = html;
    	article.appendChild(title);
    	article.appendChild(div);
    	section.appendChild(article);

    	return {
    		section: section,
    		article: article,
    		title:   title,
    		fixture: div
    	};
    }

    function multiline(fn) {
    	if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
    	var match = rcomment.exec(fn.toString());
    	if (!match) { throw new TypeError('multiline: comment missing.'); }
    	return match[1];
    }

    function toType$1(object) {
    	return typeof object;
    }

    // #e2006f
    // #332256

    if (window.console && window.console.log) {
        window.console.log('%cFn%c          - https://github.com/stephband/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
    }
    const requestTime$1 = curry$1(requestTime, true, 2);
    const and     = curry$1(function and(a, b) { return !!(a && b); });
    const or      = curry$1(function or(a, b) { return a || b; });
    const xor     = curry$1(function xor(a, b) { return (a || b) && (!!a !== !!b); });

    const assign$3      = curry$1(Object.assign, true, 2);
    const capture$1     = curry$1(capture);
    const define      = curry$1(Object.defineProperties, true, 2);
    const equals$1      = curry$1(equals, true);
    const exec$2        = curry$1(exec);
    const get$1         = curry$1(get, true);
    const has$1         = curry$1(has, true);
    const is$1          = curry$1(is, true);
    const invoke$1      = curry$1(invoke, true);
    const matches$1     = curry$1(matches, true);
    const parse$1       = curry$1(capture);
    const set$1         = curry$1(set, true);
    const toFixed$1     = curry$1(toFixed);
    const getPath$1     = curry$1(getPath, true);
    const setPath$1     = curry$1(setPath, true);

    const by$1          = curry$1(by, true);
    const byAlphabet$1  = curry$1(byAlphabet);

    const ap$1          = curry$1(ap, true);
    const concat$1      = curry$1(concat, true);
    const contains$1    = curry$1(contains, true);
    const each$1        = curry$1(each, true);
    const filter$1      = curry$1(filter, true);
    const find$1        = curry$1(find, true);
    const map$1         = curry$1(map, true);
    const reduce$2      = curry$1(reduce, true);
    const remove$1      = curry$1(remove, true);
    const rest$1        = curry$1(rest, true);
    const slice$1       = curry$1(slice, true, 3);
    const sort$1        = curry$1(sort, true);
    const insert$1      = curry$1(insert, true);
    const take$1        = curry$1(take, true);
    const update$1      = curry$1(update, true);

    const diff$2        = curry$1(diff, true);
    const intersect$1   = curry$1(intersect, true);
    const unite$1       = curry$1(unite, true);

    const append$2      = curry$1(append$1);
    const prepend$1     = curry$1(prepend);
    const prepad$1      = curry$1(prepad);
    const postpad$1     = curry$1(postpad);

    const sum$1         = curry$1(sum);

    const add         = curry$1(function(a, b) {
        console.trace('Fn module add() is now sum()');
        return sum(a, b);
    });

    const multiply$1    = curry$1(multiply);
    const min$1         = curry$1(min);
    const max$1         = curry$1(max);
    const mod$1         = curry$1(mod);
    const pow$1         = curry$1(pow);
    const exp$1         = curry$1(exp);
    const log$1         = curry$1(log);
    const gcd$1         = curry$1(gcd);
    const lcm$1         = curry$1(lcm);
    const root$1        = curry$1(root);
    const limit$1       = curry$1(limit);
    const wrap$1        = curry$1(wrap);
    const factorise$1   = curry$1(factorise);
    const cubicBezier$3 = curry$1(cubicBezier);
    const normalise$1   = curry$1(choose(normalise), false, 4);
    const denormalise$1 = curry$1(choose(denormalise), false, 4);
    const exponentialOut$1 = curry$1(exponentialOut);

    /*
    ready(fn)
    Calls `fn` on DOM content load, or if later than content load, immediately
    (on the next tick).
    */

    const ready = new Promise(function(accept, reject) {
    	function handle(e) {
    		document.removeEventListener('DOMContentLoaded', handle);
    		window.removeEventListener('load', handle);
    		accept(e);
    	}

    	document.addEventListener('DOMContentLoaded', handle);
    	window.addEventListener('load', handle);
    });

    var ready$1 = ready.then.bind(ready);

    function now$1() {
       // Return DOM time in seconds
       return window.performance.now() / 1000;
    }

    /*
    style(property, node)

    Returns the computed style `property` of `node`.

        style('transform', node);            // returns transform

    If `property` is of the form `"property:name"`, a named aspect of the property
    is returned.

        style('transform:rotate', node);     // returns rotation, as a number, in radians
        style('transform:scale', node);      // returns scale, as a number
        style('transform:translateX', node); // returns translation, as a number, in px
        style('transform:translateY', node); // returns translation, as a number, in px
    */

    var rpx          = /px$/;
    var styleParsers = {
    	"transform:translateX": function(node) {
    		var matrix = computedStyle('transform', node);
    		if (!matrix || matrix === "none") { return 0; }
    		var values = valuesFromCssFn(matrix);
    		return parseFloat(values[4]);
    	},

    	"transform:translateY": function(node) {
    		var matrix = computedStyle('transform', node);
    		if (!matrix || matrix === "none") { return 0; }
    		var values = valuesFromCssFn(matrix);
    		return parseFloat(values[5]);
    	},

    	"transform:scale": function(node) {
    		var matrix = computedStyle('transform', node);
    		if (!matrix || matrix === "none") { return 0; }
    		var values = valuesFromCssFn(matrix);
    		var a = parseFloat(values[0]);
    		var b = parseFloat(values[1]);
    		return Math.sqrt(a * a + b * b);
    	},

    	"transform:rotate": function(node) {
    		var matrix = computedStyle('transform', node);
    		if (!matrix || matrix === "none") { return 0; }
    		var values = valuesFromCssFn(matrix);
    		var a = parseFloat(values[0]);
    		var b = parseFloat(values[1]);
    		return Math.atan2(b, a);
    	}
    };

    function valuesFromCssFn(string) {
    	return string.split('(')[1].split(')')[0].split(/\s*,\s*/);
    }

    function computedStyle(name, node) {
    	return window.getComputedStyle ?
    		window
    		.getComputedStyle(node, null)
    		.getPropertyValue(name) :
    		0 ;
    }

    function style(name, node) {
        // If name corresponds to a custom property name in styleParsers...
        if (styleParsers[name]) { return styleParsers[name](node); }

        var value = computedStyle(name, node);

        // Pixel values are converted to number type
        return typeof value === 'string' && rpx.test(value) ?
            parseFloat(value) :
            value ;
    }

    // Units

    const runit = /(\d*\.?\d+)(r?em|vw|vh)/;
    //var rpercent = /(\d*\.?\d+)%/;

    const units = {
    	em: function(n) {
    		return getFontSize() * n;
    	},

    	rem: function(n) {
    		return getFontSize() * n;
    	},

    	vw: function(n) {
    		return window.innerWidth * n / 100;
    	},

    	vh: function(n) {
    		return window.innerHeight * n / 100;
    	}
    };

    let fontSize;

    function getFontSize() {
    	return fontSize ||
    		(fontSize = style("font-size", document.documentElement), 10);
    }

    /*
    toPx(value)`

    Takes a string of the form '10rem', '100vw' or '100vh' and returns a number in pixels.
    */

    const toPx = overload(toType, {
    	'number': id,

    	'string': function(string) {
    		var data = runit.exec(string);

    		if (data) {
    			return units[data[2]](parseFloat(data[1]));
    		}

    		throw new Error('dom: "' + string + '" cannot be parsed as rem, em, vw or vh units.');
    	}
    });


    /*
    toRem(value)

    Takes number in pixels and returns a string of the form '10rem'.
    */

    function toRem(n) {
    	return (toPx(n) / getFontSize()) + 'rem';
    }

    /*
    toVw(value)

    Takes number in pixels and returns a string of the form '10vw'.
    */

    function toVw(n) {
    	return (100 * toPx(n) / window.innerWidth) + 'vw';
    }

    /*
    toVh(value)

    Takes number in pixels and returns a string of the form '10vh'.
    */

    function toVh(n) {
    	return (100 * toPx(n) / window.innerHeight) + 'vh';
    }

    const rules = [];

    const types = overload(toType, {
        'number':   id,
        'string':   toPx,
        'function': function(fn) { return fn(); }
    });

    const tests = {
        minWidth: function(value)  { return width >= types(value); },
        maxWidth: function(value)  { return width <  types(value); },
        minHeight: function(value) { return height >= types(value); },
        maxHeight: function(value) { return height <  types(value); },
        minScrollTop: function(value) { return scrollTop >= types(value); },
        maxScrollTop: function(value) { return scrollTop <  types(value); },
        minScrollBottom: function(value) { return (scrollHeight - height - scrollTop) >= types(value); },
        maxScrollBottom: function(value) { return (scrollHeight - height - scrollTop) <  types(value); }
    };

    let width = window.innerWidth;
    let height = window.innerHeight;
    let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

    function test(query) {
        var keys = Object.keys(query);
        var n = keys.length;
        var key;

        if (keys.length === 0) { return false; }

        while (n--) {
            key = keys[n];
            if (!tests[key](query[key])) { return false; }
        }

        return true;
    }

    function update$2(e) {
        var l = rules.length;
        var rule;

        // Run exiting rules
        while (l--) {
            rule = rules[l];

            if (rule.state && !test(rule.query)) {
                rule.state = false;
                rule.exit && rule.exit(e);
            }
        }

        l = rules.length;

        // Run entering rules
        while (l--) {
            rule = rules[l];

            if (!rule.state && test(rule.query)) {
                rule.state = true;
                rule.enter && rule.enter(e);
            }
        }
    }

    function scroll(e) {
        scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        update$2(e);
    }

    function resize(e) {
        width = window.innerWidth;
        height = window.innerHeight;
        scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        update$2(e);
    }

    window.addEventListener('scroll', scroll);
    window.addEventListener('resize', resize);

    ready$1(update$2);
    document.addEventListener('DOMContentLoaded', update$2);

    /*
    prefix(string)
    Returns a prefixed CSS property name where a prefix is required in the current
    browser.
    */

    const prefixes = ['Khtml','O','Moz','Webkit','ms'];

    var node = document.createElement('div');
    var cache$1 = {};

    function testPrefix(prop) {
        if (prop in node.style) { return prop; }

        var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
        var l = prefixes.length;
        var prefixProp;

        while (l--) {
            prefixProp = prefixes[l] + upper;

            if (prefixProp in node.style) {
                return prefixProp;
            }
        }

        return false;
    }

    function prefix$1(prop){
        return cache$1[prop] || (cache$1[prop] = testPrefix(prop));
    }

    const define$1 = Object.defineProperties;

    /*
    features

    An object of feature detection results.

    ```
    {
        inputEventsWhileDisabled: true, // false in FF, where disabled inputs don't trigger events
        template: true,                 // false in old browsers where template.content not found
        textareaPlaceholderSet: true,   // false in IE, where placeholder is also set on innerHTML
        transition: true,               // false in older browsers where transitions not supported
        fullscreen: true,               // false where fullscreen API not supported
        scrollBehavior: true,           // Whether scroll behavior CSS is supported
        events: {
            fullscreenchange: 'fullscreenchange',
            transitionend:    'transitionend'
        }
    }
    ```
    */

    var features = define$1({
    	events: define$1({}, {
    		fullscreenchange: {
    			get: cache(function() {
    				// TODO: untested event names
    				return ('fullscreenElement' in document) ? 'fullscreenchange' :
    				('webkitFullscreenElement' in document) ? 'webkitfullscreenchange' :
    				('mozFullScreenElement' in document) ? 'mozfullscreenchange' :
    				('msFullscreenElement' in document) ? 'MSFullscreenChange' :
    				'fullscreenchange' ;
    			}),

    			enumerable: true
    		},

    		transitionend: {
    			// Infer transitionend event from CSS transition prefix

    			get: cache(function() {
    				var end = {
    					KhtmlTransition: false,
    					OTransition: 'oTransitionEnd',
    					MozTransition: 'transitionend',
    					WebkitTransition: 'webkitTransitionEnd',
    					msTransition: 'MSTransitionEnd',
    					transition: 'transitionend'
    				};

    				var prefixed = prefix$1('transition');
    				return prefixed && end[prefixed];
    			}),

    			enumerable: true
    		}
    	})
    }, {
    	inputEventsWhileDisabled: {
    		// FireFox won't dispatch any events on disabled inputs:
    		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

    		get: cache(function() {
    			var input     = document.createElement('input');
    			var testEvent = Event('featuretest');
    			var result    = false;

    			document.body.appendChild(input);
    			input.disabled = true;
    			input.addEventListener('featuretest', function(e) { result = true; });
    			input.dispatchEvent(testEvent);
    			input.remove();

    			return result;
    		}),

    		enumerable: true
    	},

    	template: {
    		get: cache(function() {
    			// Older browsers don't know about the content property of templates.
    			return 'content' in document.createElement('template');
    		}),

    		enumerable: true
    	},

    	textareaPlaceholderSet: {
    		// IE sets textarea innerHTML (but not value) to the placeholder
    		// when setting the attribute and cloning and so on. The twats have
    		// marked it "Won't fix":
    		//
    		// https://connect.microsoft.com/IE/feedback/details/781612/placeholder-text-becomes-actual-value-after-deep-clone-on-textarea

    		get: cache(function() {
    			var node = document.createElement('textarea');
    			node.setAttribute('placeholder', '---');
    			return node.innerHTML === '';
    		}),

    		enumerable: true
    	},

    	transition: {
    		get: cache(function testTransition() {
    			var prefixed = prefix$1('transition');
    			return prefixed || false;
    		}),

    		enumerable: true
    	},

    	fullscreen: {
    		get: cache(function testFullscreen() {
    			var node = document.createElement('div');
    			return !!(node.requestFullscreen ||
    				node.webkitRequestFullscreen ||
    				node.mozRequestFullScreen ||
    				node.msRequestFullscreen);
    		}),

    		enumerable: true
    	},

    	scrollBehavior: {
    		get: cache(function() {
    			return 'scrollBehavior' in document.documentElement.style;
    		})
    	}
    });

    const shadowOptions = { mode: 'open' };

    const constructors = {
        'a':        HTMLAnchorElement,
        'p':        HTMLParagraphElement,
        'br':       HTMLBRElement,
        'img':      HTMLImageElement,
        'template': HTMLTemplateElement
    };

    function getElementConstructor(tag) {
            // Return a constructor from the known list of tag names – not all tags
            // have constructor names that match their tags
        return constructors[tag]
            // Or assemble the tag name in the form "HTMLTagElement" and return
            // that property of the window object
            || window['HTML' + tag[0].toUpperCase() + tag.slice(1) + 'Element']
            || (() => {
                throw new Error('Constructor not found for tag "' + tag + '"');
            })();
    }

    function transferProperty(elem, key) {
        if (elem.hasOwnProperty(key)) {
            const value = elem[key];
            delete elem[key];
            elem[key] = value;
        }

        return elem;
    }

    function getTemplateById(id) {
        const template = document.getElementById(options.shadow.slice(1));

        if (!template || !template.content) {
            throw new Error('Template "' + options.shadow + '" not found in document');
        }

        return template;
    }

    function createShadow(template, elem) {
        if (!template) { return; }

        // Create a shadow root if there is DOM content
        const shadow = elem.attachShadow(shadowOptions) ;

        // If template is a <template>
        if (typeof template === 'string') {
            shadow.innerHTML = template;
        }
        else {
            shadow.appendChild(template.content.cloneNode(true));
        }

        return shadow;
    }

    function element(name, options) {
        // Legacy...
        // element() has changed signature from (name, template, attributes, properties, options) –
        // support the old signature with a warning.
        if (typeof options === 'string') {
            throw new Error('dom element(): new signature element(name, options). Everything is an option.');
        }

        // Get the element constructor from options.tag, or the
        // base HTMLElement constructor
        const constructor = options.extends ?
            getElementConstructor(options.extends) :
            HTMLElement ;

        const template = options && options.shadow && (
            typeof options.shadow === 'string' ?
                // If options.shadow is an #id, search for <template id="id">
                options.shadow[0] === '#' ? getTemplateById(options.shadow.slice(1)) :
                // It must be a string of HTML
                options.shadow :
            options.shadow.content ?
                // It must be a template node
                options.shadow :
            // Whatever it is, we don't support it
            function(){
                throw new Error('element() options.shadow not recognised as template node, id or string');
            }()
        );

        function Element() {
            // Construct on instance of Constructor using the Element prototype
            const elem   = Reflect.construct(constructor, arguments, Element);
            const shadow = createShadow(template, elem);

            options.construct
            && options.construct.call(elem, shadow);

            // At this point, if properties have already been set before the
            // element was upgraded, they exist on the elem itself, where we have
            // just upgraded it's protytype to define those properties those
            // definitions will never be reached. Either:
            //
            // 1. Define properties on the instance instead of the prototype
            //    Object.defineProperties(elem, properties);
            //
            // 2. Take a great deal of care not to set properties before an element
            //    is upgraded. I can't impose a restriction like that.
            //
            // 3. Copy defined properties to their prototype handlers and delete
            //    them on the instance.
            //
            // Let's go with 3. I'm not happy you have to do this, though.
            options.properties
            && Object.keys(options.properties).reduce(transferProperty, elem);

            return elem;
        }

        // options.properties
        //
        // Map of getter/setters called when properties mutate.
        //
        // {
        //     name: { get: fn, set: fn }
        // }

        Element.prototype = Object.create(constructor.prototype, options.properties || {}) ;

        // options.attributes
        //
        // Map of functions called when named attributes change.
        //
        // {
        //     name: fn
        // }

        if (options.attributes) {
            Element.observedAttributes = Object.keys(options.attributes);

            Element.prototype.attributeChangedCallback = function(name, old, value) {
                options.attributes[name].call(this, value, name);
            };
        }

        // options.connect

        if (options.connect) {
            Element.prototype.connectedCallback = options.connect;
        }

        // options.disconnect

        if (options.disconnect) {
            Element.prototype.disconnectedCallback = options.disconnect;
        }

        // options.extends

        window.customElements.define(name, Element, options);

        return Element;
    }

    /*
    escape(string)
    Escapes `string` for setting safely as HTML.
    */

    var pre  = document.createElement('pre');
    var text = document.createTextNode('');

    pre.appendChild(text);

    function escape(value) {
    	text.textContent = value;
    	return pre.innerHTML;
    }

    var mimetypes = {
    	xml:  'application/xml',
    	html: 'text/html',
    	svg:  'image/svg+xml'
    };

    /*
    parse(type, string)

    Returns a document parsed from `string`, where `type` is one of `'xml'`,
    `'html'` or `'svg'`.
    */

    function parse$2(type, string) {
    	if (!string) { return; }

    	var mimetype = mimetypes[type];
    	var xml;

    	// From jQuery source...
    	try {
    		xml = (new window.DOMParser()).parseFromString(string, mimetype);
    	} catch (e) {
    		xml = undefined;
    	}

    	if (!xml || xml.getElementsByTagName("parsererror").length) {
    		throw new Error("dom: Invalid XML: " + string);
    	}

    	return xml;
    }

    // Types

    /*
    isFragmentNode(node)

    Returns `true` if `node` is a fragment.
    */

    function isFragmentNode(node) {
    	return node.nodeType === 11;
    }

    /*
    tag(node)

    Returns the tag name of `node`.

    ```
    const li = create('li', 'Salt and vinegar');
    tag(li);   // 'li'
    ```
    */

    function tag(node) {
    	return node.tagName && node.tagName.toLowerCase();
    }

    function contains$2(child, node) {
    	return node.contains ?
    		node.contains(child) :
    	child.parentNode ?
    		child.parentNode === node || contains$2(child.parentNode, node) :
    	false ;
    }

    /*
    attribute(name, node)

    Returns the string contents of attribute `name`. If the attribute is not set,
    returns `undefined`.
    */

    function attribute(name, node) {
    	return node.getAttribute && node.getAttribute(name) || undefined ;
    }

    function find$2(selector, node) {
    	return node.querySelector(selector);
    }

    function matches$2(selector, node) {
    	return node.matches ? node.matches(selector) :
    		node.matchesSelector ? node.matchesSelector(selector) :
    		node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
    		node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
    		node.msMatchesSelector ? node.msMatchesSelector(selector) :
    		node.oMatchesSelector ? node.oMatchesSelector(selector) :
    		// Dumb fall back to simple tag name matching. Nigh-on useless.
    		tag(node) === selector ;
    }

    function closest(selector, node) {
    	var root = arguments[2];

    	if (!node || node === document || node === root || node.nodeType === 11) { return; }

    	// SVG <use> elements store their DOM reference in
    	// .correspondingUseElement.
    	node = node.correspondingUseElement || node ;

    	return matches$2(selector, node) ?
    		 node :
    		 closest(selector, node.parentNode, root) ;
    }

    function query(selector, node) {
    	return toArray(node.querySelectorAll(selector));
    }

    /*
    append(target, node)`

    Appends node to `target`.

    If `node` is a collection of nodes, appends each node to `target`.
    */

    if (!Element.prototype.append) {
        console.warn('A polyfill for Element.append() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append)');
    }

    function append$3(target, node) {
        target.append(node);
        return node;
    }

    /*
    assign(node, attributes)

    Sets the key-value pairs of the object `attributes` as attributes on `node`.
    */

    const setAttribute = overload(id, {
    	html: function(name, node, content) {
    		node.innerHTML = content;
    	},

    	children: function(name, node, content) {
    		content.forEach((child) => { node.appendChild(child); });
    	},

    	default: function(name, node, content) {
    		if (name in node) {
    			node[name] = content;
    		}
    		else {
    			node.setAttribute(name, content);
    		}
    	}
    });

    function assignAttributes(node, attributes) {
    	var names = Object.keys(attributes);
    	var n = names.length;

    	while (n--) {
    		setAttribute(names[n], node, attributes[names[n]]);
    	}
    }

    if (!Element.prototype.prepend) {
        console.warn('A polyfill for Element.prepend() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/prepend)');
    }

    function prepend$2(target, node) {
        target.prepend(node);
        return node;
    }

    /*
    clone(node)`

    Returns a deep copy of `node`.
    */

    features.textareaPlaceholderSet ?

    	function clone(node) {
    		return node.cloneNode(true);
    	} :

    	function cloneWithHTML(node) {
    		// IE sets textarea innerHTML to the placeholder when cloning.
    		// Reset the resulting value.

    		var clone     = node.cloneNode(true);
    		var textareas = query('textarea', node);
    		var n         = textareas.length;
    		var clones;

    		if (n) {
    			clones = query('textarea', clone);

    			while (n--) {
    				clones[n].value = textareas[n].value;
    			}
    		}

    		return clone;
    	} ;

    const svgNamespace = 'http://www.w3.org/2000/svg';
    const testDiv      = document.createElement('div');

    const constructors$1 = {
    	text: function(text) {
    		return document.createTextNode(text || '');
    	},

    	comment: function(text) {
    		return document.createComment(text || '');
    	},

    	fragment: function(html) {
    		var fragment = document.createDocumentFragment();

    		if (html) {
    			testDiv.innerHTML = html;
    			append(fragment, testDiv.childNodes);
    			testDiv.innerHTML = '';
    		}

    		return fragment;
    	}
    };

    var svgs = [
    	'circle',
    	'ellipse',
    	'g',
    	'line',
    	'rect',
    	//'text',
    	'use',
    	'path',
    	'polygon',
    	'polyline',
    	'svg'
    ];

    svgs.forEach(function(tag) {
    	constructors$1[tag] = function(attributes) {
    		var node = document.createElementNS(svgNamespace, tag);
    		if (attributes) { setSVGAttributes(node, attributes); }
    		return node;
    	};
    });

    function setSVGAttributes(node, attributes) {
    	var names = Object.keys(attributes);
    	var n = names.length;

    	while (n--) {
    		node.setAttributeNS(null, names[n], attributes[names[n]]);
    	}
    }

    /*
    create(tag, text)`

    Returns a new DOM node.

    - If `tag` is `"text"` returns a text node with the content `text`.
    - If `tag` is `"fragment"` returns a document fragment.
    - If `tag` is `"comment"` returns a comment `<!-- text -->`.
    - Anything else returns an element `<tag>text</tag>`, where `text` is inserted
      as inner html.
    */

    function create$1(tag, attributes) {
    	// create(type)
    	// create(type, text)
    	// create(type, attributes)

    	let node;

    	if (typeof tag === 'string') {
    		if (constructors$1[tag]) {
    			return constructors$1[tag](attributes);
    		}

    		node = document.createElement(tag);
    	}
    	else {
    		node = document.createElement(tag.tagName);
    		delete tag.tagName;
    		assignAttributes(node, tag);
    	}

    	if (attributes) {
    		if (typeof attributes === 'string') {
    			node.innerHTML = attributes;
    		}
    		else {
    			assignAttributes(node, attributes);
    		}
    	}

    	return node;
    }

    /* DOM Mutation */

    /*
    remove(node)

    Removes `node` from the DOM.
    */

    function remove$2(node) {
    	if (node.remove) {
    		node.remove();
    	}
    	else {
    		console.warn('deprecated: remove() no longer removes lists of nodes.');
    		node.parentNode && node.parentNode.removeChild(node);
    	}

    	return node;
    }

    /*
    before(target, node)

    Inserts `node` before target.
    */

    function before(target, node) {
    	target.parentNode && target.parentNode.insertBefore(node, target);
    	return node;
    }

    /*
    after(target, node)

    Inserts `node` after `target`.
    */

    function after(target, node) {
    	target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
    	return node;
    }

    /*
    replace(target, node)

    Swaps `target` for `node`.
    */

    function replace(target, node) {
    	before(target, node);
    	remove$2(target);
    	return node;
    }

    const classes = get$1('classList');

    /*
    addClass(class, node)
    Adds `'class'` to the classList of `node`.
    */

    function addClass(string, node) {
    	classes(node).add(string);
    }

    /*
    removeClass(class, node)
    Removes `'class'` from the classList of `node`.
    */

    function removeClass(string, node) {
    	classes(node).remove(string);
    }

    function requestFrame(n, fn) {
    	// Requst frames until n is 0, then call fn
    	(function frame(t) {
    		return n-- ?
    			requestAnimationFrame(frame) :
    			fn(t);
    	})();
    }

    function frameClass(string, node) {
    	var list = classes(node);
    	list.add(string);

    	// Chrome (at least) requires 2 frames - I guess in the first, the
    	// change is painted so we have to wait for the second to undo
    	requestFrame(2, () => list.remove(string));
    }

    /*
    box(node)

    Returns a `DOMRect` object describing the draw box of `node`.
    (If `node` is `window` a plain object is returned).
    */

    function windowBox() {
    	return {
    		left:   0,
    		top:    0,
    		right:  window.innerWidth,
    		bottom: window.innerHeight,
    		width:  window.innerWidth,
    		height: window.innerHeight
    	};
    }

    function box(node) {
    	return node === window ?
    		windowBox() :
    		node.getClientRects()[0] ;
    }

    function offset(node1, node2) {
    	var box1 = box(node1);
    	var box2 = box(node2);
    	return [box2.left - box1.left, box2.top - box1.top];
    }

    if (!NodeList.prototype.forEach) {
        console.warn('A polyfill for NodeList.forEach() is needed (https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach)');
    }

    // DOM Fragments and Templates

    function fragmentFromChildren(node) {
    	var fragment = create$1('fragment');

    	while (node.firstChild) {
    		append$3(fragment, node.firstChild);
    	}

    	return fragment;
    }

    const assign$4      = Object.assign;
    const CustomEvent = window.CustomEvent;

    const defaults    = {
    	// The event bubbles (false by default)
    	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
    	bubbles: true,

    	// The event may be cancelled (false by default)
    	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
    	cancelable: true

    	// Trigger listeners outside of a shadow root (false by default)
    	// https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
    	//composed: false
    };

    /*
    Event(type, properties)

    Creates a CustomEvent of type `type`.
    Additionally, `properties` are assigned to the event object.
    */

    function Event$1(type, options) {
    	let settings;

    	if (typeof type === 'object') {
    		settings = assign$4({}, defaults, type);
    		type = settings.type;
    	}

    	if (options && options.detail) {
    		if (settings) {
    			settings.detail = options.detail;
    		}
    		else {
    			settings = assign$4({ detail: options.detail }, defaults);
    		}
    	}

    	var event = new CustomEvent(type, settings || defaults);

    	if (options) {
    		delete options.detail;
    		assign$4(event, options);
    	}

    	return event;
    }

    const assign$5  = Object.assign;
    const rspaces = /\s+/;

    function prefixType(type) {
    	return features.events[type] || type ;
    }


    // Handle event types

    // DOM click events may be simulated on inputs when their labels are
    // clicked. The tell-tale is they have the same timeStamp. Track click
    // timeStamps.
    var clickTimeStamp = 0;

    window.addEventListener('click', function(e) {
    	clickTimeStamp = e.timeStamp;
    });

    function listen(source, type) {
    	if (type === 'click') {
    		source.clickUpdate = function click(e) {
    			// Ignore clicks with the same timeStamp as previous clicks –
    			// they are likely simulated by the browser.
    			if (e.timeStamp <= clickTimeStamp) { return; }
    			source.update(e);
    		};

    		source.node.addEventListener(type, source.clickUpdate, source.options);
    		return source;
    	}

    	source.node.addEventListener(type, source.update, source.options);
    	return source;
    }

    function unlisten(source, type) {
    	source.node.removeEventListener(type, type === 'click' ?
    		source.clickUpdate :
    		source.update
    	);

    	return source;
    }

    /*
    events(type, node)

    Returns a mappable stream of events heard on `node`:

        var stream = events('click', document.body);
        .map(get('target'))
        .each(function(node) {
            // Do something with nodes
        });

    Stopping the stream removes the event listeners:

        stream.stop();
    */

    function Source(notify, stop, type, options, node) {
    	const types  = type.split(rspaces).map(prefixType);
    	const buffer = [];

    	function update(value) {
    		buffer.push(value);
    		notify();
    	}

    	this._stop   = stop;
    	this.types   = types;
    	this.node    = node;
    	this.buffer  = buffer;
    	this.update  = update;
    	this.options = options;

    	// Potential hard-to-find error here if type has repeats, ie 'click click'.
    	// Lets assume nobody is dumb enough to do this, I dont want to have to
    	// check for that every time.
    	types.reduce(listen, this);
    }

    assign$5(Source.prototype, {
    	shift: function shiftEvent() {
    		const buffer = this.buffer;
    		return buffer.shift();
    	},

    	stop: function stopEvent() {
    		this.types.reduce(unlisten, this);
    		this._stop(this.buffer.length);
    	}
    });

    function events(type, node) {
    	let options;

    	if (typeof type === 'object') {
    		options = type;
    		type    = options.type;
    	}

    	return new Stream$1(function(notify, stop) {
    		return new Source(notify, stop, type, options, node)
    	});
    }


    // -----------------

    const A$7 = Array.prototype;
    const eventsSymbol = Symbol('events');

    function applyTail(fn, args) {
    	return function() {
    		A$7.push.apply(arguments, args);
    		fn.apply(null, arguments);
    	};
    }

    function on(node, type, fn) {
    	var options;

    	if (typeof type === 'object') {
    		options = type;
    		type    = options.type;
    	}

    	var types   = type.split(rspaces);
    	var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
    	var handler = arguments.length > 3 ? applyTail(fn, A$7.slice.call(arguments, 3)) : fn ;
    	var handlers, listener;
    	var n = -1;

    	while (++n < types.length) {
    		type = types[n];
    		handlers = events[type] || (events[type] = []);
    		listener = type === 'click' ?
    			function(e) {
    				// Ignore clicks with the same timeStamp as previous clicks –
    				// they are likely simulated by the browser on inputs when
    				// their labels are clicked
    				if (e.timeStamp <= clickTimeStamp) { return; }
    				handler(e);
    			} :
    			handler ;
    		handlers.push([fn, listener]);
    		node.addEventListener(type, listener, options);
    	}

    	return node;
    }

    function once(node, types, fn, data) {
    	on(node, types, function once() {
    		off(node, types, once);
    		fn.apply(null, arguments);
    	}, data);
    }

    function off(node, type, fn) {
    	var options;

    	if (typeof type === 'object') {
    		options = type;
    		type    = options.type;
    	}

    	var types   = type.split(rspaces);
    	var events  = node[eventsSymbol];
    	var handlers, i;

    	if (!events) { return node; }

    	var n = -1;
    	while (n++ < types.length) {
    		type = types[n];
    		handlers = events[type];
    		if (!handlers) { continue; }
    		i = handlers.length;
    		while (i--) {
    			if (handlers[i][0] === fn) {
    				node.removeEventListener(type, handlers[i][1]);
    				handlers.splice(i, 1);
    			}
    		}
    	}

    	return node;
    }

    /*
    trigger(type, node)

    Triggers event of `type` on `node`.

    ```
    trigger('dom-activate', node);
    ```
    */

    function trigger(node, type, properties) {
    	// Don't cache events. It prevents you from triggering an event of a
    	// given type from inside the handler of another event of that type.
    	var event = Event$1(type, properties);
    	node.dispatchEvent(event);
    }

    // trigger('type', node)

    function trigger$1(type, node) {
        let properties;

        if (typeof type === 'object') {
            properties = type;
            type = properties.type;
        }

        // Don't cache events. It prevents you from triggering an event of a
    	// given type from inside the handler of another event of that type.
    	var event = Event$1(type, properties);
    	node.dispatchEvent(event);
        return node;
    }

    function delegate(selector, fn) {
    	// Create an event handler that looks up the ancestor tree
    	// to find selector.
    	return function handler(e) {
    		var node = closest(selector, e.target, e.currentTarget);
    		if (!node) { return; }
    		e.delegateTarget = node;
    		fn(e, node);
    		e.delegateTarget = undefined;
    	};
    }

    const keyStrings = {
    	8:  'backspace',
    	9:  'tab',
    	13: 'enter',
    	16: 'shift',
    	17: 'ctrl',
    	18: 'alt',
    	27: 'escape',
    	32: 'space',
    	33: 'pageup',
    	34: 'pagedown',
    	35: 'pageright',
    	36: 'pageleft',
    	37: 'left',
    	38: 'up',
    	39: 'right',
    	40: 'down',
    	46: 'delete',
    	48: '0',
    	49: '1',
    	50: '2',
    	51: '3',
    	52: '4',
    	53: '5',
    	54: '6',
    	55: '7',
    	56: '8',
    	57: '9',
    	65: 'a',
    	66: 'b',
    	67: 'c',
    	68: 'd',
    	69: 'e',
    	70: 'f',
    	71: 'g',
    	72: 'h',
    	73: 'i',
    	74: 'j',
    	75: 'k',
    	76: 'l',
    	77: 'm',
    	78: 'n',
    	79: 'o',
    	80: 'p',
    	81: 'q',
    	82: 'r',
    	83: 's',
    	84: 't',
    	85: 'u',
    	86: 'v',
    	87: 'w',
    	88: 'x',
    	89: 'y',
    	90: 'z',
    	// Mac Chrome left CMD
    	91: 'cmd',
    	// Mac Chrome right CMD
    	93: 'cmd',
    	186: ';',
    	187: '=',
    	188: ',',
    	189: '-',
    	190: '.',
    	191: '/',
    	219: '[',
    	220: '\\',
    	221: ']',
    	222: '\'',
    	// Mac FF
    	224: 'cmd'
    };

    const keyCodes = Object.entries(keyStrings).reduce(function(object, entry) {
    	object[entry[1]] = parseInt(entry[0], 10);
    	return object;
    }, {});

    /*
    transition(duration, fn)

    Calls `fn` on each animation frame until `duration` seconds has elapsed. `fn`
    is passed a single argument `progress`, a number that ramps from `0` to `1` over
    the duration of the transition. Returns a function that cancels the transition.

    ```
    transition(3, function(progress) {
        // Called every frame for 3 seconds
    });
    ```
    */

    const performance           = window.performance;
    const requestAnimationFrame$1 = window.requestAnimationFrame;
    const cancelAnimationFrame$1  = window.cancelAnimationFrame;

    function transition(duration, fn) {
    	var t0 = performance.now();

    	function frame(t1) {
    		// Progress from 0-1
    		var progress = (t1 - t0) / (duration * 1000);

    		if (progress < 1) {
    			if (progress > 0) {
    				fn(progress);
    			}
    			id = requestAnimationFrame$1(frame);
    		}
    		else {
    			fn(1);
    		}
    	}

    	var id = requestAnimationFrame$1(frame);

    	return function cancel() {
    		cancelAnimationFrame$1(id);
    	};
    }

    function animate(duration, transform, name, object, value) {
    	// denormaliseLinear is not curried! Wrap it.
        const startValue = object[name];
    	return transition(
    		duration,
    		pipe(transform, (v) => linear$1(startValue, value, v), set$1(name, object))
    	);
    }

    const define$2 = Object.defineProperties;

    define$2({
        left: 0
    }, {
        right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
        top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
        bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
    });

    const assign$6 = Object.assign;

    /*
    config

    ```{
    	headers:    fn(data),    // Must return an object with properties to add to the header
    	body:       fn(data),    // Must return an object to send as data
    	onresponse: function(response)
    }```
    */

    const config = {
        // Takes data, returns headers
    	headers: function(data) { return {}; },

    	// Takes data (can be FormData object or plain object), returns data
    	body: id,

    	// Takes response, returns response
    	onresponse: function(response) {
    		// If redirected, navigate the browser away from here. Can get
    		// annoying when receiving 404s, maybe not a good default...
    		if (response.redirected) {
    			window.location = response.url;
    			return;
    		}

    		return response;
    	}
    };

    const createHeaders = choose({
    	'application/x-www-form-urlencoded': function(headers) {
    		return assign$6(headers, {
    			"Content-Type": 'application/x-www-form-urlencoded',
    			"X-Requested-With": "XMLHttpRequest"
    		});
    	},

    	'application/json': function(headers) {
    		return assign$6(headers, {
    			"Content-Type": "application/json; charset=utf-8",
    			"X-Requested-With": "XMLHttpRequest"
    		});
    	},

    	'multipart/form-data': function(headers) {
    		return assign$6(headers, {
    			"Content-Type": 'multipart/form-data',
    			"X-Requested-With": "XMLHttpRequest"
    		});
    	},

    	'audio/wav': function(headers) {
    		return assign$6(headers, {
    			"Content-Type": 'audio/wav',
    			"X-Requested-With": "XMLHttpRequest"
    		});
    	},

    	'default': function(headers) {
    		return assign$6(headers, {
    			"Content-Type": 'application/x-www-form-urlencoded',
    			"X-Requested-With": "XMLHttpRequest"
    		});
    	}
    });

    const createBody = choose({
    	'application/json': function(data) {
    		return data.get ?
    			formDataToJSON(data) :
    			JSON.stringify(data);
    	},

    	'application/x-www-form-urlencoded': function(data) {
    		return data.get ?
    			formDataToQuery(data) :
    			dataToQuery(data) ;
    	},

    	'multipart/form-data': function(data) {
    		// Mmmmmhmmm?
    		return data.get ?
                data :
                dataToFormData() ;
    	}
    });

    const responders = {
    	'text/html':           respondText,
    	'application/json':    respondJSON,
    	'multipart/form-data': respondForm,
    	'application/x-www-form-urlencoded': respondForm,
    	'audio':               respondBlob,
    	'audio/wav':           respondBlob,
    	'audio/m4a':           respondBlob
    };

    function formDataToJSON(formData) {
    	return JSON.stringify(
    		// formData.entries() is an iterator, not an array
    		Array
    		.from(formData.entries())
    		.reduce(function(output, entry) {
    			output[entry[0]] = entry[1];
    			return output;
    		}, {})
    	);
    }

    function formDataToQuery(data) {
    	return new URLSearchParams(data).toString();
    }

    function dataToQuery(data) {
    	return Object.keys(data).reduce((params, key) => {
    		params.append(key, data[key]);
    		return params;
    	}, new URLSearchParams());
    }

    function dataToFormData(data) {
        throw new Error('TODO: dataToFormData(data)');
    }

    function urlFromData(url, data) {
    	// Form data
    	return data instanceof FormData ?
    		url + '?' + formDataToQuery(data) :
    		url + '?' + dataToQuery(data) ;
    }

    function createOptions(method, mimetype, data, controller) {
    	return method === 'GET' ? {
    		method:  method,
    		headers: createHeaders(mimetype, config.headers ? config.headers(data) : {}),
    		credentials: 'same-origin',
    		signal: controller && controller.signal
    	} : {
    		method:  method,
    		// Process headers before body, allowing us to read a CSRFToken,
            // which may be in data, in createHeaders() before removing it
            // from data in body().
    		headers: createHeaders(mimetype, config.headers ? config.headers(data) : {}),
    		body:    createBody(mimetype, config.body ? config.body(data) : data),
    		credentials: 'same-origin',
    		signal: controller && controller.signal
    	} ;
    }

    function respondBlob(response) {
    	return response.blob();
    }

    function respondJSON(response) {
    	return response.json();
    }

    function respondForm(response) {
    	return response.formData();
    }

    function respondText(response) {
    	return response.text();
    }

    function respond(response) {
    	if (config.onresponse) {
    		response = config.onresponse(response);
    	}

    	if (!response.ok) {
    		throw new Error(response.statusText + '');
    	}

    	// Get mimetype from Content-Type, remembering to hoik off any
    	// parameters first
    	const mimetype = response.headers
    		.get('Content-Type')
    		.replace(/\;.*$/, '');

    	return responders[mimetype](response);
    }


    /*
    request(type, mimetype, url, data)
    */

    function request(type = 'GET', mimetype = 'application/json', url, data) {
    	const method = type.toUpperCase();

    	// If this is a GET and there is data, append data to the URL query string
    	if (method === 'GET' && data) {
    		url = urlFromData(url, data);
    	}

    	// param[4] is an optional abort controller
    	return fetch(url, createOptions(method, mimetype, data, arguments[4]))
    	.then(respond);
    }

    /*
    requestGet(url)
    A shortcut for `request('get', 'application/json', url)`
    */

    function requestGet(url) {
    	return request('GET', 'application/json', url, {});
    }

    if (window.console && window.console.log) {
        window.console.log('%cdom%c         – https://github.com/stephband/dom', 'color: #3a8ab0; font-weight: 600;', 'color: inherit; font-weight: 400;');
    }
    const parse$3 = curry$1(parse$2, true);
    const contains$3 = curry$1(contains$2, true);
    const attribute$1 = curry$1(attribute, true);
    const find$3 = curry$1(find$2, true);
    const closest$1 = curry$1(closest, true);
    const matches$3 = curry$1(matches$2, true);
    const query$1 = curry$1(query, true);
    const assign$7  = curry$1(assignAttributes, true);
    const append$4  = curry$1(append$3, true);
    const prepend$3 = curry$1(prepend$2, true);
    const before$1  = curry$1(before, true);
    const after$1   = curry$1(after, true);
    const replace$1 = curry$1(replace, true);
    const addClass$1    = curry$1(addClass, true);
    const removeClass$1 = curry$1(removeClass, true);
    const frameClass$1  = curry$1(frameClass, true);
    const offset$1 = curry$1(offset, true);
    const style$1 = curry$1(style, true);
    const events$1 = curry$1(events, true);

    // Legacy uncurried functions

    Object.assign(events$1, {
        on:      on,
        once:    once,
        off:     off,
        trigger: trigger
    });

    const on$1 = curry$1(function(type, fn, node) {
        on(node, type, fn);
        return node;
    }, true);

    const off$1 = curry$1(function(type, fn, node) {
        off(node, type, fn);
        return node;
    }, true);
    const trigger$2 = curry$1(trigger$1, true);
    const delegate$1 = curry$1(delegate, true);
    const animate$1 = curry$1(animate, true);
    const transition$1 = curry$1(transition, true);
    const request$1 = curry$1(request, true, 4);

    // Debug mode on by default
    const DEBUG$3 = window.DEBUG === undefined || window.DEBUG;

    // Render queue
    const maxFrameDuration = 0.015;

    const queue = new Set();

    const addons = [];

    var renderCount = 0;

    var frame;


    /* Console logging */

    function tokenOrLabel(token) {
    	return typeof token === 'string' ? token : token.label;
    }

    function tabulateRenderer(renderer) {
    	return {
    		'label':  renderer.label,
    		'source': renderer.tokens ?
    			renderer.tokens
    			.filter((token) => token.label !== 'Listener')
    			.map(tokenOrLabel)
    			.join('') :
    			renderer.path,
    		'rendered': renderer.renderedValue,
    		'DOM mutations (accumulative)': renderer.renderCount
    	};
    }

    function filterListener(renderer) {
    	return renderer.constructor.name !== 'Listener';
    }

    function logRenders(tStart, tStop) {
    	if (DEBUG$3) {
    		console.table(
    			Array.from(queue)
    			.concat(addons)
    			.filter(filterListener)
    			.map(tabulateRenderer)
    		);

    		console.log('%c' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
    		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
    		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
    		+ (tStop - tStart).toFixed(3) + 's', 'color: #6894ab; font-weight: 300;', '');

    		console.groupEnd();
    	}

    	if ((tStop - tStart) > maxFrameDuration) {
    		console.log('%c  ' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
    		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
    		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
    		+ (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 300;', '');
    	}
    }


    /* The meat and potatoes */

    function fireEach(queue) {
    	var count, renderer;

    	for (renderer of queue) {
    		if (DEBUG$3) {
    			count = renderer.renderCount;

    			if (typeof count !== 'number') {
    				console.log('OIOIO', renderer);
    			}
    		}

    		renderer.fire();

    		if (DEBUG$3) {
    			renderCount += (renderer.renderCount - count);
    		}
    	}
    }

    function run(time) {
    	if (DEBUG$3) {
    		window.console.groupCollapsed('%cSparky %c ' + (window.performance.now() / 1000).toFixed(3) + ' frame ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
    	}

    	renderCount = 0;
    	addons.length = 0;

    	const tStart = now$1();
    	frame = true;
    	fireEach(queue);
    	frame = undefined;
    	const tStop  = now$1();

        // Closes console group, logs warning for frame overrun even
        // when not in DEBUG mode
        logRenders(tStart, tStop);
    	queue.clear();
    }

    function cue(renderer) {
    	var count;

    	// Run functions cued during frame synchronously to preserve
    	// inner-DOM-first order of execution during setup
    	if (frame === true) {
    		if (DEBUG$3) {
    			if (typeof renderer.renderCount !== 'number') {
    				console.warn('Sparky renderer has no property renderCount', renderer);
    			}

    			count = renderer.renderCount;
    		}

    		renderer.fire();

    		if (DEBUG$3) {
    			addons.push(renderer);
    			renderCount += (renderer.renderCount - count);
    		}

    		return;
    	}

    	// Don't recue cued renderers. This shouldn't happen much.
    	if (queue.has(renderer)) { return; }

    	queue.add(renderer);

    	if (frame === undefined) {
    		frame = requestAnimationFrame(run);
    	}
    }

    function uncue(renderer) {
    	queue.delete(renderer);

    	if (frame !== undefined && frame !== true && queue.size === 0) {
    		//if (DEBUG) { console.log('(cancel master frame)'); }
    		cancelAnimationFrame(frame);
    		frame = undefined;
    	}
    }

    function log$2(text) {
        window.console.log('%cSparky%c ' + text,
            'color: #858720; font-weight: 600;',
            'color: #6894ab; font-weight: 400;'
        );
    }

    function logNode(target, attrFn, attrInclude) {
        const attrIs = target.getAttribute('is') || '';
        window.console.log('%cSparky%c'
            + ' ' + (window.performance.now() / 1000).toFixed(3)
            + ' <'
            + (target.tagName.toLowerCase())
            + (attrIs ? ' is="' + attrIs + '"' : '')
            + (attrFn ? ' fn="' + attrFn + '"' : '')
            + (attrInclude ? ' include="' + attrInclude + '"' : '')
            + '>',
            'color: #858720; font-weight: 600;',
            'color: #6894ab; font-weight: 400;'
        );
    }

    function nodeToString(node) {
        return '<' +
        node.tagName.toLowerCase() +
        (['fn', 'class', 'id', 'include'].reduce((string, name) => {
            const attr = node.getAttribute(name);
            return attr ? string + ' ' + name + '="' + attr + '"' : string ;
        }, '')) +
        '/>';
    }

    const requestDocument = cache(function requestDocument(path) {
        return request$1('GET', 'text/html', path, null)
        .then(parse$3('html'));
    });

    let scriptCount = 0;

    function importDependencies(path, doc) {
        const dir = path.replace(/[^\/]+$/, '');

        // Import templates and styles

        // Is there a way to do this without importing them into the current document?
        // Is that even wise?
        // Is that just unecessary complexity?
        doc.querySelectorAll('style, template').forEach(function(node) {
            if (!node.title) { node.title = dir; }
            document.head.appendChild(document.adoptNode(node));
        });

        // Import CSS links
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(node) {
            if (!node.title) { node.title = dir; }
            const href = node.getAttribute('href');

            // Detect local href. Todo: very crude. Improve.
            if (/^[^\/]/.test(href)) {
                // Get rid of leading './'
                const localHref = href.replace(/^\.\//, '');
                node.setAttribute('href', dir + localHref);
            }

            document.head.appendChild(document.adoptNode(node));
        });

        // Wait for scripts to execute
        const promise = Promise.all(
            query$1('script', doc).map(toScriptPromise)
        )
        .then(() => doc);

        return DEBUG ? promise.then((object) => {
            console.log('%cSparky %cinclude', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', path);
            return object;
        }) :
        promise ;
    }

    function toScriptPromise(node) {
        return new Promise(function(resolve, reject) {
            window['sparkyScriptImport' + (++scriptCount)] = resolve;

            // This method doesnt seem to run the script
            // document.head.appendChild(document.adoptNode(node));
            // Try this instead...
            const script = document.createElement('script');
            script.type = 'module';
            script.title = node.title || node.baseURL;

            // Detect script has parsed and executed
            script.textContent = node.textContent + ';window.sparkyScriptImport' + scriptCount + '();';
            document.head.appendChild(script);
        });
    }

    function importTemplate(src) {
        const parts = src.split('#');
        const path  = parts[0] || '';
        const id    = parts[1] || '';

        return path ?
            id ?
                requestDocument(path)
                .then((doc) => importDependencies(path, doc))
                .then((doc) => document.getElementById(id))
                .then((template) => {
                    if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
                    return template;
                }) :

            requestDocument(path)
            .then((doc) => document.adoptNode(doc.body)) :

        id ?
            // If path is blank we are looking in the current document, so there
            // must be a template id (we can't import the document into itself!)
            Promise
            .resolve(document.getElementById(id))
            .then((template) => {
                if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
                return template;
            }) :

        // If no path and no id
        Promise.reject(new Error('Sparky template "' + src + '" not found. URL must have a path or a hash ref')) ;
    }

    // Matches the arguments list in the result of fn.toString()
    const rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

    var toText = overload(toType, {
    	'boolean': function(value) {
    		return value + '';
    	},

    	'function': function(value) {
    		// Print function and parameters
    		return (value.name || 'function')
    			+ (rarguments.exec(value.toString()) || [])[1];
    	},

    	'number': function(value) {
    		// Convert NaN to empty string and Infinity to ∞ symbol
    		return Number.isNaN(value) ? '' :
    			Number.isFinite(value) ? value + '' :
    			value < 0 ? '-∞' : '∞';
    	},

    	'string': id,

    	'symbol': function(value) {
    		return value.toString();
    	},

    	'undefined': function() {
    		return '';
    	},

    	'object': function(value) {
    		// Don't render null
    		return value ? JSON.stringify(value) : '';
    	},

    	'default': JSON.stringify
    });

    const assign$8 = Object.assign;

    function Value(path) {
        this.path = path;
    }

    function isValue$1(object) {
        return Value.prototype.isPrototypeOf(object);
    }

    assign$8(Value.prototype, {
        valueOf: function valueOf() {
            return this.transform ?
                this.value === undefined ?
                    undefined :
                this.transform(this.value) :
            this.value ;
        },

        toString: function toString() {
            return toText(this.valueOf());
        },
    });

    const parseArrayClose = capture$1(/^\]\s*/, nothing);

    /*
    parseParams(array, string)
    */

    //                                        number                                     "string"            'string'                    null   true   false  array function(args)  dot  string           comma
    const parseParams = capture$1(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|(\.)?([\w.\-#/?:\\]+))\s*(,)?\s*/, {
        // number
        1: function(params, tokens) {
            params.push(parseFloat(tokens[1]));
            return params;
        },

        // "string"
        2: function(params, tokens) {
            params.push(tokens[2]);
            return params;
        },

        // 'string'
        3: function(params, tokens) {
            params.push(tokens[3]);
            return params;
        },

        // null
        4: function(params) {
            params.push(null);
            return params;
        },

        // true
        5: function(params) {
            params.push(true);
            return params;
        },

        // false
        6: function(params) {
            params.push(false);
            return params;
        },

        // array
        7: function(params, tokens) {
            if (tokens.input[1] === ']') {
                params.push([]);
            }
            else {
                params.push(parseParams([], tokens));
            }

            parseArrayClose(null, tokens);
            return params;
        },

        // Todo: review syntax for nested functions
        // function(args)
        //8: function(params, value, result) {
        //    // Todo: recurse to parseFn for parsing inner functions
        //    value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
        //    params.push(value);
        //    return params;
        //},

        // string
        11: function(params, tokens) {
            if (tokens[10]) {
                params.push(new Value(tokens[11]));
            }
            else {
                params.push(tokens[11]);
            }
            return params;
        },

        // Comma terminator - more params to come
        12: function(params, tokens) {
            return parseParams(params, tokens);
        },

        catch: function(params, string) {
            // string is either the input string or a tokens object
            // from a higher level of parsing
            throw new SyntaxError('Invalid parameter "' + (string.input || string) + '"');
        }
    });

    /*
    parsePipe(array, string)
    */

    const parsePipe = capture$1(/^\s*([\w-]+)\s*(:)?\s*/, {
        // Function name '...'
        1: function(fns, tokens) {
            fns.push({
                name: tokens[1],
                args: nothing
            });

            return fns;
        },

        // Params ':'
        2: function(fns, tokens) {
            fns[fns.length - 1].args = parseParams([], tokens);
            return fns;
        },

        close: capture$1(/^\s*(\|)?\s*/, {
            // More pipe '|'
            1: function(fns, tokens) {
                return parsePipe(fns, tokens);
            }
        }),

        catch: function(fns, string) {
            // string is either the input string or a tokens object
            // from a higher level of parsing
            console.log(string.input, string);
            throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
        }
    });

    /*
    parseTag(string)
    */

    const parseTag = capture$1(/^\s*([\w.-]*)\s*(\|)?\s*/, {
        // Object path 'xxxx.xxx.xx-xxx'
        1: (nothing, tokens) => new Value(tokens[1]),

        // Pipe '|'
        2: function(tag, tokens) {
            tag.pipe = parsePipe([], tokens);
            return tag;
        },

        // Tag close ']}'
        close: function(tag, tokens) {
            if (!exec$2(/^\s*\]\}/, id, tokens)) {
                throw new SyntaxError('Unclosed tag in "' + tokens.input + '"');
            }

            return tag;
        },

        // Where nothing is found, don't complain
        catch: id
    }, undefined);

    /*
    parseToken(string)
    */

    const parseToken = capture$1(/^\s*(\{\[)/, {
        // Tag opener '{['
        1: function(unused, tokens) {
            const tag = parseTag(tokens);
            tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
            return tag;
        },

        close: function(tag, tokens) {
            // Only spaces allowed til end
            if (!exec$2(/^\s*$/, id, tokens)) {
                throw new SyntaxError('Invalid characters after token (only spaces valid) "' + tokens.input + '"');
            }

            return tag;
        },

        // Where nothing is found, don't complain
        catch: id
    }, undefined);

    /*
    parseBoolean(array, string)
    */

    const parseBoolean = capture$1(/^\s*(?:(\{\[)|$)/, {
        // Tag opener '{['
        1: function(array, tokens) {
            const tag = parseTag(tokens);
            tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
            array.push(tag);
            return parseBoolean(array, tokens);
        },

        // Where nothing is found, don't complain
        catch: id
    });

    /*
    parseText(array, string)
    */

    const parseText = capture$1(/^([\S\s]*?)(?:(\{\[)|$)/, {
        // String of text, whitespace and newlines included
        1: (array, tokens) => {
            // If no tags have been found return undefined
            if (!array.length && !tokens[2]) {
                return;
            }

            // If it is not empty, push in leading text
            if (tokens[1]) {
                array.push(tokens[1]);
            }

            return array;
        },

        // Tag opener '{['
        2: (array, tokens) => {
            const tag = parseTag(tokens);
            tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
            array.push(tag);
            return parseText(array, tokens);
        },

        // Where nothing is found, don't complain
        catch: noop
    });

    var config$1 = {
    	attributeFn:      'fn',
    	attributeInclude: 'include',
    	attributePrefix:  ':'
    };

    /*
    fn="name:params"

    A `fn` attribute declares one or more functions to run on a template.
    A **function** is expected to supply an object that Sparky uses to
    render template **tags**:

    ```html
    <template is="sparky-template" fn="fetch:package.json">
        I am {[title]}.
    </template>
    ```

    ```html
    I am Sparky.
    ```

    The `fn` attribute may be declared on any element in a sparky template.
    Here we use the built-in functions `fetch`, `get` and `each` to loop over an
    array of keywords and generate a list:

    ```html
    <template is="sparky-template" fn="fetch:package.json">
        <ul>
            <li fn="get:keywords each">{[.]}</li>
        </ul>
    </template>
    ```

    ```html
    <ul>
        <li>javascript</li>
        <li>browser</li>
    </ul>
    ```
    */

    /*
    Functions
    */

    /*
    Register

    Sparky 'functions' are view-controllers with access to the node where they are
    declared and control over the flow of objects being sent to the renderer. They
    are registered and accessed by a string identifier.

    ```
    import { register } from './sparky/module.js';

    register('my-function', function(node, params) {
        // `this` is a stream of scope objects
        return this.map(function(scope) {
            // Map scope...
        });
    });
    ```

    Functions are called before a node is mounted. They receive a stream of scopes
    and the DOM node, and may return the same stream, or a new stream, or they may
    block mounting and rendering altogether. Types of return value are interpreted
    as follows:

    - `Promise` - automatically converted to a stream
    - `Stream` - a stream of scopes
    - `undefined` - equivalent to returning the input stream
    - `false` - cancels the mount process

    The stream returned by the last function declared in the `fn` attribute is
    piped to the renderer. Values in that stream are rendered, and the life
    of the renderer is controlled by the state of that stream. Sparky's streams
    come from <a href="https://stephen.band/fn/#stream">stephen.band/fn/#stream</a>.
    */

    /*
    Examples

    Push a single scope object to the renderer:

    ```
    import { register, Stream } from './sparky/module.js';

    register('my-scope', function(node, params) {
        // Return a stream of one object
        return Stream.of({
            text: 'Hello, Sparky!'
        });
    });
    ```

    Return a promise to push a scope when it is ready:

    ```
    register('my-package', function(node, params) {
        // Return a promise
        return fetch('package.json')
        .then((response) => response.json());
    });
    ```

    Push a new scope object to the renderer every second:

    ```
    register('my-clock', function(node, params) {
        const output = Stream.of();

        // Push a new scope to the renderer once per second
        const timer = setInterval(() => {
            output.push({
                time: window.performance.now()
            });
        }, 1000);

        // Listen to the input stream, stop the interval
        // timer when it is stopped
        this.done(() => clearInterval(timer));

        // Return the stream
        return output;
    });
    ```
    */


    const DEBUG$4 = window.DEBUG;

    const functions = Object.create(null);

    function register(name, fn) {
        if (/^(?:function\s*)?\(node/.exec(fn.toString())) ;

        if (DEBUG$4 && functions[name]) {
            throw new Error('Sparky: fn already registered with name "' + name + '"');
        }

        functions[name] = fn;
    }

    // Helper functions

    const toFloat = parseFloat;
    var A$8         = Array.prototype;
    var S$1         = String.prototype;

    const reducers = {
    	sum: sum
    };

    function interpolateLinear(xs, ys, x) {
    	var n = -1;
    	while (++n < xs.length && xs[n] < x);

    	// Shortcut if x is lower than smallest x
    	if (n === 0) {
    		return ys[0];
    	}

    	// Shortcut if x is greater than biggest x
    	if (n >= xs.length) {
    		return last(ys);
    	}

    	// Shortcurt if x corresponds exactly to an interpolation coordinate
    	if (x === xs[n]) {
    		return ys[n];
    	}

    	// Linear interpolate
    	var ratio = (x - xs[n - 1]) / (xs[n] - xs[n - 1]) ;
    	return ratio * (ys[n] - ys[n - 1]) + ys[n - 1] ;
    }

    const transformers = {

    	/* add: n
    	Adds `n` to value. */
    	add:         {
    		tx: function(a, b) { return b.add ? b.add(a) : b + a ; },
    		ix: function(a, c) { return c.add ? c.add(-a) : c - a ; }
    	},

    	/* add-date: yyyy-mm-dd
    	Adds ISO formatted `yyyy-mm-dd` to a date value, returning a new date. */
    	'add-date':  { tx: addDate,     ix: function(d, n) { return addDate('-' + d, n); } },

    	/* add-time: 'hh:mm:ss'
    	Adds an ISO time in the form `'hh:mm:ss'` to a time value. (Note this
    	string must be quoted because it contains ':' characters.) */
    	'add-time':  { tx: addTime,     ix: subTime },

    	/* to-db:
    	Converts value to dB scale. */
    	'to-db':     { tx: todB,        ix: toLevel },

    	/* to-precision: n
    	Converts number to string representing number to precision `n`. */
    	'to-precision': {
    		tx: function(n, value) {
    			return Number.isFinite(value) ?
    				value.toPrecision(n) :
    				value ;
    		},

    		ix: parseFloat
    	},

    	join: {
    		tx: function(string, value) {
    			return A$8.join.call(value, string);
    		},

    		ix: function(string, value) {
    			return S$1.split.call(value, string);
    		}
    	},

    	'numbers-string': {
    		tx: function(string, value) {
    			return A$8.join.call(value, string);
    		},

    		ix: function(string, value) {
    			return S$1.split.call(value, string).map(parseFloat);
    		}
    	},

    	multiply:    { tx: multiply,    ix: function(d, n) { return n / d; } },
    	degrees:     { tx: toDeg,       ix: toRad },
    	radians:     { tx: toRad,       ix: toDeg },
    	pow:         { tx: pow,         ix: function(n) { return pow(1/n); } },
    	exp:         { tx: exp,         ix: log },
    	log:         { tx: log,         ix: exp },
    	int:         { tx: function(value) { return toFixed(0, value); }, ix: parseInteger },
    	float:       { tx: toFloat,     ix: toString },
    	boolean:     { tx: Boolean,     ix: toString },

        'boolean-string': { tx: toString, ix: function(value) {
            return value === 'true' ? true :
                value === 'false' ? false :
                undefined ;
        }},

    	/* normalise: curve, min, max
    	Return a value in the nominal range `0-1` from a value between `min` and
    	`max` mapped to a `curve`, which is one of `linear`, `quadratic`, `exponential`. */
    	normalise:   {
    		tx: function(curve, min, max, number) {
    			const name = toCamelCase(curve);
    			return normalise[name](min, max, number);
    		},

    		ix: function(curve, min, max, number) {
    			const name = toCamelCase(curve);
    			return denormalise[name](min, max, number);
    		}
    	},

    	/* denormalise: curve, min, max
    	Return a value in the range `min`-`max` of a value in the range `0`-`1`,
    	reverse mapped to `curve`, which is one of `linear`, `quadratic`, `exponential`. */
    	denormalise:   {
    		tx: function(curve, min, max, number) {
    			const name = toCamelCase(curve);
    			return denormalise[name](min, max, number);
    		},

    		ix: function(curve, min, max, number) {
    			const name = toCamelCase(curve);
    			return normalise[name](min, max, number);
    		}
    	},

    	/* floatformat: n
    	Returns a number fixed to `n` decimal places from value. */
    	floatformat: { tx: toFixed,     ix: function(n, str) { return parseFloat(str); } },

    	/* float-string:
    	Converts float values to strings. */
    	'float-string': { tx: (value) => value + '', ix: parseFloat },

    	/* int-string:
    	Converts int values to strings. */
    	'int-string':   { tx: (value) => value.toFixed(0), ix: parseInteger },

    	interpolate: {
    		tx: function(point) {
    			var xs = A$8.map.call(arguments, get('0'));
    			var ys = A$8.map.call(arguments, get('1'));

    			return function(value) {
    				return interpolateLinear(xs, ys, value);
    			};
    		},

    		ix: function(point) {
    			var xs = A$8.map.call(arguments, get('0'));
    			var ys = A$8.map.call(arguments, get('1'));

    			return function(value) {
    				return interpolateLinear(ys, xs, value);
    			}
    		}
    	},

    	cartesian: { tx: toCartesian, ix: toPolar },
    	polar:     { tx: toPolar, ix: toCartesian },
    	deg:       { tx: toDeg, ix: toRad },
    	rad:       { tx: toRad, ix: toDeg },
    	level:     { tx: toLevel, ix: todB },
    	px:        { tx: toPx,  ix: toRem },
    	rem:       { tx: toRem, ix: toPx },
    	vw:        { tx: toVw,  ix: toPx },
    	vh:        { tx: toVh,  ix: toPx },
        not:       { tx: not,   ix: not }
    };

    const transforms = {

    	contains:     contains,
    	equals:       equals,
    	escape:       escape,
    	exp:          exp,

    	/* formatdate: format
    	Converts a date object, ISO date string or UNIX time number (in seconds) to
    	string in `format`.
    	*/
    	formatdate:   formatDate,

    	/* formattime: format
    	Converts ISO time string, a number (in seconds) or the UTC time values of
    	a date object to a string formatted to `format`.
    	*/
    	formattime:   formatTime,

    	formatfloat:  toFixed,
    	get:          getPath,
    	invoke:       invoke,

    	/* is:a
    	Returns `true` where value is strictly equal to `a`, otherwise `false`. */
    	is:           is,

    	/* has: property
    	Returns `true` where value is an object with the property `name`, otherwise `false`. */
    	has: function(name, object) {
    		return object && (name in object);
    	},

    	last:         last,
    	limit:        limit,
    	log:          log,
    	max:          max,
    	min:          min,
    	mod:          mod,

    	// Strings

    	/* append:string
    	Returns value + `string`. */
    	append:       append$1,

    	/* prepend:string
    	Returns `string` + value. */
    	prepend:      prepend,
    	prepad:       prepad,
    	postpad:      postpad,

    	/* slugify:
    	Returns the slug of value. */
    	slugify:      slugify,

    	/* root:n
    	Returns the `n`th root of value. */
    	root:         root,

    	/* type:
    	Returns the `typeof` value. */
    	type:         toType,

    	divide: function(n, value) {
    		if (typeof value !== 'number') { return; }
    		return value / n;
    	},

    	'find-in': function(path, id) {
    		if (!isDefined(id)) { return; }
    		var array = getPath(path, window);
    		return array && array.find(compose(is(id), get('id')));
    	},

    	/* floor:
    	Floors a numeric value. */
    	floor: Math.floor,

    	"greater-than": function(value2, value1) {
    		return value1 > value2;
    	},

    	invert: function(value) {
    		return typeof value === 'number' ? 1 / value : !value ;
    	},

    	json: JSON.stringify,

    	"less-than": function(value2, value1) {
    		return value1 < value2 ;
    	},

    	/* localise:n
    	Localises a number to `n` digits. */
    	localise: function(digits, value) {
    		var locale = document.documentElement.lang;
    		var options = {};

    		if (isDefined(digits)) {
    			options.minimumFractionDigits = digits;
    			options.maximumFractionDigits = digits;
    		}

    		// Todo: localise value where toLocaleString not supported
    		return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
    	},


    	/* lowercase:
    	Returns the lowercase string of value. */
    	lowercase: function(value) {
    		if (typeof value !== 'string') { return; }
    		return String.prototype.toLowerCase.apply(value);
    	},

    	map: function(method, params, array) {
    		//var tokens;
    		//
    		//if (params === undefined) {
    		//	tokens = parsePipe([], method);
    		//	fn     = createPipe(tokens, transforms);
    		//	return function(array) {
    		//		return array.map(fn);
    		//	};
    		//}

    		var fn = (
    			(transformers[method] && transformers[method].tx) ||
    			transforms[method]
    		);

    		return array && array.map((value) => fn(...params, value));
    	},

    	filter: function(method, args, array) {
    		var fn = (
    			(transformers[method] && transformers[method].tx) ||
    			transforms[method]
    		);

    		return array && array.filter((value) => fn(...args, value));
    	},

    	match: function(regex, string) {
    		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
    		return regex.exec(string);
    	},

    	matches: function(regex, string) {
    		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
    		return !!regex.test(string);
    	},

    	/* pluralise: str1, str2, lang
    	Where value is singular in a given `lang`, retuns `str1`, otherwise `str2`. */
    	pluralise: function(str1, str2, lang, value) {
    		if (typeof value !== 'number') { return; }

    		str1 = str1 || '';
    		str2 = str2 || 's';

    		// In French, numbers less than 2 are considered singular, where in
    		// English, Italian and elsewhere only 1 is singular.
    		return lang === 'fr' ?
    			(value < 2 && value >= 0) ? str1 : str2 :
    			value === 1 ? str1 : str2 ;
    	},

    	reduce: function(name, initialValue, array) {
    		return array && array.reduce(reducers[name], initialValue || 0);
    	},

    	replace: function(str1, str2, value) {
    		if (typeof value !== 'string') { return; }
    		return value.replace(RegExp(str1, 'g'), str2);
    	},

    	round: function round(n, value) {
    		return Math.round(value / n) * n;
    	},

    	slice: function(i0, i1, value) {
    		return typeof value === 'string' ?
    			value.slice(i0, i1) :
    			Array.prototype.slice.call(value, i0, i1) ;
    	},

    	striptags: (function() {
    		var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

    		return function(value) {
    			return value.replace(rtag, '');
    		};
    	})(),

    	translate: (function() {
    		var warned = {};

    		return function(value) {
    			var translations = translations;

    			if (!translations) {
    				if (!warned.missingTranslations) {
    					console.warn('Sparky: Missing lookup object Sparky.translations');
    					warned.missingTranslations = true;
    				}
    				return value;
    			}

    			var text = translations[value] ;

    			if (!text) {
    				if (!warned[value]) {
    					console.warn('Sparky: Sparky.translations contains no translation for "' + value + '"');
    					warned[value] = true;
    				}

    				return value;
    			}

    			return text ;
    		};
    	})(),

    	truncatechars: function(n, value) {
    		return value.length > n ?
    			value.slice(0, n) + '…' :
    			value ;
    	},

    	uppercase: function(value) {
    		if (typeof value !== 'string') { return; }
    		return String.prototype.toUpperCase.apply(value);
    	},

    	/* yesno: a, b
    	Where value is truthy returns `a`, otherwise `b`. */
    	yesno: function(truthy, falsy, value) {
    		return value ? truthy : falsy ;
    	}
    };

    const assign$9  = Object.assign;

    function call$1(fn) {
        return fn();
    }

    function observeThing(renderer, token, object, scope, log) {
        // Normally observe() does not fire on undefined initial values.
        // Passing in NaN as an initial value to forces the callback to
        // fire immediately whatever the initial value. It's a bit
        // smelly, but this works because even NaN !== NaN.
        token.unobservers.push(
            observe(object.path, (value) => {
                object.value = value;

                // If token has noRender flag set, it is being updated from
                // the input and does not need to be rendered back to the input
                if (token.noRender) { return; }
                renderer.cue();
            }, scope, NaN)
        );
    }

    function Renderer() {
        this.renderCount = 0;
    }

    assign$9(Renderer.prototype, {
        fire: function() {
            this.cued = false;
        },

        cue: function() {
            if (this.cued) { return; }
            this.cued = true;
            cue(this);
        },

        push: function(scope) {
            const tokens = this.tokens;
            let n = tokens.length;

            // Todo: keep a renderer-level cache of paths to avoid creating duplicate observers??
            //if (!renderer.paths) {
            //    renderer.paths = {};
            //}

            while (n--) {
                const token = tokens[n];

                // Ignore plain strings
                if (typeof token === 'string') { continue; }

                // Empty or initialise unobservers
                if (token.unobservers) {
                    token.unobservers.forEach(call$1);
                    token.unobservers.length = 0;
                }
                else {
                    token.unobservers = [];
                }

                observeThing(this, token, token, scope);

                let p = token.pipe && token.pipe.length;
                while (p--) {
                    let args = token.pipe[p].args;
                    if (!args.length) { continue; }

                    // Look for dynamic value objects
                    args = args.filter(isValue$1);
                    if (!args.length) { continue; }

                    args.forEach((param) => observeThing(this, token, param, scope));
                }
            }
        },

        stop: function stop() {
            uncue(this);

            const tokens = this.tokens;
            let n = tokens.length;

            while (n--) {
                const token = tokens[n];

                if (token.unobservers) {
                    token.unobservers.forEach(call$1);
                    token.unobservers.length = 0;
                }
            }

            this.stop = noop;
        }
    });

    const assign$a = Object.assign;

    function isTruthy(token) {
    	return !!token.valueOf();
    }

    function renderBooleanAttribute(name, node, value) {
    	if (value) {
    		node.setAttribute(name, name);
    	}
    	else {
    		node.removeAttribute(name);
    	}

    	// Return DOM mutation count
    	return 1;
    }

    function renderProperty(name, node, value) {
    	node[name] = value;

    	// Return DOM mutation count
    	return 1;
    }

    function BooleanRenderer(tokens, node, name) {
        Renderer.call(this);

        this.label  = 'Boolean';
    	this.node   = node;
        this.name   = name;
    	this.tokens = tokens;
    	this.render = name in node ?
    		renderProperty :
    		renderBooleanAttribute ;
    }

    assign$a(BooleanRenderer.prototype, Renderer.prototype, {
        fire: function renderBoolean() {
            Renderer.prototype.fire.apply(this);

            const value = !!this.tokens.find(isTruthy);

            // Avoid rendering the same value twice
            if (this.renderedValue === value) { return 0; }

    		// Return DOM mutation count
            this.renderCount += this.render(this.name, this.node, value);
    		this.renderedValue = value;
        }
    });

    const assign$b = Object.assign;

    // Matches anything that contains a non-space character
    const rtext = /\S/;

    // Matches anything with a space
    const rspaces$1 = /\s+/;


    function addClasses(classList, text) {
        var classes = text.trim().split(rspaces$1);
        classList.add.apply(classList, classes);

        // Return DOM mutation count
        return 1;
    }

    function removeClasses(classList, text) {
        var classes = text.trim().split(rspaces$1);
        classList.remove.apply(classList, classes);

        // Return DOM mutation count
        return 1;
    }

    function partitionByType(data, token) {
        data[typeof token].push(token);
        return data;
    }

    function ClassRenderer(tokens, node) {
        Renderer.call(this);

        this.label  = 'Class';

        const types = tokens.reduce(partitionByType, {
            string: [],
            object: []
        });

        this.tokens = types.object;
        this.classList = classes(node);

        // Overwrite the class with just the static text
        node.setAttribute('class', types.string.join(' '));
    }

    assign$b(ClassRenderer.prototype, Renderer.prototype, {
        fire: function renderBoolean() {
            Renderer.prototype.fire.apply(this);

            const list  = this.classList;
            const value = this.tokens.join(' ');

            // Avoid rendering the same value twice
            if (this.renderedValue === value) {
                return;
            }

            this.renderCount += this.renderedValue && rtext.test(this.renderedValue) ?
                removeClasses(list, this.renderedValue) :
                0 ;

            this.renderCount += value && rtext.test(value) ?
                addClasses(list, value) :
                0 ;

            this.renderedValue = value;
        }
    });

    const assign$c = Object.assign;

    function StringRenderer(tokens, render, node, name) {
        Renderer.call(this);

        this.label  = 'String';
        this.render = render;
        this.node   = node;
        this.name   = name;
        this.tokens = tokens;
    }

    assign$c(StringRenderer.prototype, Renderer.prototype, {
        fire: function renderString() {
            Renderer.prototype.fire.apply(this);

            // Causes token.toString() to be called
            const value = this.tokens.join('');

            // Avoid rendering the same value twice
            if (this.renderedValue === value) { return; }

            // Return DOM mutation count
            this.renderCount += this.render(this.name, this.node, value);
            this.renderedValue = value;
        }
    });

    const assign$d = Object.assign;

    function observeMutations(node, fn) {
        var observer = new MutationObserver(fn);
        observer.observe(node, { childList: true });
        return function unobserveMutations() {
            observer.disconnect();
        };
    }

    function TokenRenderer(token, render, node, name) {
        Renderer.call(this);

        this.label  = 'Token';
        this.render = render;
        this.node   = node;
        this.name   = name;
        this.tokens = [token];

        // Observe mutations to select children, they alter the value of
        // the select, and try to preserve the value if possible
        if (node.tagName.toLowerCase() === 'select') {
            this.unobserveMutations = observeMutations(node, () => {
                if (node.value === this.renderedValue + '') { return; }
                this.renderedValue = undefined;
                cue(this);
            });
        }
    }

    assign$d(TokenRenderer.prototype, Renderer.prototype, {
        fire: function renderValue() {
            Renderer.prototype.fire.apply(this);

            const token = this.tokens[0];
            const value = token.valueOf();

            // Avoid rendering the same value twice
            if (this.renderedValue === value) {
                return;
            }

            this.renderCount += this.render(this.name, this.node, value);
            this.renderedValue = value;
        },

        stop: function stop() {
            Renderer.prototype.stop.apply(this, arguments);
            this.unobserveMutations && this.unobserveMutations();
        }
    });

    const inputMap  = new WeakMap();
    const changeMap = new WeakMap();

    function getInvert(name) {
        return transformers[name] && transformers[name].ix;
    }

    function fire$1() {
        Renderer.prototype.fire.apply(this, arguments);

        // Test for undefined and if so set value on scope from the current
        // value of the node. Yes, this means the data can change unexpectedly
        // but the alternative is inputs that jump values when their scope
        // is replaced.
        if (getPath$1(this.path, this.scope) === undefined) {
            // A fudgy hack. A hacky fudge.
            this.token.noRender = true;
            this.fn();
            this.token.noRender = false;
        }
    }

    function Listener(node, token, eventType, read, readAttributeValue, coerce) {
        this.label = "Listener";
        this.node  = node;
        this.token = token;
        this.path  = token.path;
        this.pipe  = token.pipe;
        this.type  = eventType;
        this.renderCount = 0;
        this.read = read;
        this.readAttributeValue = readAttributeValue;
        this.coerce = coerce || id;
        this.fns   = eventType === 'input' ? inputMap :
            eventType === 'change' ? changeMap :
            undefined ;
    }

    Object.assign(Listener.prototype, {
        transform: id,

        set: noop,

        fire: function() {
            Renderer.prototype.fire.apply(this, arguments);

            // First render, set up reverse pipe
            if (this.pipe) {
                this.transform = pipe.apply(null,
                    this.pipe
                    .map((data) => {
                        const fn = getInvert(data.name);
                        if (!fn) { throw new Error('Sparky invert fn ' + data.name + '() not found.'); }
                        return data.args && data.args.length ?
                            fn.apply(null, data.args) :
                            fn ;
                    })
                    .reverse()
                );
            }

            // Define the event handler
            this.fn = () => {
                const value = this.coerce(this.read(this.node));
                // Allow undefined to pass through with no transform
                this.set(value !== undefined ? this.transform(value) : undefined);
            };

            // Add it to the delegate pool
            this.fns.set(this.node, this.fn);

            // Handle subsequent renders by replacing this fire method
            this.fire = fire$1;

            // Set the original value on the scope
            if (getPath$1(this.path, this.scope) === undefined) {
                // Has this element already had its value property set? Custom
                // elements may not yet have the value property
                if ('value' in this.node) {
                    this.fn();
                }
                else {
                    // A fudgy hack. A hacky fudge.
                    this.token.noRender = true;
                    this.set(this.transform(this.coerce(this.readAttributeValue(this.node))));
                    this.token.noRender = false;
                }
            }
        },

        push: function(scope) {
            this.scope = scope;

            if (scope[this.path] && scope[this.path].setValueAtTime) {
                // Its an AudioParam... oooo... eeeuuuhhh...
                this.set = (value) => {
                    if (value === undefined) { return; }
                    Target(scope)[this.path].setValueAtTime(value, scope.context.currentTime);
                };
            }
            else {
                this.set = setPath$1(this.path, scope);
            }

            // Wait for values to have been rendered on the next frame
            // before setting up. This is so that min and max and other
            // constraints have had a chance to affect value before it is
            // read and set on scope.
            cue(this);
            return this;
        },

        stop: function() {
            this.fns.delete(this.node);
            return this;
        }
    });


    // Delegate input and change handlers to the document at the cost of
    // one WeakMap lookup, and using the capture phase so that accompanying
    // scope is updated before any other handlers do anything

    document.addEventListener('input', function(e) {
        const fn = inputMap.get(e.target);
        if (!fn) { return; }
        fn(e.target.value);
    }, { capture: true });

    document.addEventListener('change', function(e) {
        const fn = changeMap.get(e.target);
        if (!fn) { return; }
        fn(e.target.value);
    }, { capture: true });

    var config$2 = {
        default:  { attributes: ['id', 'title', 'style'], booleans: ['hidden'] },
        a:        { attributes: ['href'] },
        button:   { attributes: ['name', 'value'], booleans: ['disabled'] },
        circle:   { attributes: ['cx', 'cy', 'r', 'transform'] },
        ellipse:  { attributes: ['cx', 'cy', 'rx', 'ry', 'r', 'transform'] },
        form:     { attributes: ['method', 'action'] },
        fieldset: { booleans:   ['disabled'] },
        g:        { attributes: ['transform'] },
        img:      { attributes: ['alt', 'src']	},
        input: {
            booleans:   ['disabled', 'required'],
            attributes: ['name'],
            types: {

                /* Todo: move `value` definition to internal logic (call it `type`
                   for gods sake), shouldnt be exposed to config. */

                button:   { attributes: ['value'] },
                checkbox: { attributes: [], booleans: ['checked'], value: 'checkbox' },
                date:     { attributes: ['min', 'max', 'step'], value: 'string' },
                hidden:   { attributes: ['value'] },
                image:    { attributes: ['src'] },
                number:   { attributes: ['min', 'max', 'step'], value: 'number' },
                radio:    { attributes: [], booleans: ['checked'], value: 'radio' },
                range:    { attributes: ['min', 'max', 'step'], value: 'number' },
                reset:    { attributes: ['value'] },
                submit:   { attributes: ['value'] },
                time:     { attributes: ['min', 'max', 'step'], value: 'string' },
                default:  { value: 'string' }
            }
        },
        label:    { attributes: ['for'] },
        line:     { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
        link:     { attributes: ['href'] },
        meta:     { attributes: ['content'] },
        meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
        option:   { attributes: ['value'], booleans: ['disabled'] },
        output:   { attributes: ['for'] },
        path:     { attributes: ['d', 'transform'] },
        polygon:  { attributes: ['points', 'transform'] },
        polyline: { attributes: ['points', 'transform'] },
        progress: { attributes: ['max', 'value'] },
        rect:     { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
        select:   { attributes: ['name'], booleans: ['disabled', 'required'], types: { default: { value: 'string' }}},
        svg:      { attributes: ['viewbox'] },
        text:     { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
        textarea: { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
        time:     { attributes: ['datetime'] },
        use:      { attributes: ['href', 'transform', 'x', 'y'] }
    };

    const DEBUG$5 = window.DEBUG === true || window.DEBUG === 'Sparky';

    const A$9      = Array.prototype;
    const assign$e = Object.assign;

    const $cache = Symbol('cache');

    const cased = {
    	viewbox: 'viewBox'
    };


    // Helpers

    const getType = get$1('type');

    const getNodeType = get$1('nodeType');

    const types$1 = {
    	'number':     'number',
    	'range':      'number'
    };

    function push(value, pushable) {
    	pushable.push(value);
    	return value;
    }

    function stop(object) {
    	object.stop();
    	return object;
    }


    // Pipes

    const pipesCache = transforms[$cache] = {};

    function getTransform(name) {
        return transformers[name] ?
            transformers[name].tx :
            transforms[name] ;
    }

    function createPipe(array, pipes) {
    	// Cache is dependent on pipes object - a new pipes object
    	// results in a new cache
    	const localCache = pipes
    		&& (pipes[$cache] || (pipes[$cache] = {}));

    	// Cache pipes for reuse by other tokens
    	const key = JSON.stringify(array);

    	// Check global and local pipes caches
    	if (pipesCache[key]) { return pipesCache[key]; }
    	if (localCache && localCache[key]) { return localCache[key]; }

    	// All a bit dodgy - we cycle over transforms and switch the cache to
    	// local cache if a global pipe is not found...
    	var cache = pipesCache;
    	const fns = array.map((data) => {
    		// Look in global pipes first
    		var fn = getTransform(data.name);

    		if (!fn) {
    			if (DEBUG$5 && !pipes) {
    				throw new ReferenceError('Template pipe "' + data.name + '" not found.');
    			}

    			// Switch the cache, look in local pipes
    			cache = localCache;
    			fn = pipes[data.name];

    			if (DEBUG$5 && !fn) {
    				throw new ReferenceError('Template pipe "' + data.name + '" not found.');
    			}
    		}

    		// Does the number of arguments supplied match the signature of the
    		// transform? If not, error of the form
    		// transform:arg,arg,arg takes 3 arguments, 2 given arg,arg
    		if (DEBUG$5 && data.args.length !== fn.length - 1) {
    			throw new Error(data.name + ':'
    				+ /\(((?:(?:,\s*)?\w*)*),/.exec(fn.toString())[1].replace(/\s*/g, '')
    				+ ' takes ' + (fn.length - 1) + ' arguments, '
    				+ data.args.length + ' given ' + data.args);
    		}

    		// If there are arguments apply them to fn
    		return data.args && data.args.length ?
    			(value) => fn(...data.args, value) :
    			fn ;
    	});

    	// Cache the result
    	return (cache[key] = pipe.apply(null, fns));
    }

    function assignTransform(pipes, token) {
    	if (token.pipe) {
    		token.transform = createPipe(token.pipe, pipes);
    	}

    	return pipes;
    }


    // Read

    function coerceString(value) {
    	// Reject empty strings
    	return value || undefined;
    }

    function coerceNumber(value) {
    	// Reject non-number values including NaN
    	value = +value;
    	return value || value === 0 ? value : undefined ;
    }

    function readValue(node) {
    	// Falsy values other than false or 0 should return undefined,
    	// meaning that an empty <input> represents an undefined property
    	// on scope.
    	const value = node.value;
    	return value || value === 0 ? value : undefined ;
    }

    function readCheckbox(node) {
    	// Check whether value is defined to determine whether we treat
    	// the input as a value matcher or as a boolean
    	return isDefined(node.getAttribute('value')) ?
    		// Return string or undefined
    		node.checked ? node.value : undefined :
    		// Return boolean
    		node.checked ;
    }

    function readRadio(node) {
    	if (!node.checked) { return; }

    	return isDefined(node.getAttribute('value')) ?
    		// Return value string
    		node.value :
    		// Return boolean
    		node.checked ;
    }

    function readAttributeValue(node) {
    	// Get original value from attributes. We cannot read properties here
    	// because custom elements do not yet have their properties initialised
    	return node.getAttribute('value') || undefined;
    }

    function readAttributeChecked(node) {
    	// Get original value from attributes. We cannot read properties here
    	// because custom elements do not yet have their properties initialised
    	const value    = node.getAttribute('value');
    	const checked  = !!node.getAttribute('checked');
    	return value ? value : checked ;
    }


    // Render

    function renderText(name, node, value) {
    	node.nodeValue = value;

    	// Return DOM mod count
    	return 1;
    }

    function renderAttribute(name, node, value) {
    	node.setAttribute(cased[name] || name, value);

    	// Return DOM mod count
    	return 1;
    }

    function renderProperty$1(name, node, value) {
    	// Bit of an edge case, but where we have a custom element that has not
    	// been upgraded yet, but it gets a property defined on its prototype when
    	// it does upgrade, setting the property on the instance now will mask the
    	// ultimate get/set definition on the prototype when it does arrive.
    	//
    	// So don't, if property is not in node. Set the attribute, it will be
    	// picked up on upgrade.
    	if (name in node) {
    		node[name] = value;
    	}
    	else {
    		node.setAttribute(name, value);
    	}

    	// Return DOM mutation count
    	return 1;
    }

    function renderPropertyBoolean(name, node, value) {
    	if (name in node) {
    		node[name] = value;
    	}
    	else if (value) {
    		node.setAttribute(name, name);
    	}
    	else {
    		node.removeAttribute(name);
    	}

    	// Return DOM mutation count
    	return 1;
    }

    function renderValue(name, node, value) {
    	// Don't render into focused nodes, it makes the cursor jump to the
    	// end of the field, plus we should cede control to the user anyway
    	if (document.activeElement === node) {
    		return 0;
    	}

    	value = typeof value === (types$1[node.type] || 'string') ?
    		value :
    		null ;

        // Avoid updating with the same value. Support values that are any
    	// type as well as values that are always strings
    	if (value === node.value || (value + '') === node.value) { return 0; }

    	const count = renderProperty$1('value', node, value);

    	// Event hook (validation in dom lib)
    	trigger$2('dom-update', node);

    	// Return DOM mod count
    	return count;
    }

    function renderValueNumber(name, node, value) {
    	// Don't render into focused nodes, it makes the cursor jump to the
    	// end of the field, and we should cede control to the user anyway
    	if (document.activeElement === node) { return 0; }

    	// Be strict about type, dont render non-numbers
    	value = typeof value === 'number' ? value : null ;

    	// Avoid updating with the same value. Beware that node.value
    	// may be a string (<input>) or number (<range-control>)
    	if (value === (node.value === '' ? null : +node.value)) { return 0; }

    	const count = renderProperty$1('value', node, value);

    	// Event hook (validation in dom lib)
    	trigger$2('dom-update', node);

    	// Return DOM mod count
    	return count;
    }

    function renderChecked(name, node, value) {
    	// Where value is defined check against it, otherwise
    	// value is "on", uselessly. Set checked state directly.
    	const checked = isDefined(node.getAttribute('value')) ?
    		value === node.value :
    		value === true ;

    	if (checked === node.checked) { return 0; }

    	const count = renderPropertyBoolean('checked', node, checked);

    	// Event hook (validation in dom lib)
    	trigger$2('dom-update', node);

    	// Return DOM mod count
    	return count;
    }


    // Mount

    function mountToken(source, render, renderers, options, node, name) {
    	// Shortcut empty string
    	if (!source) { return; }

    	const token = parseToken(source);
    	if (!token) { return; }

    	// Create transform from pipe
    	assignTransform(options.pipes, token);
    	const renderer = new TokenRenderer(token, render, node, name);
    	renderers.push(renderer);
    	return renderer;
    }

    function mountString(source, render, renderers, options, node, name) {
    	// Shortcut empty string
    	if (!source) { return; }

    	const tokens = parseText([], source);
    	if (!tokens) { return; }

    	// Create transform from pipe
    	tokens.reduce(assignTransform, options.pipes);

    	const renderer = new StringRenderer(tokens, render, node, name);
    	renderers.push(renderer);
    	return renderer;
    }

    function mountAttribute(name, node, renderers, options, prefixed) {
    	name = cased[name] || name;

    	var source = prefixed !== false && node.getAttribute(options.attributePrefix + name);

    	if (source) {
    		node.removeAttribute(options.attributePrefix + name);
    	}
    	else {
    		source = node.getAttribute(name);
    	}

    	return mountString(source, renderAttribute, renderers, options, node, name);
    }

    function mountAttributes(names, node, renderers, options) {
    	var name;
    	var n = -1;

    	while ((name = names[++n])) {
    		mountAttribute(name, node, renderers, options);
    	}
    }

    function mountBoolean(name, node, renderers, options) {
    	// Look for prefixed attributes before attributes.
    	//
    	// In FF, the disabled attribute is set to the previous value that the
    	// element had when the page is refreshed, so it contains no sparky
    	// tags. The proper way to address this problem is to set
    	// autocomplete="off" on the parent form or on the field.
    	const prefixed = node.getAttribute(options.attributePrefix + name);

    	if (prefixed) {
    		node.removeAttribute(options.attributePrefix + name);
    	}

    	const source = prefixed || node.getAttribute(name);
    	if (!source) { return; }

    	const tokens = parseBoolean([], source);
    	if (!tokens) { return; }

    	// Create transform from pipe
    	tokens.reduce(assignTransform, options.pipes);

    	const renderer = new BooleanRenderer(tokens, node, name);
    	renderers.push(renderer);
    	return renderer;
    }

    function mountBooleans(names, node, renderers, options) {
    	var name;
    	var n = -1;

    	while ((name = names[++n])) {
    		mountBoolean(name, node, renderers, options);
    	}
    }

    function mountClass(node, renderers, options) {
    	const prefixed = node.getAttribute(options.attributePrefix + 'class');

    	if (prefixed) {
    		node.removeAttribute(options.attributePrefix + 'class');
    	}

    	// Are there classes?
    	const source = prefixed || node.getAttribute('class');
    	if (!source) { return; }

    	const tokens = parseText([], source);
    	if (!tokens) { return; }

    	// Create transform from pipe
    	tokens.reduce(assignTransform, options.pipes);

    	const renderer = new ClassRenderer(tokens, node);
    	renderers.push(renderer);
    }

    function mountValueProp(node, renderers, options, render, eventType, read, readAttribute, coerce) {
    	const prefixed = node.getAttribute(options.attributePrefix + 'value');

    	if (prefixed) {
    		node.removeAttribute(options.attributePrefix + 'value');
    	}

    	const source   = prefixed || node.getAttribute('value');
    	const renderer = mountToken(source, render, renderers, options, node, 'value');
    	if (!renderer) { return; }

        // Insert a new listener ahead of the renderer so that on first
    	// cue the listener populates scope from the input value first
    	const listener = new Listener(node, renderer.tokens[0], eventType, read, readAttribute, coerce);
    	renderers.splice(renderers.length - 1, 0, listener);
    }

    function mountValueChecked(node, renderers, options, render, read, readAttribute, coerce) {
    	const source = node.getAttribute('value') ;
    	mountString(source, renderProperty$1, renderers, options, node, 'value');

    	const sourcePre = node.getAttribute(options.attributePrefix + 'value');
    	const renderer = mountToken(sourcePre, render, renderers, options, node, 'value');
    	if (!renderer) { return; }

    	// Insert a new listener ahead of the renderer so that on first
    	// cue the listener populates scope from the input value first
    	const listener = new Listener(node, renderer.tokens[0], 'change', read, readAttribute, coerce);
    	renderers.splice(renderers.length - 1, 0, listener);
    }

    const mountValue = choose({
    	number: function(node, renderers, options) {
    		return mountValueProp(node, renderers, options, renderValueNumber, 'input', readValue, readAttributeValue, coerceNumber);
    	},

    	range: function(node, renderers, options) {
    		return mountValueProp(node, renderers, options, renderValueNumber, 'input', readValue, readAttributeValue, coerceNumber);
    	},

    	checkbox: function(node, renderers, options) {
    		return mountValueChecked(node, renderers, options, renderChecked, readCheckbox, readAttributeChecked);
    	},

    	radio: function(node, renderers, options) {
    		return mountValueChecked(node, renderers, options, renderChecked, readRadio, readAttributeChecked);
    	},

        file: function(node, renderers, options) {
            // Safari does not send input events on file inputs
    		return mountValueProp(node, renderers, options, renderValue, 'change', readValue, readAttributeValue, coerceString);
    	},

    	default: function(node, renderers, options) {
    		return mountValueProp(node, renderers, options, renderValue, 'input', readValue, readAttributeValue, coerceString);
    	}
    });

    function mountInput(types, node, renderers, options) {
    	var type    = getType(node);
    	var setting = types[type] || types.default;

    	if (!setting) { return; }
    	if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
    	if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
    	if (setting.value)      { mountValue(type, node, renderers, options); }
    }

    function mountTag(settings, node, renderers, options) {
    	var name    = tag(node);
    	var setting = settings[name];

    	if (!setting) { return; }
    	if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
    	if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
    	if (setting.types)      { mountInput(setting.types, node, renderers, options); }
    	if (setting.value)      { mountValue(setting.value, node, renderers, options); }
    }

    function mountCollection(children, renderers, options) {
    	var n = -1;
    	var child;

    	while ((child = children[++n])) {
    		mountNode(child, renderers, options);
    	}
    }

    const mountNode = overload(getNodeType, {
    	// element
    	1: function mountElement(node, renderers, options) {
    		const sparky = options.mount && options.mount(node, options);
    		if (sparky) {
    			renderers.push(sparky);
    			return;
    		}

    		// Get an immutable list of children. Remember node.childNodes is
    		// dynamic, and we don't want to mount elements that may be dynamically
    		// inserted, so turn childNodes into an array first.
    		mountCollection(Array.from(node.childNodes), renderers, options);
    		mountClass(node, renderers, options);
    		mountBooleans(config$2.default.booleans, node, renderers, options);
    		mountAttributes(config$2.default.attributes, node, renderers, options);
    		mountTag(config$2, node, renderers, options);
    	},

    	// text
    	3: function mountText(node, renderers, options) {
    		mountString(node.nodeValue, renderText, renderers, options, node);
    	},

    	// comment
    	8: noop,

    	// document
    	9: function mountDocument(node, renderers, options) {
    		mountCollection(A$9.slice.apply(node.childNodes), renderers, options);
    	},

    	// doctype
    	10: noop,

    	// fragment
    	11: function mountFragment(node, renderers, options) {
    		mountCollection(A$9.slice.apply(node.childNodes), renderers, options);
    	},

        default: function(node) {
            throw new TypeError('mountNode(node) node is not a mountable Node');
        }
    });


    /*
    Mount(node, options)

    `const mount = Mount(node, options);`

    A mount is a pushable stream. Push an object of data to render the templated
    node on the next animation frame.

    ```
    mount.push(data);
    ```
    */

    function Mount(node, options) {
    	if (!Mount.prototype.isPrototypeOf(this)) {
            return new Mount(node, options);
        }

    	this.renderers = [];
        mountNode(node, this.renderers, options);
    }

    assign$e(Mount.prototype, {
    	stop: function() {
    		this.renderers.forEach(stop);
    		return this;
    	},

    	push: function(scope) {
    		// Dedup
    		if (this.scope === scope) {
    			return this;
    		}

    		// Set new scope
    		this.scope = scope;
    		this.renderers.reduce(push, scope);

    		return this;
    	}
    });

    const DEBUG$6 = window.DEBUG === true || window.DEBUG === 'Sparky';

    const assign$f = Object.assign;

    const captureFn = capture$1(/^\s*([\w-]+)\s*(:)?/, {
        1: function(output, tokens) {
            output.name = tokens[1];
            return output;
        },

        2: function(output, tokens) {
            output.params = parseParams([], tokens);
            return output;
        },

        close: function(output, tokens) {
            // Capture exposes consumed index as .consumed
            output.remainingString = tokens.input.slice(tokens[0].length + (tokens.consumed || 0));
            return output;
        }
    });

    function valueOf(object) {
        return object.valueOf();
    }

    function toObserverOrSelf(object) {
        return Observer(object) || object;
    }

    function replace$2(target, content) {
        before$1(target, content);
        //target.before(content);
        target.remove();
    }

    function prepareInput(input, output) {
        // Support promises and streams
        const stream = output.then ?
            new Stream$1(function(push, stop) {
                output
                .then(push)
                .catch(stop);
                return { stop };
            }) :
            output ;

        input.done(() => stream.stop());

        // Make sure the next fn gets an observable
        return stream.map(toObserverOrSelf);
    }

    function run$1(context, node, input, options) {
        var result;

        while(input && options.fn && (result = captureFn({}, options.fn))) {
            // Find Sparky function by name, looking in global functions
            // first, then local options. This order makes it impossible to
            // overwrite built-in fns.
            const fn = functions[result.name] || (options.functions && options.functions[result.name]);

            if (!fn) {
                throw new Error(
                    'Sparky function "'
                    + result.name
                    + '" not found mounting node '
                    + nodeToString(node)
                );
            }

            options.fn = result.remainingString;

            if (fn.settings) {
                // Overwrite functions / pipes
                assign$f(options, fn.settings);
            }

            // Return values from Sparky functions mean -
            // stream    - use the new input stream
            // promise   - use the promise
            // undefined - use the same input streeam
            // false     - stop processing this node
            const output = fn.call(input, node, result.params, options) ;

            // Output false means stop processing the node
            if (output === false) {
                return false;
            }

            // If output is defined and different from input
            if (output && output !== input) {
                input = prepareInput(input, output);
            }
        }

        return input;
    }

    function mountContent(content, options) {
        options.mount = function(node, options) {
            // This is a half-assed way of preventing the root node of this
            // sparky from being remounted. Still needed?
            if (node === content) { return; }

            // Does the node have Sparkyfiable attributes?
            options.fn      = node.getAttribute(options.attributeFn) || '';
            options.include = node.getAttribute(options.attributeInclude) || '';

            if (!options.fn && !options.include) { return; }

            // Return a writeable stream. A writeable stream
            // must have the methods .push() and .stop().
            // A Sparky() is a write stream.
            return Sparky(node, options);
        };

        // Launch rendering
        return new Mount(content, options);
    }

    function setupTarget(input, render, options) {
        const src = options.include;

        // If there are no dynamic tokens to render, return the include
        if (!src) {
            throw new Error('Sparky attribute include cannot be empty');
        }

        const tokens = parseText([], src);

        // Reset options.include, it's done its job for now
        options.include = '';

        // If there are no dynamic tokens to render, return the include
        if (!tokens) {
            return setupSrc(src, input, render, options);
        }

        // Create transform from pipe
    	tokens.reduce(assignTransform, options.pipes);

        let output  = nothing;
        //let stop    = noop;
        let prevSrc = null;

        function update(scope) {
            const values = tokens.map(valueOf);

            // Tokens in the include tag MUST evaluate in order that a template
            // may be rendered.
            //
            // If any tokens evaluated to undefined (which can happen frequently
            // because observe is not batched, it will attempt to update() before
            // all tokens have value) we don't want to go looking for a template.
            if (values.indexOf(undefined) !== -1) {
                if (prevSrc !== null) {
                    render(null);
                    prevSrc = null;
                }

                return;
            }

            // Join the tokens together
            const src = values
            .map(toText)
            .join('');

            // If template path has not changed
            if (src === prevSrc) {
                output.push(scope);
                return;
            }

            prevSrc = src;

            // Stop the previous
            output.stop();
            //stop();

            // If include is empty string render nothing
            if (!src) {
                if (prevSrc !== null) {
                    render(null);
                    prevSrc = null;
                }

                output = nothing;
                //stop = noop;
                return;
            }

            // Push scope to the template renderer
            output = Stream$1.of(scope);
            setupSrc(src, output, render, options);
        }

        input
        .each(function(scope) {
            let n = tokens.length;

            while (n--) {
                const token = tokens[n];

                // Ignore plain strings
                if (typeof token === 'string') { continue; }

                // Passing in NaN as an initial value to observe() forces the
                // callback to be called immediately. It's a bit tricksy, but this
                // works because even NaN !== NaN.
                token.unobserve && token.unobserve();
                token.unobserve = observe(token.path, (value) => {
                    token.value = value;
                    update(scope);
                }, scope, NaN);
            }
        })
        .done(() => {
            output.stop();
            //stop();
        });
    }

    function setupSrc(src, input, firstRender, options) {
        // Strip off leading # before running the test
        const source = document.getElementById(src.replace(/^#/, ''));

        if (source) {
            const content = source.content ? source.content.cloneNode(true) :
                source instanceof SVGElement ? source.cloneNode(true) :
                undefined ;

            return setupInclude(content, input, firstRender, options);
        }

        importTemplate(src)
        .then((node) => {
            if (input.status === 'done') { return; }

            const content =
                // Support templates
                node.content ? node.content.cloneNode(true) :
                // Support SVG elements
                node instanceof SVGElement ? node.cloneNode(true) :
                // Support body elements imported from exernal documents
                fragmentFromChildren(node) ;

            setupInclude(content, input, firstRender, options);
        })
        // Swallow errors – unfound templates should not stop the rendering of
        // the rest of the tree – but log them to the console as errors.
        .catch((error) => {
            console.error(error.stack);
        });
    }

    function setupInclude(content, input, firstRender, options) {
        var renderer;

        input.each((scope) => {
            if (renderer) {
                return renderer.push(scope);
            }

            renderer = isFragmentNode(content) ?
                mountContent(content, options) :
                new Sparky(content, options) ;

            input.done(() => renderer.stop());
            renderer.push(scope);
            firstRender(content);
        });
    }

    function setupElement(target, input, options, sparky) {
        const content = target.content;
        var renderer;

        input.each((scope) => {
            if (renderer) {
                return renderer.push(scope);
            }

            renderer = mountContent(content || target, options);
            input.done(() => renderer.stop());
            renderer.push(scope);

            // If target is a template, replace it
            if (content) {
                replace$2(target, content);

                // Increment mutations for logging
                ++sparky.renderCount;
            }
        });
    }

    function setupTemplate(target, input, options, sparky) {
        const src   = options.include;
        const nodes = { 0: target };

        return setupTarget(input, (content) => {
            // Store node 0
            const node0 = nodes[0];

            // Remove nodes from 1 to last
            var n = 0;
            while (nodes[++n]) {
                nodes[n].remove();
                nodes[n] = undefined;

                // Update count for logging
                ++sparky.renderCount;
            }

            // If there is content cache new nodes
            if (content && content.childNodes && content.childNodes.length) {
                assign$f(nodes, content.childNodes);
            }

            // Otherwise content is a placemarker text node
            else {
                content = nodes[0] = target.content ?
                    DEBUG$6 ?
                        create$1('comment', ' include="' + src + '" ') :
                        create$1('text', '') :
                    target ;
            }

            // Replace child 0, which we avoided doing above to keep it as a
            // position marker in the DOM for exactly this reason this...
            replace$2(node0, content);

            // Update count for logging
            ++sparky.renderCount;
        }, options);
    }

    function setupSVG(target, input, options, sparky) {
        return setupTarget(input, (content) => {
            content.removeAttribute('id');

            replace$2(target, content);
            target = content;

            // Increment mutations for logging
            ++sparky.renderCount;
        }, options);
    }

    function makeLabel(target, options) {
        return '<'
            + (target.tagName ? target.tagName.toLowerCase() : '')
            + (options.fn ? ' fn="' + options.fn + '">' : '>');
    }

    /*
    Sparky(nodeOrSelector)

    Mounts any element as a template and returns a pushable stream. Push an object
    to the stream to have it rendered by the template:

    ```html
    <div id="title-div">
        I am {[title]}.
    </div>
    ```
    ```
    import Sparky from '/sparky/module.js';

    // Mount the <div>
    const sparky = Sparky('#title-div');

    // Render it by pushing in an object
    sparky.push({ title: 'rendered' });
    ```

    Results in:

    ```html
    <div id="title-div">
        I am rendered.
    </div>
    ```
    */



    /*
    include()

    Templates may include other templates. Define the `include` attribute
    as an href to a template:

    ```html
    <template id="i-am-title">
        I am {[title]}.
    </template>

    <template is="sparky-template" fn="fetch:package.json" include="#i-am-title"></template>

    I am Sparky.
    ```

    Templates may be composed of includes:

    ```html
    <template id="i-am-title">
        I am {[title]}.
    </template>

    <template is="sparky-template" fn="fetch:package.json">
        <template include="#i-am-title"></template>
        <template include="#i-am-title"></template>
    </template>

    I am Sparky.
    I am Sparky.
    ```
    */

    function Sparky(selector, settings) {
        if (!Sparky.prototype.isPrototypeOf(this)) {
            return new Sparky(selector, settings);
        }

        const target = typeof selector === 'string' ?
            document.querySelector(selector) :
            selector ;

        const options = assign$f({}, config$1, settings);

        // Todo: attrFn is just for logging later on... get rid of, maybe?
        options.fn = options.fn
            || target.getAttribute(options.attributeFn)
            || '';

        // Keep hold of attrFn for debugging
        //if (DEBUG) { var attrFn = options.fn; }

        this.label = makeLabel(target, options);
        this.renderCount = 0;

        const input = Stream$1.of().map(toObserverOrSelf);
        const output = run$1(null, target, input, options);

        this.push = function push() {
            input.push(arguments[arguments.length - 1]);
            return this;
        };

        this.stop = function() {
            input.stop();
            return this;
        };

        // If output is false do not go on to parse and mount content,
        // a fn is signalling that it will take over. fn="each" does this,
        // for example, replacing the original node and Sparky with duplicates.
        if (!output) { return; }

        // We have consumed fn lets make sure it's really empty
        options.fn = '';
        options.include = options.include
            || target.getAttribute(options.attributeInclude)
            || '';

        //if (DEBUG) { logNode(target, attrFn, options.include); }

        options.include ?
            target.tagName === 'use' ?
                setupSVG(target, output, options, this) :
            setupTemplate(target, output, options, this) :
        setupElement(target, output, options, this) ;
    }

    const DEBUG$7 = window.DEBUG;

    register('debug', function(node) {
        return DEBUG$7 ? this.tap((scope) => {
            console.log('Sparky fn="debug" node:', node,'scope:', scope);
            debugger;
        }) :
        this ;
    });

    const DEBUG$8 = window.DEBUG;

    function MarkerNode(node, options) {
        // A text node, or comment node in DEBUG mode, for marking a
        // position in the DOM tree so it can be swapped out with some
        // content in the future.

        if (!DEBUG$8) {
            return create$1('text', '');
        }

        var attrFn      = node && node.getAttribute(options ? options.attributeFn : 'fn');
        var attrInclude = node && node.getAttribute(options ? options.attributeInclude : 'include');

        return create$1('comment',
            tag(node) +
            (attrFn ? ' ' + (options ? options.attributeFn : 'fn') + '="' + attrFn + '"' : '') +
            (attrInclude ? ' ' + (options ? options.attributeInclude : 'include') + '="' + attrInclude + '"' : '')
        );
    }

    /*
    each:

    Clones the DOM node and renders a clone for each value in an array.

    ```html
    <ul>
        <li fn="get:keywords each">{[.]}</li>
    </ul>
    ```
    ```html
    <ul>
        <li>javascript</li>
    	<li>browser</li>
    </ul>
    ```

    Where there are functions declared after `each` in the attribute, they are run
    on each clone.
    */

    const A$a       = Array.prototype;

    const isArray = Array.isArray;
    const assign$g  = Object.assign;

    const $scope = Symbol('scope');


    // Renderers

    function EachChild(scope, node, marker, sparkies, isOption, options) {
    	this.label    = 'EachChild';
    	this.scope    = scope;
    	this.node     = node;
    	this.marker   = marker;
    	this.sparkies = sparkies;
    	this.isOption = isOption;
    	this.options  = options;
    	this.renderCount = 0;
    }

    assign$g(EachChild.prototype, {
    	fire: function render(time) {
    		this.render(this.scope);
    		this.value = this.scope;
    	},

    	render: function render(array) {
    		const node     = this.node;
    		const marker   = this.marker;
    		const sparkies = this.sparkies;
    //		const isOption = this.isOption;
    		const options  = this.options;

    		// Selects will lose their value if the selected option is removed
    		// from the DOM, even if there is another <option> of same value
    		// already in place. (Interestingly, value is not lost if the
    		// selected <option> is simply moved). Make an effort to have
    		// selects retain their value across scope changes.
    		//
    		// There is also code for something siimilar in render-token.js
    		// maybe have a look and decide on what's right
    //var value = isOption ? marker.parentNode.value : undefined ;

    		if (!isArray(array)) {
    			array = Object.entries(array).map(entryToKeyValue);
    		}

    		this.renderCount += reorderCache(node, array, sparkies, options);
    		this.renderCount += reorderNodes(marker, array, sparkies);

    		// A fudgy workaround because observe() callbacks (like this update
    		// function) are not batched to ticks.
    		// TODO: batch observe callbacks to ticks.
    //		if (isOption && value !== undefined) {
    //			marker.parentNode.value = value;
    //		}
    	},

    	renderCount: 0
    });

    function EachParent(input, node, marker, sparkies, isOption, options) {
    	this.label = 'EachParent';
    	this.input = input;
    	this.node = node;
        this.marker = marker;
        this.sparkies = sparkies;
        this.isOption = isOption;
        this.options = options;
    }

    assign$g(EachParent.prototype, {
    	fire: function render(time) {
    		var scope = this.input.shift();
    		if (!scope) { return; }

            //scope, node, marker, sparkies, isOption, options
    		const renderer = new EachChild(scope, this.node, this.marker, this.sparkies, this.isOption, this.options);

    		this.stop();
    		this.stop = observe('.', () => cue(renderer), scope);
    	},

    	stop: noop,

    	renderCount: 0
    });


    // Logic

    function createEntry(master, options) {
    	const node = master.cloneNode(true);
    	const fragment = document.createDocumentFragment();
    	fragment.appendChild(node);

    	// We treat the sparky object as a store for carrying internal data
    	// like fragment and nodes, because we can
    	const sparky = new Sparky(node, options);
    	sparky.fragment = fragment;
    	return sparky;
    }

    function reorderCache(master, array, sparkies, options) {
    	// Reorder sparkies
    	var n = -1;
    	var renderCount = 0;

    	while (++n < array.length) {
    		const object = array[n];
    		let sparky = sparkies[n];

    		if (sparky && object === sparky[$scope]) {
    			continue;
    		}

    		// Scan forward through sparkies to find the sparky that
    		// corresponds to the scope object
    		let i = n - 1;
    		while (sparkies[++i] && sparkies[i][$scope] !== object);

    		// Create a new one or splice the existing one out
    		sparky = i === sparkies.length ?
    			createEntry(master, options) :
    			sparkies.splice(i, 1)[0];

    		// Splice it into place
    		sparkies.splice(n, 0, sparky);
    	}

    	// Reordering has pushed unused sparkies to the end of
    	// sparkies collection. Go ahead and remove them.
    	while (sparkies.length > array.length) {
    		const sparky = sparkies.pop().stop();

    		// If sparky nodes are not yet in the DOM, sparky does not have a
    		// .nodes property and we may ignore it, otherwise go ahead
    		// and get rid of the nodes
    		if (sparky.nodes) {
                renderCount += sparky.nodes.length;
    			A$a.forEach.call(sparky.nodes, (node) => node.remove());
    		}
    	}

    	return renderCount;
    }

    function reorderNodes(node, array, sparkies) {
    	// Reorder nodes in the DOM
    	const l = sparkies.length;
    	const parent = node.parentNode;

    	var renderCount = 0;
    	var n = -1;

    	while (n < l) {
    		// Note that node is null where nextSibling does not exist.
    		// Passing null to insertBefore appends to the end
    		node = node ? node.nextSibling : null ;

    		while (++n < l && (!sparkies[n].nodes || sparkies[n].nodes[0] !== node)) {
    			if (!sparkies[n][$scope]) {
    				sparkies[n].push(array[n]);
    				sparkies[n][$scope] = array[n];
    			}

    			if (sparkies[n].fragment) {
    				// Cache nodes in the fragment
    				sparkies[n].nodes = Array.from(sparkies[n].fragment.childNodes);

    				// Stick fragment in the DOM
    				parent.insertBefore(sparkies[n].fragment, node);
    				sparkies[n].fragment = undefined;

    				// Increment renderCount for logging
    				++renderCount;
    			}
    			else {
    				// Reorder exising nodes
    				let i = -1;
    				while (sparkies[n].nodes[++i]) {
    					parent.insertBefore(sparkies[n].nodes[i], node);

    					// Increment renderCount for logging
    					++renderCount;
    				}
    			}
    		}

    		if (!sparkies[n]) { break; }
    		node = last(sparkies[n].nodes);
    	}

    	return renderCount;
    }

    function eachFrame(stream, node, marker, sparkies, isOption, options) {
    	const renderer = new EachParent(stream, node, marker, sparkies, isOption, options);

    	function push() {
    		cue(renderer);
    	}

    	// Support streams
    	stream
        .on(push)
        .done(function stop() {
    		renderer.stop();
    		//uncue(renderer);
    	});
    }

    function entryToKeyValue(entry) {
    	return {
    		key:   entry[0],
    		value: entry[1]
    	};
    }

    register('each', function(node, params, options) {
    	if (isFragmentNode(node)) {
    		throw new Error('Sparky.fn.each cannot be used on fragments.');
    	}

    	const sparkies = [];
    	const marker   = MarkerNode(node);
    	const isOption = tag(node) === 'option';

    	// Put the marker in place and remove the node
    	before$1(node, marker);

    	// The master node has it's fn attribute truncated to avoid setup
    	// functions being run again. Todo: This is a bit clunky - can we avoid
    	// doing this by passing in the fn string in options to the child instead
    	// of reparsing the fn attribute?
    	if (options.fn) { node.setAttribute(options.attributeFn, options.fn); }
    	else { node.removeAttribute(options.attributeFn); }

    	node.remove();

    	// Prevent further functions being run on current node
    	options.fn = '';

    	// Get the value of scopes in frames after it has changed
    	eachFrame(this.latest().dedup(), node, marker, sparkies, isOption, options);

        this.done(() => {
    		remove$2(marker);
    		sparkies.forEach((sparky) => sparky.stop());
    	});

    	// Return false to prevent further processing of this Sparky
    	return false;
    });

    register('entries', function(node, params) {
        return this.map(Object.entries);
    });

    /*
    fetch: url

    Fetches and parses a JSON file and uses it as scope to render the node.

    ```html
    <p fn="fetch:package.json">{[title]}!</p>
    ```

    ```html
    <p>Sparky!</p>
    ```

    */

    const DEBUG$9 = window.DEBUG;

    const cache$2 = {};

    function importScope(url, scopes) {
        requestGet(url)
        .then(function(data) {
            if (!data) { return; }
            cache$2[url] = data;
            scopes.push(data);
        })
        .catch(function(error) {
            console.warn('Sparky: no data found at', url);
            //throw error;
        });
    }

    register('fetch', function(node, params) {
        var path = params[0];

        if (DEBUG$9 && !path) {
            throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
        }

        var scopes = Stream$1.of();

        // Test for path template
        if (/\$\{(\w+)\}/.test(path)) {
            this.each(function(scope) {
                var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                    return scope[$1];
                });

                // If the resource is cached...
                if (cache$2[url]) {
                    scopes.push(cache$2[url]);
                }
                else {
                    importScope(url, scopes);
                }
            });

            return scopes;
        }

        // If the resource is cached, return it as a readable
        if (cache$2[path]) {
            return Stream$1.of(cache$2[path]);
        }

        importScope(path, scopes);
        return scopes;
    });

    /*
    get: path

    Maps scope to the value at `path` of the current scope:

    ```html
    <a fn="get:repository" href="{[ url ]}">{[type|capitalise]} repository</a>
    ```

    ```html
    <a href="https://github.com/cruncher/sparky.git">Git repository</a>
    ```
    */

    register('get', function(node, params) {
        return this
        .scan((stream, object) => {
            stream.stop();
            return mutations(params[0], object);
        }, nothing)
        .flat();
    });

    const DEBUG$a = window.DEBUG;

    register('on', function(node, params) {
        const type   = params[0];
        const length = params.length - 1;

        let flag = false;
        let i = -1;
        let scope;

        const listener = (e) => {
            // Cycle through params[1] to params[-1]
            i = (i + 1) % length;

            const name = params[i + 1];

            if (DEBUG$a && (!scope || !scope[name])) {
                console.error('Sparky scope', scope);
                throw new Error('Sparky scope has no method "' + name + '"');
            }

            // Buttons have value...
            scope[name](e.target.value);
        };

        return this.tap(function(object) {
            if (!flag) {
                flag = true;

                // Keep event binding out of the critical render path by
                // delaying it
                setTimeout(() => node.addEventListener(type, listener), 10);
            }

            scope = object;
        });
    });

    register('rest', function(node, params) {
        return this.map(rest$1(params[0]));
    });

    const map$2 = new WeakMap();

    function getScope(node) {
        if (!map$2.has(node.correspondingUseElement || node)) {
            throw new Error('Sparky scope is not set on node');
        }

        return map$2.get(node);
    }

    register('scope', function(node, params) {
        return this
        .tap((scope) => map$2.set(node.correspondingUseElement || node, scope))
        .done(() => map$2.delete(node));
    });

    register('take', function(node, params) {
        return this.map(take$1(params[0]));
    });

    function createArgs(e, selector) {
        const node = e.target.closest(selector);
        // Default to undefined, the stream filters out undefined
        return node ? [node, e] : undefined ;
    }

    function notDisabled(args) {
        return !args[0].disabled;
    }

    function listen$1(scopes, type, selector, fn, node) {
        var stream = events$1(type, node)
        .map((e) => createArgs(e, selector))
        // Don't listen to disabled nodes
        .filter(notDisabled)
        // Call fn(node, e)
        .each((args) => fn.apply(null, args));

        scopes.done(() => stream.stop());
    }

    function delegate$2(types, selector, fn) {
        return typeof types === 'object' ?
            function delegate(node) {
                var type;
                for (type in types) {
                    for (selector in types[type]) {
                        listen$1(this, type, selector, types[type][selector], node);
                    }
                }
            } :
            function delegate(node) {
                listen$1(this, types, selector, fn, node);
            } ;
    }

    /*
    Observe()
    */

    function createObserver$1(path, fn, scope, node) {
        return observe(path, function(value) {
            return fn(scope, value, node);
        }, scope);
    }

    function Observe(paths) {
        return function observeFn(node) {
            const unobservers = [];

            function unobserve() {
                unobservers.forEach(call);
                unobservers.length = 0;
            }

            return this
            .tap(function(scope) {
                unobserve();
                var path;
                for (path in paths) {
                    unobservers.push(createObserver$1(path, paths[path], scope, node));
                }
            })
            .done(unobserve);
        };
    }

    // Sparky

    // Sparky colour scheme
    //
    // #d0e84a
    // #b9d819 - Principal bg colour
    // #a3b31f
    // #858720
    // #d34515
    // #915133
    // #723f24
    // #6894ab
    // #4a6a7a
    // #25343c
    // #282a2b

    if (window.console && window.console.log) {
        console.log('%cSparky%c      - https://github.com/cruncher/sparky', 'color: #a3b31f; font-weight: 600;', 'color: inherit; font-weight: 300;');
    }


    /*
    <template is="sparky-template">

    First, import Sparky:

    ```js
    import '/sparky/module.js';
    ```

    Sparky registers the `is="sparky-template"` custom element. Sparky templates
    in the DOM are automatically replaced with their own rendered content:

    ```html
    <template is="sparky-template">
        Hello!
    </template>
    ```

    ```html
    Hello!
    ```

    Sparky templates extend HTML with 3 features: **template tags**, **functions**
    and **includes**.
    */


    // Register customised built-in element <template is="sparky-template">
    //
    // While loading we must wait a tick for sparky functions to register before
    // declaring the customised template element. This is a little pants, I admit.
    requestTick(function() {
        var supportsCustomBuiltIn = false;

        element('sparky-template', {
            extends: 'template',

            construct: function() {
                const fn = this.getAttribute('fn');

                if (DEBUG) { logNode(this, fn, this.getAttribute('include')); }

                if (fn) {
                    Sparky(this, { fn: fn });
                }
                else {
                    // If there is no attribute fn, there is no way for this sparky
                    // to launch as it will never get scope. Enable sparky templates
                    // with just an include by passing in blank scope.
                    Sparky(this).push({});
                }

                // Flag
                supportsCustomBuiltIn = true;
            }
        });

        // If one has not been found already, test for customised built-in element
        // support by force creating a <template is="sparky-template">
        if (!supportsCustomBuiltIn) {
            document.createElement('template', { is: 'sparky-template' });
        }

        // If still not supported, fallback to a dom query for [is="sparky-template"]
        if (!supportsCustomBuiltIn) {
            log$2("Browser does not support custom built-in elements. Doin' it oldskool selectin' stylee.");

            window.document
            .querySelectorAll('[is="sparky-template"]')
            .forEach((template) => {
                const fn = template.getAttribute('fn');

                if (fn) {
                    Sparky(template, { fn: fn });
                }
                else {
                    // If there is no attribute fn, there is no way for this sparky
                    // to launch as it will never get scope. Enable sparky templates
                    // with just an include by passing in blank scope.
                    Sparky(template).push({});
                }
            });
        }
    });

    exports.ObserveFn = Observe;
    exports.Observer = Observer;
    exports.Stream = Stream$1;
    exports.config = config$1;
    exports.cue = cue;
    exports.default = Sparky;
    exports.delegate = delegate$2;
    exports.getScope = getScope;
    exports.mount = Mount;
    exports.mountConfig = config$2;
    exports.observe = observe;
    exports.register = register;
    exports.transformers = transformers;
    exports.transforms = transforms;
    exports.uncue = uncue;

    return exports;

}({}));
