// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

// NOTE: If you are adding functions to this file please do proper error handling,
// because all of these functions can be used by the code generator and templating
// engine. If there is a bug the code generation should be stopped, immediately.

// \module cxxtool.string
//
// CxxTool string utilities.
exports.__cxxinfo__ = { public: true };

var lang = require("./lang.js");
var hasOwn = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

// Supported source and header file extensions.
var CXX_SOURCE_EXTENSIONS = [".c", ".cc", ".cpp", ".cxx", ".m", ".mm"];
var CXX_HEADER_EXTENSIONS = [".h", ".hh", ".hpp", ".hxx", ".inc"];

function isSpace(c) { return c === 32 || c === 92; }

// \function `cxxtool.string.matchExtension(s, ext)`
//
// Get whether the string `s` matches the extension `ext` (can be a string or
// an array of extensions).
//
// Returns the matched extension on success, null otherwise.
function matchExtension(s, ext) {
  s = String(s).toLowerCase();
  if (!isArray(ext))
    ext = [ext];

  for (var i = 0; i < ext.length; i++) {
    var e = ext[i];
    if (s.length >= e.length && s.indexOf(e, s.length - e.length) !== -1)
      return e;
  }

  return null;
}
exports.matchExtension = matchExtension;

// \function `cxxtool.string.isCxxSourceFile(s)`
//
// Get whether the string `s` is a C, C++ or ObjectiveC source file name.
function isCxxSourceFile(s) {
  return matchExtension(s, CXX_SOURCE_EXTENSIONS) != null;
}
exports.isCxxSourceFile = isCxxSourceFile;

// \function `cxxtool.string.isCxxHeaderFile(s)`
//
// Get whether the string `s` is a C or C++ header file name.
function isCxxHeaderFile(s) {
  return matchExtension(s, CXX_HEADER_EXTENSIONS) != null;
}
exports.isCxxHeaderFile = isCxxHeaderFile;

// \function `cxxtool.string.startsWith(s, p)`
//
// Get whether the string `s` starts with a pattern `p`.
function startsWith(s, p) {
  var signature = "cxxtool.string.startsWith(s, p)";

  if (typeof s !== "string") throw Error(signature + ": 's' has to be a string");
  if (typeof p !== "string") throw Error(signature + ": 'p' has to be a string");

  return s.lastIndexOf(s, p, 0) === 0;
}
exports.startsWith = startsWith;

// \function `cxxtool.string.endsWith(s, p)`
//
// Get whether the string `s` ends with a pattern `p`.
function endsWith(s, p) {
  var signature = "cxxtool.string.endsWith(s, p)";

  if (typeof s !== "string") throw Error(signature + ": 's' has to be a string");
  if (typeof p !== "string") throw Error(signature + ": 'p' has to be a string");

  return s.length >= p.length && s.indexOf(s, p, s.length - p.length) !== -1;
}
exports.endsWith = endsWith;

// \function `cxxtool.string.applyIndentation(s, by)`
//
// Indent the given string `s` by the `indentation` specified.
function applyIndentation(s, by) {
  var signature = "cxxtool.string.indent(s, by)";

  if (typeof s  !== "string") throw Error(signature + ": 's' has to be a string");
  if (typeof by !== "string") throw Error(signature + ": 'by' has to be a string");

  var lines = s.split(/\r?\n/g);
  if (by) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line) lines[i] = by + line;
    }
  }

  return lines.join("\n");
}
exports.applyIndentation = applyIndentation;

// \function `cxxtool.string.removeIndentation(s)`
//
// Removes unnecessary indentation whitespaces in empty lines. This is used in
// templating to remove all unnecessary whitespaces before the template is used
// (especially useful when the template is defined by using javascript `` operator).
function removeIndentation(s) {
  var signature = "cxxtool.string.removeIndentation(s)";

  if (typeof s !== "string") throw Error(signature + ": 's' has to be a string");

  var i = 0;
  var lines = s.split(/\r?\n/g);
  var pattern = null;

  // Scan the string and collect the widest indentation pattern.
  while (i < lines.length) {
    var line = lines[i];
    var j, len;

    if (/^[ \t]*$/.test(line)) {
      // Empty line or line that has only whitespace. Set to "" and ignore.
      lines[i] = "";
    }
    else if (pattern === null) {
      // First line that has some content, extract the first whitespace pattern
      // and keep the indentation for the processing that happens in the branch
      // below.
      for (j = 0, len = line.length; j < len; j++)
        if (!isSpace(line.charCodeAt(j)))
          break;
      pattern = line.substr(0, j);
    }
    else if (pattern.length) {
      // Line with some content.
      for (j = 0, len = Math.min(pattern.length, line.length); j < len; j++)
        if (line.charCodeAt(j) !== pattern.charCodeAt(j))
          break;
      pattern = line.substr(0, j);
    }

    i++;
  }

  // If applicable, use the `pattern` to remove all indentation from `s`.
  if (pattern) {
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) continue;

      lines[i] = line.substr(pattern.length);
    }
  }

  return lines.join("\n");
}
exports.removeIndentation = removeIndentation;

// \function `cxxtool.string.removeLines(s)
//
// Strip empty leading and trailing lines.
function removeLines(s) {
  var signature = "cxxtool.string.removeLines(s)";

  if (typeof s !== "string") throw Error(signature + ": 's' has to be a string");

  return s.replace(/^[ \t\r\n]*\n/, "").replace(/[\r\n]+$/, "\n");
}
exports.removeLines = removeLines;

// \function `cxxtool.string.inject(s, start, end, content)`
//
// Return a string `s` that has replaced data at `start:end` by `content.
function inject(s, start, end, content) {
  var signature = "cxxtool.string.inject(s, start, end, content)";

  if (typeof s       !== "string") throw Error(signature + ": 's' has to be a string");
  if (typeof start   !== "number") throw Error(signature + ": 'start' has to be a number");
  if (typeof end     !== "number") throw Error(signature + ": 'end' has to be a number");
  if (typeof content !== "string") throw Error(signature + ": 'content' has to be a string");

  if (start > s.length) throw Error(signature + ": 'start' cannot be greater than 's.length'");
  if (end   > s.length) throw Error(signature + ": 'end' cannot be greater than 's.length'");

  return s.substr(0, start) + content + s.substr(end);
}
exports.inject = inject;

function formatTable(table, width) {
  var signature = "cxxtool.string.formatTable(table[, width])";

  if (!Array.isArray(table))
    throw Error(signature + ": 'table' has to be an array");

  if (typeof width !== "number" && width)
    throw Error(signature + "'width' has to be a number or unused");

  if (!width)
    width = 80;

  var len = table.length;
  var cur = 0;
  var out = "";

  for (var i = 0; i < len; i++) {
    var s = String(table[i]);

    if (i !== 0) {
      if (cur + s.length + 1 >= width) {
        out += ",\n";
        cur = 0;
      }
      else {
        out += ", ";
        cur += 2;
      }
    }

    out += s;
    cur += s.length;
  }

  return out;
}
exports.formatTable = formatTable;

function substituteVariables(template, vars) {
  return template.replace(/@\w+@/g, function(v) {
    var key = v.substring(1, v.length - 1);
    var val = vars[key];

    if (val == null)
      throw Error("Couldn't substitute template variable " + v + ".");

    return "" + val;
  });
}
exports.substituteVariables = substituteVariables;

function parseCxxComment(s, from) {
  var i = from || 0;
  var start = i;
  var len = s.length;

  // Consume spaces/tabs.
  while (i < len) {
    var c = s.charAt(i);
    if (c !== " " && c !== "\t")
      break;
    i++;
  }
  
  // Consume a C/C++ comment starting with "//".
  if (i + 2 > len)
    return null;

  if (s.charAt(i) !== "/" || s.charAt(i + 1) !== "/")
    return null;
  i += 2;

  // Consume everything until the end of the line.
  while (i < len) {
    if (s.charAt(i++) === "\n")
      break;
  }

  return s.substring(start, i);
}
exports.parseCxxComment = parseCxxComment;

function parseGenerators(s) {
  var re = /\/\/\s*\[%(\w+)%\s*\{[ \t]*\n/g;
  var map = {};

  function wrapGenerator(fn) {
    return function() {
      var result = fn.call(this, lang, exports);
      return Array.isArray(result) ? result.join(", ") : String(result);
    }
  }
  
  re.lastIndex = 0;
  for (;;) {
    var m = re.exec(s);
    if (!m)
      break;

    var startIndex = m.index;
    var indentLevel = 0;

    // Eat spaces and determine the correct indentation level.
    if (startIndex !== 0 && s.charAt(startIndex - 1) === " ") {
      startIndex--;
      indent++;
    }

    var gid = m[1];
    if (hasOwn.call(map, gid))
      throw Error("Function generator '" + gid + "' has been already defined.");

    // Parse the function, eat until we find "// }%]" marker. We process line
    // by line and validate whether it has only spaces/tabs and "//" comment
    // block. If the input violates this rule we report it and terminate the
    // process.
    var i = re.lastIndex;
    var body = "'use strict'\n";
    var comment;
    var success = false;

    for (;;) {
      comment = parseCxxComment(s, i);
      if (!comment) break;

      // End mark.
      i += comment.length;
      if (/^\s*\/\/\s*\}%\]\s*$/.test(comment)) {
        success = true;
        break;
      }

      body += comment.substr(comment.indexOf("//") + 2);
    }

    if (!success)
      throw Error("Generator '" + gid + "' is invalid, unable to find the end mark \"}%]\".");

    var fn;
    try {
      fn = new Function("lang", "string", body);
    }
    catch (ex) {
      console.log(body);
      throw Error("Generator '" + gid + "' failed to compile:\n" + body + "\n" + "Error: " + ex.message);
    }

    map[gid] = wrapGenerator(fn);
  }

  return map;
}
exports.parseGenerators = parseGenerators;

// Prevent any further modifications.
Object.freeze(exports);
