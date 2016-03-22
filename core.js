// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

// \module cxxtool.core
//
// CxxTool core classes.
exports.__cxxinfo__ = { public: true };

var io = require("./io.js");
var builtins = require("./builtins.js");
var lang = require("./lang.js");
var string = require("./string.js");
var hasOwn = Object.prototype.hasOwnProperty;

// \string `cxxtool.core.VERSION`
//
// CxxTool version information as "major.minor.patch".
var VERSION = "0.0.1";
exports.VERSION = VERSION;

// \class `cxxtool.core.Context`
//
// Processing context.
function Context(config, options) {
  this.config    = config || {};
  this.options   = options;
  this.tools     = {};
  this.templates = {};
  this.logPrefix = "";

  this._sanityConfig();
  this._initBuiltins();
}
exports.Context = lang.class({
  $construct: Context,

  _sanityConfig: function() {
    var config = this.config;

    if (typeof config.product !== "string")
      throw Error("Configuration['product']: Missing product name");

    if (!/[A-Za-z_]\w*/.test(config.product))
      throw Error("Configuration['product']: Invalid product name");

    if (typeof config.version !== "string")
      throw Error("Configuration['version']: Missing product version");

    if (!/(\d+\.)*\d+/.test(config.version))
      throw Error("Configuration['version']: Invalid product version");

    var versionParts = config.version.split(".");
    if (versionParts.length > 3)
      throw Error("Configuration['version']: Invalid product version");

    config.versionMajor = parseInt(versionParts[0]);
    config.versionMinor = parseInt(versionParts.length > 1 ? versionParts[1] : "0");
    config.versionPatch = parseInt(versionParts.length > 2 ? versionParts[2] : "0");
      
    if (!config.prefix)
      config.prefix = config.product.toUpperCase();

    if (!config.source)
      throw Error("Configuration: Missing 'Source' path");

    if (!config.exclude)
      config.exclude = [];

    if (!config.sanity)
      config.sanity = [];

    if (!config.indentSize)
      config.indentSize = 2;

    this.logPrefix = "[" + config.product.toLowerCase() + "] ";
    return this;
  },

  _initBuiltins: function() {
    for (var k in builtins) {
      var obj = builtins[k];

      if (k === "__cxxinfo__" || typeof obj !== "object")
        continue;

      if (typeof obj.process === "function") {
        this.addTool(k, obj);
        continue;
      }

      if (typeof obj.template === "string") {
        this.addTemplate(k, obj);
        continue;
      }
    }

    return this;
  },

  silly: function(msg) {
    if (this.options.verbose === true)
      this.info(msg);
  },

  info: function(msg) {
    var prefix = this.logPrefix;
    console.log(prefix + msg.replace(/\n/g, "\n" + prefix));
  },

  addTool: function(k, obj) {
    var signature = "cxxtool.core.Context.addTool(k, obj)";

    if (hasOwn.call(this.tools, k))
      throw Error(": Tool '" + k + "' already exists");

    this.tools[k] = {
      type   : obj.type,
      purpose: obj.purpose || "",
      order  : obj.order || 0,
      process: obj.process
    };

    return this;
  },

  addTemplate: function(k, obj) {
    var signature = "cxxtool.core.Context.addTemplate(k, template)";

    if (hasOwn.call(this.templates, k))
      throw Error(signature + ": Template '" + k + "' already exists");

    this.templates[k] = {
      type    : "template",
      purpose : obj.purpose || "",
      requires: lang.cloneDeep(obj.requires || []),
      template: string.removeLines(string.removeIndentation(obj.template || ""))
    };

    return this;
  },

  run: function() {
    var config = this.config;
    var options = this.options;

    this.silly("cxxtool v" + VERSION + "\n" +
               "options: " + JSON.stringify(options, null, 2) + "\n" +
               "config: " + JSON.stringify(config, null, 2));

    var files = io.listDir(config.source, config.exclude, function(fileName) {
      return string.isCxxSourceFile(fileName) || string.isCxxHeaderFile(fileName);
    }, this);

    for (var i = 0; i < files.length; i++) {
      var file = files[i];

      file.read();
      this.processFile(file);

      if (!file.isModified()) {
        this.silly(file.relName + ": Not modified");
        continue;
      }

      for (var j = 0; j < file.ops.length; j++) {
        this.info(file.relName + ": " + file.ops[j]);
      }

      if (options.test) {
        this.info(file.relName + ": Modified - test-mode (--test)");
      }
      else {
        this.info(file.relName + ": Modified - writing...");
        file.write();
      }
    }

    return 0;
  },

  processFile: function(file) {
    var config = this.config;
    var options = this.options;

    var tools = config.tools;
    for (var k in tools) {
      var toolOptions = tools[k];
      if (toolOptions === true)
        toolOptions = {};

      if (!hasOwn.call(this.tools, k))
        throw Error("cxxtool.core.Context.processFile() - Couldn't find a tool '" + k + "'.");

      var tool = this.tools[k];

      if ((tool.type === "generator" && options.generate === true) ||
          (tool.type === "sanitizer" && options.sanitize === true)) {
        file.setData(tool.process(this, file.data, toolOptions), k);
      }
    }
  }
});

// Prevent any further modifications.
Object.freeze(exports);
