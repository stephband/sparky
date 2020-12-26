/**
use: object

Uses `object` as scope.

```html
<p fn="context:{id:4}">{[ id ]}</a>
```

```html
<p>4</p>
```
*/

import Stream from '../../fn/modules/stream.js';
import { register } from './fn.js';

register('use', function(node, params) {
    return Stream.from(params);
});
