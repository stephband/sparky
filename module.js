
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
    console.log('%cSparky%c      - https://stephen.band/sparky', 'color: #a3b31f; font-weight: 600;', 'color: inherit; font-weight: 300;');
}

import { cue, uncue } from './modules/timer.js';
import config from './config.js';
import Sparky from './modules/sparky.js';

import fn from './modules/fn.js';
import pipe from './modules/pipe.js';

Sparky.fn = fn;
Sparky.pipe = pipe;

// Export API
export default Sparky;
export { config, cue, uncue };
export { default as mount } from './modules/mount.js';
export { getScope } from './modules/fn-scope.js';
export { transforms, transformers, register as registerTransform } from './modules/transforms.js';
export { register } from './modules/fn.js';
export { default as delegate } from './modules/delegate.js';
export { default as ObserveFn } from './modules/fn-observe.js';

// TODO: Remove
import './elements/sparky-template.js'
