
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
    var supportsCustomBuiltIn = false;

    element('sparky-template', {
        extends: 'template',

        properties: {},

        attributes: {
            src: function(src) {
                this.options.src = src;
            },

            fn: function(fn) {
                this.options.fn = fn;
            }
        },

        construct: function(elem) {
            elem.options = assign({
                mount: mountSparky
            }, config);

            // Flag
            supportsCustomBuiltIn = true;
        },

        connect: function(elem) {
            if (DEBUG) { logNode(elem, elem.options.fn, elem.options.src); }

            if (elem.options.fn) {
                setupSparky(elem, elem, elem.options);
            }
            else {
                // If there is no attribute fn, there is no way for this sparky
                // to launch as it will never get scope. Enable sparky templates
                // with just an include by passing in blank scope.
                setupSparky(elem, elem, elem.options).push({});
            }
        }
    });

    // If one has not been found already, test for customised built-in element
    // support by force creating a <template is="sparky-template">
    if (!supportsCustomBuiltIn) {
        document.createElement('template', { is: 'sparky-template' });
    }

    // If still not supported, fallback to a dom query for [is="sparky-template"]
    if (!supportsCustomBuiltIn) {
        log("Browser does not support custom built-in elements so we're doin' it oldskool selector stylee.");

        window.document
        .querySelectorAll('[is="sparky-template"]')
        .forEach((template) => {
            const fn  = template.getAttribute(config.attributeFn) || undefined;
            const src = template.getAttribute(config.attributeSrc) || undefined;

            if (fn) {
                Sparky(template, { fn: fn, src: src });
            }
            else {
                // If there is no attribute fn, there is no way for this sparky
                // to launch as it will never get scope. Enable sparky templates
                // with just an include by passing in blank scope.
                Sparky(template, { src: src }).push({});
            }
        });
    }
});
