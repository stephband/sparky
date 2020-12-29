
import mutations from '../../fn/modules/mutations.js';
import nothing   from '../../fn/modules/nothing.js';
import rest      from '../../fn/modules/rest.js';
import { register } from './fn.js';

register('rest', function (node, params) {
    return this
        .scan((stream, object) => {
            stream.stop();
            return mutations('.', object)
                .map(rest(params[0]));
        }, nothing)
        .flat();
});
