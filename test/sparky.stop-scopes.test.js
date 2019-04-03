import { test as group, noop, Observer } from '../../fn/module.js';
import Sparky, { functions } from '../sparky.js';

var frame = window.requestAnimationFrame;

functions['pass-through'] = function(node, stream) {
	//return stream.tap(console.log);
};

group('.stop() scopes', function(test, log, fixture) {
	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var sparky = Sparky(div).push({ property: '0' });

		frame(function() {
			equals('0', p.innerHTML);

			var model = { property: '1' };

			sparky.push(model);

			frame(function() {
				equals('1', p.innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					equals('1', p.innerHTML, 'Scope change should not cause changes after .stop()');

					Observer(model).property = '0';

					frame(function() {
						equals('1', p.innerHTML, 'Scope mutation should not cause changes after .stop()');
						done();
					});
				});
			});
		});
	}, 4);
}, function() {/*

<div>
	<p>{[property]}</p>
</div>

*/});


group('.stop() scopes to child', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var p      = fixture.querySelector('p');
		var sparky = Sparky(div).push({ property: '0' });

		frame(function() {
			equals('0', p.innerHTML);

			sparky.push({ property: '1' });

			frame(function() {
				equals('1', p.innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					equals('1', p.innerHTML);
					done();
				});
			});
		});
	}, 3);
}, function() {/*

<div>
	<p sparky-fn="pass-through">{[property]}</p>
</div>

*/});



group('.stop() scopes to templated child', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div    = fixture.querySelector('div');
		var sparky = Sparky(div).push({ property: '0' });

		frame(function() {
			var p = fixture.querySelector('p');
			equals('0', p && p.innerHTML);

			sparky.push({ property: '1' });

			frame(function() {
				var p = fixture.querySelector('p');
				equals('1', p && p.innerHTML);

				sparky
				.stop()
				.push({ property: '2' });

				frame(function() {
					var p = fixture.querySelector('p');
					equals('1', p && p.innerHTML);
					done();
				});
			});
		});
	}, 3);
}, function() {/*

<div include="#stop-test-1">
	Unrendered
</div>

<template id="stop-test-1">
	<p sparky-fn="pass-through">{[property]}</p>
</template>

*/});
