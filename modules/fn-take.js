
import mutations from '../../fn/modules/mutations.js';
import nothing   from '../../fn/modules/nothing.js';
import take      from '../../fn/modules/take.js';
import { register } from './fn.js';

register('take', function(node, params) {
    return this
    .scan((stream, object) => {
        stream.stop();
        return mutations('.', object)
        .map(take(params[0]));
    }, nothing)
    .flat();
});
