/**
submit:

Hijacks submit events and sends a request with the current scope as the body.
The request type is the form `method`, and the url the form `action` attribute.

```html
<form fn="submit">
    ...
</form>
```
*/


import get from '../../fn/modules/get.js';
import events, { preventDefault } from '../../dom/modules/events.js';
import { request }  from '../../dom/modules/request.js';
import { register } from './functions.js';

register('submit', function(node, params) {
    var scope;

    events('submit', node)
    .filter((e) => !e.defaultPrevented)
    .tap(preventDefault)
    .map(get('target'))
    .each(function (form) {
        const method   = form.method;
        const url      = form.action || '';
        const mimetype = form.getAttribute('enctype') || 'application/json';

        request(method, url, scope, mimetype);
        //.then(function (data) {
        //    events.trigger(form, 'dom-submitted', {
        //        detail: data
        //    });
        //})
        //.catch(function (error) {
        //    events.trigger(form, 'dom-submit-error', {
        //        detail: error
        //    });
        //});
    });

    return this.tap((s) => scope = s);
});




