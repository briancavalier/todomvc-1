var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');

module.exports = function view(render, updates, el) {
	return updates.scan(function (state, store) {
		store.map(function(data) {
			var newTree = render(data);
			if(state.tree === null) {
				var newEl = createElement(newTree);
				el.parentNode.replaceChild(newEl, el);
				state = { el: newEl, tree: newTree };
			} else {
				var patches = diff(state.tree, newTree);
				state = { el: patch(state.el, patches), tree: newTree };
			}

			return data;
		});
		return state;
	}, { el: el, tree: null });
};
