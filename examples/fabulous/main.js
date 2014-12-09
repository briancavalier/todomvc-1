var most = require('most');
var list = require('most/lib/base');
var MemoryStore = require('swym/store/MemoryStore');
var LocalStorageStore = require('swym/store/LocalStorageStore');

var h = require('virtual-dom/h');
var css = require('csst');

var model = require('./lib/model');
var view = require('./lib/view');

require('./main.css');

exports.main = function() {
	// Container where the app will live
	var todoApp = document.getElementById('todoapp');

	// Store to hold the todos
	var todosStore = LocalStorageStore.at('fabulous-todos').map(initTodos);

	var actions = createController(todoApp);
	var updates = model(actions, todosStore);
	var todoList = view(renderTodoList, updates, document.getElementById('todo-list'));

	var stats = updates.map(getStats);

	var toggleAll = view(renderCompleteAll, stats, document.getElementById('toggle-all'));

	var footer = view(renderFooter, stats, document.getElementById('footer'));
	var cardinality = initCounts(stats, todoApp);
	var filters = initFilters(todoApp);

	most.merge(todoList, toggleAll, footer, cardinality, filters).drain();
};

/**
 * Initialize the todolist "controller".  The "controller"'s job is to listen to
 * view events, and interpret them into actions that will be taken on the model
 * @param {HTMLElement} el view element
 * @returns {Stream<Function>} stream of actions
 */
function createController(el) {
	var add = most.fromEventWhere(preventDefault, 'submit', el.querySelector('.add-todo'))
		.map(addTodo);

	var remove = most.fromEventWhere(match('.destroy'), 'click', el)
		.map(removeTodo);

	var complete = most.fromEventWhere(match('.toggle'), 'change', el)
		.map(updateComplete);

	var completeAll = most.fromEventWhere(match('#toggle-all'), 'change', el)
		.map(updateCompleteAll);

	var clear = most.fromEventWhere(match('#clear-completed'), 'click', el)
		.constant(clearCompleted);

	return most.merge(add, remove, complete, completeAll, clear);
}

/**
 * Given a list of todos, render a virtual dom todolist
 * @param {[Todo]} todos
 * @returns {VTree} virtual dom tree
 */
function renderTodoList(todos) {
	return h('ul#todo-list', todos.map(function(todo) {
		return h('li', {
			className: todo.complete ? 'completed' : '',
			attributes: { 'data-id': todo.id } },[
			h('div.view', [
				h('input.toggle', { type: 'checkbox', checked: todo.complete }),
				h('label', todo.description),
				h('button.destroy')
			]),
			h('input.edit', { value: todo.description })
		]);
	}));
}

/**
 * Action to add a todo given
 * @param e
 * @returns {Function}
 */
function addTodo(e) {
	var description = e.target.elements.description.value;
	e.target.reset();

	return function(todos) {
		return todos.concat(Todo.create(description));
	};
}

/**
 * Action to remove a todo
 * @param e
 * @returns {Function}
 */
function removeTodo(e) {
	var target = e.target;
	return function(todos) {
		return list.remove(findTodoIndex(findId(target), todos), todos);
	};
}

/**
 * Action to update the complete state of a single todo
 * @param e
 * @returns {Function}
 */
function updateComplete(e) {
	var target = e.target;
	return function(todos) {
		var index = findTodoIndex(findId(target), todos);
		if(index >= 0) {
			todos[index].complete = target.checked;
		}
		return todos;
	}
}

/**
 * Action to update the complete state of all todos
 * @param e
 * @returns {Function}
 */
function updateCompleteAll(e) {
	var complete = e.target.checked;
	return function(todos) {
		return todos.map(function(todo) {
			return new Todo(todo.id, todo.description, complete);
		});
	}
}

/**
 * Action to remove all completed todos
 * @param {[Todo]} todos
 * @returns {[Todo]}
 */
function clearCompleted(todos) {
	return todos.filter(function(todo) {
		return !todo.complete;
	});
}

/**
 * Render the "toggle all" checkbox to a virtual dom tree
 * @param {{complete: number, total: number}} state
 * @returns {VTree}
 */
function renderCompleteAll(state) {
	var checked = state.total > 0 && state.total === state.complete;
	return h('input#toggle-all', { type: 'checkbox', checked: checked });
}

/**
 * Render the footer to a virtual dom tree
 * @param {{complete: number, total: number}} state
 * @returns {VTree}
 */
function renderFooter(state) {
	var remaining = (state.total - state.complete);
	return h('footer#footer', [
		h('span#todo-count', [
			h('strong', [''+remaining]),
			remaining === 1 ? ' item left' : ' items left'
		]),
		h('ul#filters', [
			h('li', [
				h('a', { href: '#/' }, ['All']),
				h('a', { href: '#/active' }, ['Active']),
				h('a', { href: '#/completed' }, ['Completed'])
			])
		]),
		h('button#clear-completed', ['Clear completed (' + state.complete + ')'])
	]);
}

function initCounts (state, todoApp) {
	var todosCount = css.withNode(css.cardinality('todos'), todoApp);
	var completedCount = css.withNode(css.cardinality('complete'), todoApp);
	var remainingCount = css.withNode(css.cardinality('remaining'), todoApp);

	return state.tap(function (store) {
		return store.map(function (state) {
			todosCount(state.total);
			completedCount(state.complete);
			remainingCount(state.total - state.complete);
			return state;
		});
	});
}

function initFilters (todoApp) {
	var filter = css.withNode(css.map(function (x) {
		return x.replace(/^.*#\/?/, '') || 'all';
	}), todoApp);

	return most.fromEvent('hashchange', window)
		.map(function (e) { return e.newURL; })
		.startWith(location.hash)
		.tap(filter);
}

function getStats(todos) {
	var array = todos.get();
	var complete = array.reduce(function(complete, todo) {
		return todo.complete ? complete + 1 : complete;
	}, 0);
	return MemoryStore.of({ complete: complete, total: array.length });
}

function initTodos(todos) {
	if(todos == null) {
		// For fun, generate a bunch of todos
		// Set this to 5000 for real fun
		var n = 5000;
		todos = [];
		for(var i=0; i<n; ++i) {
			todos.push(Todo.create('Todo ' + i));
		}
	}
	return todos;
}

function findId(el) {
	var id;
	while(el !== null) {
		id = el.getAttribute('data-id');
		if(id) {
			return id;
		}
		el = el.parentNode;
	}
	return -1;
}

function findTodoIndex(id, todos) {
	for(var i=0, l=todos.length; i<l; ++i) {
		if(todos[i].id === id) {
			return i;
		}
	}
	return -1;
}

var id = 0;
function Todo(id, description, complete) {
	this.id = id;
	this.description = description;
	this.complete = complete;
}

Todo.create = function(description) {
	return new Todo('' + Date.now() + (++id), description, false);
};

function preventDefault(e) {
	e.preventDefault();
}

function match(query) {
	return function(e) {
		return e.target.matches(query);
	}
}
