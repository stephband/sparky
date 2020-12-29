import Stream from '../../fn/modules/stream.js';
import { Observer } from '../../fn/modules/observer.js';
import Sparky from '../module.js';

Sparky.fn.clock = function(node, scopes, params) {
	var observable = Observer({
		time: new Date()
	});

	return Stream.fromDuration(params && params[0] || 1).map(function() {
		observable.time = new Date();
		return observable;
	});
};
