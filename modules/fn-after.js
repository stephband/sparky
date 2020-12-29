import getPath from '../../fn/modules/get-path.js';
import { fragmentFromHTML } from '../../dom/modules/fragments.js';
import { register } from './fn.js';

register('after', function(node, params) {
    const path = params[0];
    return this.tap((scope) => {
        // Avoid having Sparky parse the contents of documentation by waiting
        // until the next frame
        requestAnimationFrame(function () {
            const fragment = fragmentFromHTML(getPath(path, scope));
            node.after(fragment);
        });
    });
});
