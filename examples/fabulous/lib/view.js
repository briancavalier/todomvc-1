var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var Promise = require('when').Promise;

module.exports = function view(render, updates, el) {
	return updates.scan(function (state, store) {
		return state.then(function(state) {
			store.map(function(data) {
				var newTree = render(data);
				if(state.tree === null) {
					var newEl = createElement(newTree);
					el.parentNode.replaceChild(newEl, el);
					state = new ViewState(newEl, newTree);
				} else {
					var patches = diff(state.tree, newTree);
					state = enqueue(runPatch, state.el, patches, newTree);
				}

				return data;
			});

			return state;
		});
	}, Promise.resolve(new ViewState(el, null)));
};

function runPatch(el, patches, newTree) {
	return new ViewState(patch(el, patches), newTree);
}

function ViewState(el, tree) {
	this.el = el;
	this.tree = tree;
}

var tasks = [];

function Task(f, x, y, z, resolve) {
	this.f = f;
	this.x = x;
	this.y = y;
	this.z = z;
	this.resolve = resolve;
}

Task.prototype.run = function() {
	var f = this.f;
	this.resolve(f(this.x, this.y, this.z));
};

function enqueue(f, x, y, z) {
	return new Promise(function(resolve) {
		if(tasks.length === 0) {
			requestAnimationFrame(runTasks);
		}
		tasks.push(new Task(f, x, y, z, resolve));
	});
}

function runTasks() {
	var q = tasks;
	tasks = [];
	for(var i=0, l=q.length; i<l; ++i) {
		q[i].run();
	}
}