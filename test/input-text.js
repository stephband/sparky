
import { noop, Observer, test as group } from '../../fn/module.js';
import Sparky from '../module.js';

group('input[type="text"]', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('input[type="text"]', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = { property: 'boo' };

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals('boo', node.value);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals(undefined, model.property);

			node.value = 'boo';
			node.dispatchEvent(inputEvent);
			equals('boo', model.property);

			Observer(model).property = false;

			requestAnimationFrame(function() {
				equals('', node.value);
				done();
			});
		});
	});

	noop('input[type="text", value]', function(equals, done) {
		var node  = fixture.querySelector('.node-2');
		var model = {};

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals('blabla', model.property);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals('', model.property);

			done();
		});
	});
}, function() {/*

<input class="node-1" type="text" :value="{[property]}" />
<input class="node-2" type="text" :value="{[property]}" value="blabla" />

*/});
