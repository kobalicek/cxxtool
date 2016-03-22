// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

var fs = require("fs");
var ignored = ["index.js", "main.js"];

fs.readdirSync(__dirname).forEach(function(file) {
  if (/\.js$/.test(file) && ignored.indexOf(file) === -1)
    exports[file.substr(0, file.length - 3)] = require("./" + file);
});
