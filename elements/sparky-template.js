
import requestTick      from '../../fn/modules/request-tick.js';
import element          from '../../dom/modules/element.js';
import { log, logNode } from '../modules/log.js';
import config from           '../config.js';
import Sparky, { setupSparky, mountSparky } from '../modules/sparky.js';

const DEBUG = false; //window.DEBUG === true || window.DEBUG === 'sparky';
const assign = Object.assign;

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
    element('<template is="sparky-template">', {
        properties: {
            src: {
                attribute: function(src) {
                    this.options.src = src;
                },
            },

            fn: {
                attribute: function(fn) {
                    this.options.fn = fn;
                }
            }
        },

        construct: function() {
            this.options = assign({
                mount: mountSparky
            }, config);

            // Flag
            supportsCustomBuiltIn = true;
        },

        connect: function() {
            if (DEBUG) { logNode(this, this.options.fn, this.options.src); }

            if (this.options.fn) {
                setupSparky(this, this, this.options);
            }
            else {
                // If there is no attribute fn, there is no way for this sparky
                // to launch as it will never get scope. Enable sparky templates
                // with just an include by passing in blank scope.
                setupSparky(this, this, this.options).push({});
            }
        }
    });
});
