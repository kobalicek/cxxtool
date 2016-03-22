CxxTool
-------

A tool written in `node.js` designed to maintain C, C++ and ObjectiveC projects.

  * [Official Repository (kobalicek/cxxtool)](https://github.com/kobalicek/cxxtool)
  * [Public Domain](https://unlicense.org/)

Disclaimer
----------

WORK-IN-PROGRESS!

This is a tool I use to manage my projects, it can change a bit, but the idea will stay the same. I don't wanna repeat the same things in every project I start or already maintain. This tool made it possible - it can auto-generate everything that is repeating, but necessary, thanks to diversity in CPU architectures, operating systems, and C/C++ compilers.

The best way to see what it really does is to check-out asmjit's [build.h](https://github.com/kobalicek/asmjit/blob/master/src/asmjit/build.h), where `cxxtool` generates more than 90% of the file.

Introduction
------------

A multi-purpose tool for C/C++ projects that allows to verify and fix coding-style issues (end-of-line settings, TABs vs. spaces, etc), to pre-generate code based on built-in templates, and to evaluate JS code and generate C++ code. This tool has been designed for developers to help with project maintenance, it's not intended to be used by people that just want to compile or use the project.

Often, when doing a cross-platform development, some tools add wrong line-engings, TABs, trailing spaces/lines, etc..., and all of it together degrades a visual quality of the project's sources. It becomes a nightmare when these issues are not resolved from the beginning and when commits start fixing line endings, TABs, etc... The `cxxtool` is not a complete solution, but running it before each commit should help to eliminate most of the issues mentioned and should enable project authors to use any editors they need, even those that cannot be configured properly, to work on the project and keep its quality at a high level.

In addition, `cxxtool` contains also templates that can be used to generate a boilerplate code that is often found in many open-source and cross-platform projects, at various places, and has various quality and C/C++ compiler coverage.

Features
--------

  * Coding-style sanitizers - check and possibly fix the following:
    * `NoTabs` - specifies that TABs are not allowed, and how many spaces per TABs should be used when replacing them
    * `NoTrailingSpaces` - specifies that no trailing spaces are allowed in source files
    * `NoTrailingLines` - specifies that there shouldn't be empty lines at the end of source files
    * `UnixEOL` and `WindowsEOL` - specifies which line ending should be used in source files
    * `SortIncludes` - specifies that all `#include` directives should be sorted alphabetically

  * Built-in template expansion (`ExpandTemplates` option must be enabled)
    * Offers to generate code that repeats in projects that are cross-platform and support multiple C/C++ compilers
    * CPU architecture detection (including byte-order, unaligned memory access, and compile-time CPU features selected)
    * Operating system detection
    * C/C++ compiler and its features detection
    * Each template is expanded according to the project settings called `@prefix@`
    * Allows to generate code through JS, suitable for generating various tables that are used by your C++ project, explained later in this document

Configuration
-------------

By default, `cxxtool` reads a file `cxxconfig.js`, which should be located at the root of your project. Alternatively a configuration file can be passed through `--config=your-config-file.js` option.

The configuration file is imported by node.js, so basically it's executed. It looks like this:

```js
module.exports = {
  // Name of your product, usually lowercase, but can be anything.
  product: "superlib",
  // Version of the product (you can use this to substitute numbers in your sources).
  version: "1.0.0",

  // Prefix used by template expansion to fit into your project.
  prefix: "SUPERLIB",

  // Where source files are located. Can be an array as well.
  source: "src/superlib",

  // Specifies which tools to enable. All tools have to be enabled explicitly.
  tools: {
    NoTabs          : true,
    NoTrailingLines : true,
    NoTrailingSpaces: true,
    UnixEOL         : true,
    SortIncludes    : true,
    ExpandTemplates : true
  }
};
```

Once the configuration is loaded the `cxxtool` will try to read all source files and verify that they are fine.

Command Line Usage and Arguments
--------------------------------

Usage:
  * `cxxtool <command> [...]`

Where command could be:
  * `purge` - Removes all generated code from all source files. After done all source files contains only markers where the code can be generated again. It's perfectly safe to `purge` and `generate` again
  * `generate` - Preprocesses and sanitizes all source files
  * `sanitize` - Does only sanitization of all source files
  * `list-tools` - Prints all built-in tools
  * `list-templates` - Prints all built-in templates

Other important options:
  * `--config=file` - Selects which configuration to use
  * `--test` - Test mode, won't overwrite files, only lists which files should be updated;
  * `--verbose` - Display verbose messages

Built-In Templates
------------------

Code-Generation
---------------

The `ExpandTemplates` tool can be also used to generate C/C++ code based on an embedded javascript. The following example shows how to generate a static table with logic implemented directly in the source file itself (the example has been taken from Blend2D's deflate decoder implementation):

```cpp
// This is a special marker recognized by `ExpandTemplates` tool. It parses
// it and stores it as a template. The JS code within must be a valid JS code.
//
// [%DEFLATE_TABLE%{
//   var table = [];
//   for (var i = 0; i < 288; i++) {
//     table.push(i <= 143 ? 8 :
//                i <= 255 ? 9 :
//                i <= 279 ? 7 : 8);
//   }
//   return string.formatTable(table, 78);
// }%]

static const uint8_t builtinDeflateTable[288] = {
  // This is again a special marker, but it doesn't define a template, but it
  // will expand it (% is a template-definition, @ is a template-use).
  // [@DEFLATE_TABLE@]
};
```

When you run `cxxtool generate` at your project's root, it should result in following:

```cpp
// This is a special marker recognized by `ExpandTemplates` tool. It parses
// it and stores it as a template. The JS code within must be a valid JS code.
//
// [%DEFLATE_TABLE%{
//   var table = [];
//   for (var i = 0; i < 288; i++) {
//     table.push(i <= 143 ? 8 :
//                i <= 255 ? 9 :
//                i <= 279 ? 7 : 8);
//   }
//   return string.formatTable(table, 78);
// }%]

static const uint8_t builtinDeflateTable[288] = {
  // This is again a special marker, but it doesn't define a template, but it
  // will expand it (% is a template-definition, @ is a template-use).
  // [@DEFLATE_TABLE{@]
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
  9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 7, 7,
  7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8,
  8, 8
  // [@DEFLATE_TABLE}@]
};
```

The `cxxtool` found `[%DEFLATE_TABLE%{...}%]` template definition (it's actually a code-generator, but it doesn't really matter here) and then found template substitution mark `[@DEFLATE_TABLE@]`, which it then expanded. Notice that it only reads comments, it won't expand anything outside comments, however, it may overwrite anything that is within start and end marks.

When you run `cxxtool purge` you will get the initial code back:

```cpp
// This is a special marker recognized by `ExpandTemplates` tool. It parses
// it and stores it as a template. The JS code within must be a valid JS code.
//
// [%DEFLATE_TABLE%{
//   var table = [];
//   for (var i = 0; i < 288; i++) {
//     table.push(i <= 143 ? 8 :
//                i <= 255 ? 9 :
//                i <= 279 ? 7 : 8);
//   }
//   return string.formatTable(table, 78);
// }%]

static const uint8_t builtinDeflateTable[288] = {
  // This is again a special marker, but it doesn't define a template, but it
  // will expand it (% is a template-definition, @ is a template-use).
  // [@DEFLATE_TABLE@]
};
```
