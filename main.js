// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

var assert = require("assert");
var path = require("path");

var core = require("./core.js");
var lang = require("./lang.js");
var builtins = require("./builtins.js");

// Parse argv[] array to a map containing key/value pairs.
//
// Throws Error if `argv` is invalid.
function processArgv(argv, start) {
  var list = [];
  var dict = {};

  var i = start || 0;

  var key = null;
  var val = null;

  while (i < argv.length) {
    var arg = argv[i++];
    var eq = arg.indexOf("=");

    if (/^--/.test(arg)) {
      if (eq !== -1) {
        key = arg.substr(0, eq);
        val = arg.substr(eq + 1);
      }
      else {
        key = arg;
        val = null;

        while (i !== argv.length && !/^-/.test(argv[i])) {
          if (val === null)
            val = [];
          val.push(argv[i++]);
        }

        if (val === null)
          val = "true";
      }

      dict[key] = val;
    }
    else {
      list.push(arg);
    }
  }

  return {
    list: list,
    dict: dict
  };
}

// Load a configuration file specified by `p`.
function loadConfig(p) {
  if (!path.isAbsolute(p))
    p = path.join(process.cwd(), p);
  return lang.cloneDeep(require(p));
}

// Generate information that will be shown if cxxtool is invoked without any
// argument or with invalid one(s).
function generateInfo(command, options) {
  var s = "";

  s += "cxxtool v" + core.VERSION + "\n";
  s += "\n";

  s += "Usage: cxxtool <command> [...]\n";
  s += "\n";

  switch (command) {
    case "list-tools":
      s += "Tools:\n";
      for (var k in builtins) {
        var obj = builtins[k];
        if (typeof obj === "object" && typeof obj.process === "function") {
          s += "  " + k + "(" + obj.type + ")" + "\n";
        }
      }
      break;

    case "list-templates":
      s += "Templates:\n";
      for (var k in builtins) {
        var obj = builtins[k];
        if (typeof obj === "object" && typeof obj.template === "string") {
          s += "  " + k + "\n";
        }
      }
      break;

    default:
      s += "Commands:\n";
      s += "  purge          - Remove all generated code from all source files\n";
      s += "  generate       - Preprocess and sanity all source files\n";
      s += "  sanitize       - Use only sanitizer on all source files\n";
      s += "\n";
      s += "  list-tools     - Display built-in tools\n";
      s += "  list-templates - Display built-in templates\n";
      s += "\n";

      s += "Options:\n";
      s += "  --config=file  - Configuration file to use (" + options.config  + ")\n";
      s += "  --test         - Don't write changed files (" + options.test    + ")\n";
      s += "  --verbose      - Display verbose messages  (" + options.verbose + ")\n";
      s += "\n";
      break;
  }

  return s;
}

// CxxTool entry point.
function main(argv) {
  var args = processArgv(argv, 2);
  var command = (args.list.length === 1) ? args.list[0] : "";
  var options = {
    config   : args.dict["--config" ] || "cxxconfig.js",
    test     : args.dict["--test"   ] === "true",
    verbose  : args.dict["--verbose"] === "true",
    purge    : false,
    generate : false,
    sanitize : false
  };

  var showInfo = false;
  switch (command) {
    case "purge":
      options.purge = true;
      options.generate = true;
      break;

    case "generate":
      options.generate = true;
      options.sanitize = true;
      break;

    case "sanitize":
      options.sanitize = true;
      break;

    case "list-tools":
      showInfo = true;
      break;

    case "list-templates":
      showInfo = true;
      break;

    default:
      showInfo = true;
      break;
  }

  if (showInfo) {
    console.log(generateInfo(command, options));
    return 1;
  }

  var context = new core.Context(loadConfig(options.config), options);
  return context.run();
}
module.exports = main;
