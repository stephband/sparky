/**
fetch: url

Fetches and parses a JSON file and uses it as scope to render the node.

```html
<p fn="fetch:package.json">{[title]}!</p>
```

```html
<p>Sparky!</p>
```

*/

import cache from '../../fn/modules/cache.js';
import Stream from '../../fn/modules/stream.js';
import { requestGet } from '../../dom/modules/request.js';
import Sparky from './sparky.js';
import { register } from './fn.js';

const DEBUG = window.DEBUG;

const request = cache((url) => requestGet(url));

function importScope(url, scopes) {
    request(url)
    .then(function(data) {
        if (!data) { return; }
        scopes.push(data);
    })
    .catch(function(error) {
        console.warn('Sparky: no data found at', url);
        //throw error;
    });
}

register('fetch', function(node, params) {
    var path = params[0];

    if (DEBUG && !path) {
        throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
    }

    var scopes = Stream.of();

    // Test for path template
    if (/\$\{(\w+)\}/.test(path)) {
        this.each(function(scope) {
            var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                return scope[$1];
            });

            importScope(url, scopes);
        });

        return scopes;
    }

    importScope(path, scopes);
    return scopes;
});
