// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

// \module cxxtool.io
//
// CxxTool io utilities.
exports.__cxxinfo__ = { public: false };

var fs = require("fs");
var path = require("path");
var lang = require("./lang.js");

// \function `cxxtool.io.readFile(fileName)`
//
// Read the text file `fileName` from the file-system and return its content
// converted from UTF-8 encoding.
function readFile(fileName) {
  return fs.readFileSync(fileName, "UTF-8");
}
exports.readFile = readFile;

// \function `cxxtool.io.writeFile(fileName, data)`
//
// Write the text file `fileName` to the file-system converted to UTF-8.
function writeFile(fileName, data) {
  return fs.writeFileSync(fileName, data, "UTF-8");
}
exports.writeFile = writeFile;

// \function `cxxtool.io.listDir(dirName)`
//
// Recursive directory listing. Returns an array containing `File` objects.
function listDir(dirName, exclude, filter, scope) {
  return listDirPrivate([], dirName, "", exclude, filter, scope);
}
exports.listDir = listDir;

function listDirPrivate(dst, dirName, relDir, exclude, filter, scope) {
  var files = fs.readdirSync(dirName);
  var array = [];

  for (var i = 0; i < files.length; i++) {
    var baseName = files[i];

    var fileName = path.normalize(path.join(dirName, baseName));
    var relName = relDir ? relDir + "/" + baseName : baseName;

    if (exclude.indexOf(relName) !== -1)
      continue;

    var stat = fs.lstatSync(fileName);
    if (stat.isSymbolicLink())
      continue;

    if (stat.isDirectory()) {
      array = listDirPrivate(array,
        path.join(dirName, baseName), relName, exclude, filter, scope);
      continue;
    }

    if (stat.isFile()) {
      if (filter.call(scope, baseName))
        dst.push(new File(fileName, relName));
      continue;
    }
  }

  return dst.concat(array);
}

// \class File
//
// A file information, content, and processing helpers.
function File(fileName, relName) {
  this.fileName = fileName;
  this.relName = relName || fileName;

  this.orig = null;
  this.data = null;

  this.ops = [];
}
exports.File = lang.class({
  $construct: File,

  isLoaded: function() { return this.data !== null; },
  isModified: function() { return this.data !== this.orig; },

  read: function() {
    this.orig = readFile(this.fileName);
    this.data = this.orig;
    return this;
  },

  write: function() {
    writeFile(this.fileName, this.data);
    return this;
  },

  setData: function(newData, comment) {
    if (this.data !== newData) {
      this.data = newData;
      this.ops.push(comment)
    }
    return this;
  }
});

// Prevent any further modifications.
Object.freeze(exports);
