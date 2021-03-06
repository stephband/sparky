import { Observer, observe }  from '../../fn/modules/observer.js';
import Stream   from '../../fn/modules/stream.js';
import capture  from '../../fn/modules/capture.js';
import nothing  from '../../fn/modules/nothing.js';

import { before } from '../../dom/modules/mutate.js';
import create   from '../../dom/modules/create.js';
import tag from '../../dom/modules/tag.js';
import { fragmentFromChildren } from '../../dom/modules/fragments.js';
import { isFragmentNode } from '../../dom/modules/node.js';


import importTemplate from './import-template.js';
import { parseParams, parseText } from './parse.js';
import config from '../config.js';
import { functions } from './fn.js';
import Mount, { assignTransform } from './mount.js';
import toText from './to-text.js';
import { logNode, nodeToString } from './log.js';

// Register base set of Sparky functions
import './fn-after.js';
import './fn-before.js';
import './fn-append.js';
import './fn-prepend.js';
import './fn-debug.js';
import './fn-each.js';
import './fn-entries.js';
import './fn-fetch.js';
import './fn-get.js';
import './fn-on.js';
import './fn-rest.js';
import './fn-scope.js';
import './fn-take.js';
import './fn-use.js';


const DEBUG = window.DEBUG === true || window.DEBUG === 'Sparky';

const assign = Object.assign;

const captureFn = capture(/^\s*([\w-]+)\s*(:)?/, {
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

function replace(target, content) {
    before(target, content);
    //target.before(content);
    target.remove();
}

function prepareInput(input, output) {
    // Support promises and streams P
    const stream = output.then ?
        new Stream(function(push, stop) {
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

function run(context, node, input, options) {
    var result;

    while(input && options.fn && (result = captureFn({}, options.fn))) {
        // Find Sparky function by name, looking in global functions
        // first, then local options. This order makes it impossible to
        // overwrite built-in fns.
        const fn = functions[result.name] || (options.functions && options.functions[result.name]);

        if (!fn) {
            if (DEBUG) { console.groupEnd(); }
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
            assign(options, fn.settings);
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
    // Launch rendering
    return new Mount(content, options);
}

function setupTarget(src, input, render, options, renderers) {
    // If there are no dynamic tokens to render, return the include
    if (!src) {
        throw new Error('Sparky attribute src cannot be empty');
    }

    const tokens = parseText([], src);

    // If there are no dynamic tokens to render, return the include
    if (!tokens) {
        return setupSrc(src, input, render, options, renderers);
    }

    // Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

    let output  = nothing;
    let prevSrc = null;

    function update(scope) {
        const values = tokens.map(valueOf);

        // Tokens in the src tag MUST evaluate in order that a template
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

        // If src is empty string render nothing
        if (!src) {
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            output = nothing;
            return;
        }

        // Push scope to the template renderer
        output = Stream.of(scope);
        setupSrc(src, output, render, options, renderers);
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
    });
}

function setupSrc(src, input, firstRender, options, renderers) {
    // If src is a hashref
    if (src[0] === '#') {
        const source  = document.getElementById(src.slice(1));
        const content = source.content ?
            source.content.cloneNode(true) :
            source instanceof SVGElement ?
                source.cloneNode(true) :
                undefined ;
        return setupInclude(content, input, firstRender, options, renderers);
    }

    importTemplate(src)
    .then((node) => {
        if (input.status === 'done') { return; }

        const content =
            // Support templates
            node.content ? node.content.cloneNode(true) :
            // Support SVG elements
            node instanceof SVGElement ? node.cloneNode(true) :
            // Support body elements imported from external documents
            fragmentFromChildren(node) ;

        setupInclude(content, input, firstRender, options, renderers);
    })
    // Swallow errors – unfound templates should not stop the rendering of
    // the rest of the tree – but log them to the console as errors.
    .catch((error) => {
        console.error(error.stack);
    });
}

function setupInclude(content, input, firstRender, options, renderers) {
    var renderer;

    input.each((scope) => {
        if (renderer) {
            return renderer.push(scope);
        }

        renderer = isFragmentNode(content) ?
            mountContent(content, options) :
            new Sparky(content, options) ;

        renderer.push(scope);
        firstRender(content);

        // This is async, but we also need to stop sync...
        //input.done(() => renderer.stop());
        renderers.push(renderer);
    });
}

function setupElement(target, input, options, sparky, renderers) {
    var renderer;

    input.each((scope) => {
        if (renderer) {
            return renderer.push(scope);
        }

        renderer = mountContent(target.content || target, options);
        renderer.push(scope);

        // If target is a template, replace it
        if (target.content) {
            replace(target, target.content);

            // Increment mutations for logging
            ++sparky.renderCount;
        }

        // This is async, but we also need to stop sync...
        //input.done(() => renderer.stop());
        renderers.push(renderer);
    });
}

function setupTemplate(target, src, input, options, sparky, renderers) {
    const nodes = { 0: target };

    return setupTarget(src, input, (content) => {
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
            assign(nodes, content.childNodes);
        }

        // Otherwise content is a placemarker text node
        else {
            content = nodes[0] = target.content ?
                DEBUG ?
                    create('comment', ' src="' + src + '" ') :
                    create('text', '') :
                target ;
        }

        // Replace child 0, which we avoided doing above to keep it as a
        // position marker in the DOM for exactly this reason...
        replace(node0, content);

        // Update count for logging
        ++sparky.renderCount;
    }, options, renderers);
}

function setupSVG(target, src, input, options, sparky, renderers) {
    return setupTarget(src, input, (content) => {
        content.removeAttribute('id');

        replace(target, content);
        target = content;

        // Increment mutations for logging
        ++sparky.renderCount;
    }, options, renderers);
}

function makeLabel(target, options) {
    return '<'
        + (target.tagName ? target.tagName.toLowerCase() : '')
        + (options.fn ? ' fn="' + options.fn + '">' : '>');
}

function invokeStop(renderer) {
    renderer.stop();
}

/**
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



/**
src=""

Templates may include other templates. Define the `src` attribute
as an href to a template:

```html
<template id="i-am-title">
    I am {[title]}.
</template>

<template is="sparky-template" fn="fetch:package.json" src="#i-am-title"></template>

I am Sparky.
```

Templates may be composed of includes:

```html
<template id="i-am-title">
    I am {[title]}.
</template>

<template is="sparky-template" fn="fetch:package.json">
    <template src="#i-am-title"></template>
    <template src="#i-am-title"></template>
</template>

I am Sparky.
I am Sparky.
```
*/

export function setupSparky(sparky, target, options) {
    const input = Stream.of().map(toObserverOrSelf);
    const output = run(null, target, input, options);

    sparky.push = function push() {
        input.push(arguments[arguments.length - 1]);
        return this;
    };

    // If output is false do not go on to parse and mount content,
    // a fn is signalling that it will take over. fn="each" does this,
    // for example, replacing the original node and Sparky with duplicates.
    if (!output) {
        sparky.stop = function () {
            input.stop();
            return this;
        };

        return sparky;
    }

    const renderers = [];
    const name = tag(target) || 'fragment';
    const src = options.src || (
        name === 'use' ?      target.getAttribute(options.attributeSrc) :
        name === 'template' ? target.getAttribute(options.attributeSrc) :
        null
    );

    // We have consumed fn and src lets make sure they are not read again...
    // Todo: This shouldn't be needed if we program properly
    options.fn  = null;
    options.src = null;

    //if (DEBUG) { logNode(target, options.fn, options.src); }

    src ?
        name === 'use' ?
            setupSVG(target, src, output, options, sparky, renderers) :
            setupTemplate(target, src, output, options, sparky, renderers) :
        name === 'fragment' ?
            setupElement(target, output, options, sparky, renderers) :
            setupElement(target, output, options, sparky, renderers) ;

    sparky.stop = function () {
        input.stop();

        // Renderers need to be stopped sync, or they allow one more frame
        // to render before stopping
        renderers.forEach(invokeStop);
        renderers.length = 0;

        return this;
    };

    output.done(stop);

    return sparky;
}

export function mountSparky(node, options) {
    // Does the node have Sparkyfiable attributes?
    if (!(options.fn = node.getAttribute(options.attributeFn))
        && !(
            tag(node) === 'template' &&
            (options.src = node.getAttribute(options.attributeSrc)))
        && !(
            tag(node) === 'use' &&
            (options.src = node.getAttribute(options.attributeSrc)))
    ) {
        return;
    }

    // Return a writeable stream. A writeable stream
    // must have the methods .push() and .stop().
    // A Sparky() is a write stream.
    var sparky = setupSparky({
        label: makeLabel(node, options),
        renderCount: 0
    }, node, options);

    // Options object is still used by the mounter, reset it
    options.fn  = null;
    options.src = null;

    return sparky;
}

export default function Sparky(selector, settings) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, settings);
    }

    const target = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const options = assign({ mount: mountSparky }, config, settings);

    options.fn = options.fn
        // Fragments and shadows have no getAttribute
        || (target.getAttribute && target.getAttribute(options.attributeFn))
        || '';

    this.label = makeLabel(target, options);
    this.renderCount = 0;

    setupSparky(this, target, options);
}
