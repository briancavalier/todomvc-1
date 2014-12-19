# Reactive programming TodoMVC Example

This is not a framework.  It's an example of putting together several interesting, independent pieces to make a reactive style TodoMVC:

* [RaveJS](https://github.com/RaveJS/rave) - Zero-configuration modular application bootstrap and development
* [most](https://github.com/cujojs/most) - Reactive streams
* [swym](https://github.com/briancavalier/swym) - Experimental data stores and differential synchronization
* [virtual-dom](https://github.com/Matt-Esch/virtual-dom) - Virtual DOM diffing and patching

## Implementation

The architecture is simple and uni-directional:

DOM -(event)-> controller -(action)-> model -(update)-> view

* A controller turns relevant DOM Events into a stream of actions (functions).
* The model applies the stream of actions to data inside a store.
* The model produces a stream representing changes to the data.
* The view renders the stream of data changes to a virtual DOM tree
* The view performs a diff with the previous virtual DOM tree and patches the real DOM.

The application uses CommonJS modules with no loader configuration.  RaveJS uses existing package manager metadata (eg `package.json`) to self-configure, and execute `exports.main` in `main.js` (also as specified in `package.json`).

NOTE: Inline todo editing is not yet implemented.

## Running

1. Clone the repo
1. `cd examples/fabulous`
1. `npm install`
1. spin up an HTTP server and visit http://localhost/.../fabulous/

## Credit

This TodoMVC application was created by [@cujojs](https://github.com/cujojs).
