// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

// \module cxxtool.lang
//
// CxxTool language utilities.
exports.__cxxinfo__ = { public: true };

var isArray = Array.isArray;

// \function `cxxtool.lang.class(def)`
//
// Lightweight class helper:
//
// ```
// var Class = cxxtool.lang.class({
//   $construct: function() {},
//   someMember: ...
// });
// ```
function class_(def) {
  var c = def.$construct || function() {};
  var p = c.prototype;

  for (var k in def)
    if (k.charCodeAt(0) !== 36)
      p[k] = def[k];

  return c;
};
exports.class = class_;

// \function `cxxtool.lang.merge(dst, src)`
//
// Merge `src` with `dst` and return `dst`.
function merge(dst, src) {
  var signature = "cxxtool.lang.merge(dst, src)";

  if (typeof dst !== "object") throw Error(signature + ": 'dst' has to be an object");
  if (typeof src !== "object") throw Error(signature + ": 'src' has to be an object");

  for (var k in src)
    dst[k] = src[k];
  return dst;
}
exports.merge = merge;

// \function `cxxtool.lang.cloneDeep(v)`
//
// Make a deep copy of `v`, can be primitive type, array or object.
function cloneDeep(v) {
  if (!v || typeof v !== "object")
    return v;

  if (isArray(v)) {
    var arr = [];
    for (var i = 0; i < v.length; i++)
      arr.push(cloneDeep(v[i]));
    return arr;
  }
  else {
    var out = {};
    for (var k in v)
      out[k] = cloneDeep(v[k]);
    return out;
  }
}
exports.cloneDeep = cloneDeep;

// Prevent any further modifications.
Object.freeze(exports);
