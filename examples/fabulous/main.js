var most = require('most');
var list = require('most/lib/base');
var MemoryStore = require('swym/store/MemoryStore');
var LocalStorageStore = require('swym/store/LocalStorageStore');
var h = require('virtual-dom/h');
var css = require('csst');

var model = require('./model');
var view = require('./view');

var MulticastSource = require('most/lib/source/MulticastSource');
var Stream = require('most/lib/Stream');

require('./main.css');

exports.main = function() {
	var todos = LocalStorageStore.at('fabulous-todos').map(initTodos);

	var todoApp = document.getElementById('todoapp');

	var actions = controller(todoApp);
	var updates = model(actions, todos);
	updates = new Stream(new MulticastSource(updates.source));
	var todoList = view(renderTodoList, updates, document.getElementById('todo-list'));

	var state = updates.map(function(todos) {
		var array = todos.get();
		var complete = array.reduce(function(complete, todo) {
			return todo.complete ? complete + 1 : complete;
		}, 0);
		return MemoryStore.of({ complete: complete, total: array.length });
	});

	var toggleAll = view(renderCompleteAll, state, document.getElementById('toggle-all'));
	var footer = view(renderFooter, state, document.getElementById('footer'));

	var todosCount = css.withNode(css.cardinality('todos'), todoApp);
	var completedCount = css.withNode(css.cardinality('complete'), todoApp);
	var remainingCount = css.withNode(css.cardinality('remaining'), todoApp);
	var cardinality = state.tap(function(store) {
		return store.map(function(state) {
			todosCount(state.total);
			completedCount(state.complete);
			remainingCount(state.total - state.complete);
			return state;
		});
	});

	var filter = css.withNode(css.map(function(x) {
		return x.replace(/^.*#\/?/,'') || 'all';
	}), todoApp);

	var routes = most.fromEvent('hashchange', window)
		.map(function(e) {
			return e.newURL;
		})
		.startWith(location.hash)
		.tap(filter);

	most.merge(todoList, toggleAll, footer, cardinality, routes).drain();
};

function controller(el) {
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



function renderTodoList(todos) {
	return h('ul', { id: 'todo-list' }, todos.map(function(todo) {
		return h('li', {
			className: todo.complete ? 'completed' : '',
			attributes: { 'data-id': todo.id } },[
			h('div', { className: 'view'}, [
				h('input', { type: 'checkbox', className: 'toggle', checked: todo.complete }),
				h('label', [todo.description]),
				h('button', { className: 'destroy' })
			]),
			h('input', { className: 'edit', value: todo.description })
		]);
	}));
}

function renderCompleteAll(state) {
	var checked = state.total > 0 && state.total === state.complete;
	return h('input', { id: 'toggle-all', type: 'checkbox', checked: checked });
}

function renderFooter(state) {
	var remaining = (state.total - state.complete);
	return h('footer', { id: 'footer' }, [
		h('span', { id: 'todo-count' }, [
			h('strong', [''+remaining]),
			remaining === 1 ? ' item left' : ' items left'
		]),
		h('ul', { id: 'filters' }, [
			h('li', [
				h('a', { href: '#/' }, ['All']),
				h('a', { href: '#/active' }, ['Active']),
				h('a', { href: '#/completed' }, ['Completed'])
			])
		]),
		h('button', { id: 'clear-completed' }, ['Clear completed (' + state.complete + ')'])
	]);
}

function addTodo(e) {
	var description = e.target.elements.description.value;
	e.target.reset();

	return function(todos) {
		return todos.concat(Todo.create(description));
	};
}

function removeTodo(e) {
	var target = e.target;
	return function(todos) {
		return list.remove(findTodoIndex(findId(target), todos), todos);
	};
}

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

function updateCompleteAll(e) {
	var complete = e.target.checked;
	return function(todos) {
		return todos.map(function(todo) {
			return new Todo(todo.id, todo.description, complete);
		});
	}
}

function clearCompleted(todos) {
	return todos.filter(function(todo) {
		return !todo.complete;
	});
}

function initTodos(todos) {
	if(todos == null) {
		todos = [];
		for(var i=0; i<10; ++i) {
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
