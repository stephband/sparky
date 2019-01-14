import { noop, Observable, Stream } from '../../fn/fn.js';

export default function get(node, input, params) {
    // TODO: We should be able to express this with
    // input.chain( .. Stream.observe(params[0], objet) .. )
    // but because Fn#join() doesn't know how to handle streams
    // we cant. Make it handle streams.

    var output = Stream.of();
    var stop   = noop;

    input.each(function(object) {
        stop();
        stop = object ?
            Observable(params[0], object)
            .each(output.push)
            .stop :
            noop ;
    });

    input.then(() => stop());

    return output;
}
