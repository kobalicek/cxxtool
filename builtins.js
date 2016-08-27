// CxxTool - A tool designed to maintain C, C++ and ObjectiveC projects.
"use strict";

// \module cxxtool.builtins
//
// CxxTool built-in modules and code templates.
exports.__cxxinfo__ = { public: false };

var assert = require("assert");
var string = require("./string");

var hasOwn = Object.prototype.hasOwnProperty;

// ============================================================================
// [Sanitizers]
// ============================================================================

exports.NoTabs = {
  type: "sanitizer",
  order: -9,
  process: function(ctx, data, options) {
    var spaces = ctx.config.indentSize || 2;
    return data.replace(/\t/g, " ".repeat(spaces));
  }
};

exports.NoTrailingSpaces = {
  type: "sanitizer",
  order: -8,
  process: function(ctx, data, options) {
    return data.replace(/([ \t]+)(\r?\n)/g, function(match, spaces, eol) { return eol; });
  }
};

exports.NoTrailingLines = {
  type: "sanitizer",
  order: -7,
  process: function(ctx, data, options) {
    var len = data.length;
    var eol = Number(len > 0 && data.charCodeAt(len - 1) === 10) +
              Number(len > 1 && data.charCodeAt(len - 2) === 13);
    return data.replace(/[\r\n]+$/g, "") + data.substr(len - eol);
  }
};

exports.UnixEOL = {
  type: "sanitizer",
  order: 9,
  process: function(ctx, data, options) {
    return data.replace(/\r\n/g, "\n");
  }
};

exports.WindowsEOL = {
  type: "sanitizer",
  order: 9,
  process: function(ctx, data, options) {
    return data.replace(/\r?\n/g, "\r\n");
  }
};

exports.SortIncludes = {
  type: "sanitizer",

  process: function(ctx, data, options) {
    var startPosition = -1;
    var endPosition = -1;
    var list = null;

    var directive = "#include";
    var replacement;

    var i = 0;
    var nl = true;

    while (i < data.length) {
      if (nl && data.substr(i, directive.length) === directive) {
        var iLocal = i

        if (startPosition === -1) {
          startPosition = i;
          list = [];
        }

        for (;;) {
          if (++i >= data.length) {
            list.push(data.substring(iLocal, i));
            break;
          }
          if (data.charAt(i) === '\n') {
            list.push(data.substring(iLocal, i));
            i++;
            break;
          }
        }
      }
      else if (startPosition !== -1) {
        assert(nl === true);
        endPosition = i;

        if (list.length > 1) {
          list.sort();
          replacement = list.join("\n") + "\n";

          assert(replacement.length == endPosition - startPosition);
          data = string.inject(data, startPosition, endPosition, replacement);
        }

        startPosition = -1;
        endPosition = -1;
        list = null;

        nl = false;
        i++;
      }
      else {
        nl = data.charAt(i) === '\n';
        i++;
      }
    }

    return data;
  }
};

// ============================================================================
// [Built-In Generators]
// ============================================================================

exports.ExpandTemplates = {
  type: "generator",

  process: function(ctx, data, options) {
    var re = /\/\/\s*\[@([\w]+[\{\}]?)@\][ \t]*\n/g;

    var processed = {};
    var vars = ctx.config;

    var templates = ctx.templates;
    var generators = string.parseGenerators(data);

    re.lastIndex = 0;
    for (;;) {
      var m = re.exec(data);
      if (!m)
        break;

      var startIndex = m.index;
      var indentLevel = 0;
      var tid = m[1];

      // Eat spaces and determine the correct indentation level.
      while (startIndex !== 0 && data.charAt(startIndex - 1) === " ") {
        startIndex--;
        indentLevel++;
      }

      if (tid.charAt(tid.length - 1) === "{") {
        // Find end mark if the code is already expanded.
        tid = tid.substr(0, tid.length - 1);
        var mEnd = re.exec(data);

        if (!mEnd || mEnd[1] !== tid + "}")
          throw Error("ExpandTemplates - Couldn't find end mark of template @" + tid + "{@");
      }

      var endIndex = re.lastIndex;
      var oldLength = data.length;

      var indentation = " ".repeat(indentLevel);
      var template = "";

      if (!ctx.options.purge) {
        // Get the content to be injected.
        if (hasOwn.call(templates, tid))
          template = string.substituteVariables(templates[tid].template, vars);
        else if (hasOwn.call(generators, tid))
          template = generators[tid].call(null);
        else
          throw Error("Unknown template/generator @" + tid + "@ used.");

        // Indent and put line break at the end (if not there).
        template = string.applyIndentation(template, indentation);
        if (template && template.charAt(template.length - 1) !== "\n")
          template += "\n";
      }

      data = string.inject(data, startIndex, endIndex,
        indentation + "// [@" + tid + "{@]\n" + template +
        indentation + "// [@" + tid + "}@]\n");

      re.lastIndex = endIndex + data.length - oldLength;
      processed[tid] = true;
    }

    return data;
  }
};

// ============================================================================
// [Templates - VERSION]
// ============================================================================

exports.VERSION = {
  template: `
    #define @prefix@_VERSION_MAJOR @versionMajor@
    #define @prefix@_VERSION_MINOR @versionMinor@
    #define @prefix@_VERSION_PATCH @versionPatch@
    #define @prefix@_VERSION_STRING "@versionMajor@.@versionMinor@.@versionPatch@"
  `
};

// ============================================================================
// [Templates - ARCH]
// ============================================================================

// http://sourceforge.net/p/predef/wiki/Architectures/
exports.ARCH = {
  template: `
    // \\def @prefix@_ARCH_ARM32
    // True if the target architecture is a 32-bit ARM.
    //
    // \\def @prefix@_ARCH_ARM64
    // True if the target architecture is a 64-bit ARM.
    //
    // \\def @prefix@_ARCH_X86
    // True if the target architecture is a 32-bit X86/IA32
    //
    // \\def @prefix@_ARCH_X64
    // True if the target architecture is a 64-bit X64/AMD64
    //
    // \\def @prefix@_ARCH_LE
    // True if the target architecture is little endian.
    //
    // \\def @prefix@_ARCH_BE
    // True if the target architecture is big endian.
    //
    // \\def @prefix@_ARCH_64BIT
    // True if the target architecture is 64-bit.

    #if (defined(_M_X64  ) || defined(__x86_64) || defined(__x86_64__) || \\
         defined(_M_AMD64) || defined(__amd64 ) || defined(__amd64__ ))
    # define @prefix@_ARCH_X64 1
    #else
    # define @prefix@_ARCH_X64 0
    #endif

    #if (defined(_M_IX86 ) || defined(__X86__ ) || defined(__i386  ) || \\
         defined(__IA32__) || defined(__I86__ ) || defined(__i386__) || \\
         defined(__i486__) || defined(__i586__) || defined(__i686__))
    # define @prefix@_ARCH_X86 (!@prefix@_ARCH_X64)
    #else
    # define @prefix@_ARCH_X86 0
    #endif

    #if defined(__aarch64__)
    # define @prefix@_ARCH_ARM64 1
    #else
    # define @prefix@_ARCH_ARM64 0
    #endif

    #if (defined(_M_ARM  ) || defined(__arm    ) || defined(__thumb__ ) || \\
         defined(_M_ARMT ) || defined(__arm__  ) || defined(__thumb2__))
    # define @prefix@_ARCH_ARM32 (!@prefix@_ARCH_ARM64)
    #else
    # define @prefix@_ARCH_ARM32 0
    #endif

    #define @prefix@_ARCH_LE    (  \\
            @prefix@_ARCH_X86   || \\
            @prefix@_ARCH_X64   || \\
            @prefix@_ARCH_ARM32 || \\
            @prefix@_ARCH_ARM64 )
    #define @prefix@_ARCH_BE (!(@prefix@_ARCH_LE))
    #define @prefix@_ARCH_64BIT (@prefix@_ARCH_X64 || @prefix@_ARCH_ARM64)
  `
};

exports.ARCH_UNALIGNED_RW = {
  requires: ["ARCH"],
  template: `
    // \\def @prefix@_ARCH_UNALIGNED_16
    // True if the target architecture allows unaligned 16-bit reads and writes.
    //
    // \\def @prefix@_ARCH_UNALIGNED_32
    // True if the target architecture allows unaligned 32-bit reads and writes.
    //
    // \\def @prefix@_ARCH_UNALIGNED_64
    // True if the target architecture allows unaligned 64-bit reads and writes.

    #define @prefix@_ARCH_UNALIGNED_16 (@prefix@_ARCH_X86 || @prefix@_ARCH_X64)
    #define @prefix@_ARCH_UNALIGNED_32 (@prefix@_ARCH_X86 || @prefix@_ARCH_X64)
    #define @prefix@_ARCH_UNALIGNED_64 (@prefix@_ARCH_X86 || @prefix@_ARCH_X64)
  `
};

exports.ARCH_SIMD = {
  requires: ["ARCH"],
  template: `
    // \\def @prefix@_ARCH_MMX
    // True if the current compilation unit enables MMX optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSE
    // True if the current compilation unit enables SSE optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSE2
    // True if the current compilation unit enables SSE2 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSE3
    // True if the current compilation unit enables SSE3 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSSE3
    // True if the current compilation unit enables SSSE3 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSE4_1
    // True if the current compilation unit enables SSE4.1 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_SSE4_2
    // True if the current compilation unit enables SSE4.2 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_AVX
    // True if the current compilation unit enables AVX optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_AVX2
    // True if the current compilation unit enables AVX2 optimizations (X86/X64).
    //
    // \\def @prefix@_ARCH_NEON
    // True if the current compilation unit enables NEON optimizations (ARM32/ARM64).

    #if @prefix@_ARCH_X86 || @prefix@_ARCH_X64
    # if !defined(@prefix@_ARCH_MMX) && (!@prefix@_ARCH_X64 && (defined(__MMX__) || defined(__i686__)))
    #  define @prefix@_ARCH_MMX 1
    # endif
    # if !defined(@prefix@_ARCH_SSE) && (@prefix@_ARCH_X64 || (defined(_M_IX86_FP) && _M_IX86_FP >= 1) || defined(__SSE__))
    #  define @prefix@_ARCH_SSE 1
    # endif
    # if !defined(@prefix@_ARCH_SSE2) && (@prefix@_ARCH_X64 || (defined(_M_IX86_FP) && _M_IX86_FP >= 2) || defined(__SSE2__))
    #  define @prefix@_ARCH_SSE2 1
    # endif
    # if !defined(@prefix@_ARCH_SSE3) && (defined(__SSE3__))
    #  define @prefix@_ARCH_SSE3 1
    # endif
    # if !defined(@prefix@_ARCH_SSSE3) && (defined(__SSSE3__))
    #  define @prefix@_ARCH_SSSE3 1
    # endif
    # if !defined(@prefix@_ARCH_SSE4_1) && (defined(__SSE4_1__))
    #  define @prefix@_ARCH_SSE4_1 1
    # endif
    # if !defined(@prefix@_ARCH_SSE4_2) && (defined(__SSE4_2__))
    #  define @prefix@_ARCH_SSE4_2 1
    # endif
    # if !defined(@prefix@_ARCH_AVX) && (defined(__AVX__))
    #  define @prefix@_ARCH_AVX 1
    # endif
    # if !defined(@prefix@_ARCH_AVX2) && (defined(__AVX2__))
    #  define @prefix@_ARCH_AVX2 1
    # endif
    #endif

    #if !defined(@prefix@_ARCH_AVX2)
    # define @prefix@_ARCH_AVX2 0
    #endif
    #if !defined(@prefix@_ARCH_AVX)
    # define @prefix@_ARCH_AVX @prefix@_ARCH_AVX2
    #endif
    #if !defined(@prefix@_ARCH_SSE4_2)
    # define @prefix@_ARCH_SSE4_2 @prefix@_ARCH_AVX
    #endif
    #if !defined(@prefix@_ARCH_SSE4_1)
    # define @prefix@_ARCH_SSE4_1 @prefix@_ARCH_SSE4_2
    #endif
    #if !defined(@prefix@_ARCH_SSSE3)
    # define @prefix@_ARCH_SSSE3 @prefix@_ARCH_SSE4_1
    #endif
    #if !defined(@prefix@_ARCH_SSE3)
    # define @prefix@_ARCH_SSE3 @prefix@_ARCH_SSSE3
    #endif
    #if !defined(@prefix@_ARCH_SSE2)
    # define @prefix@_ARCH_SSE2 @prefix@_ARCH_SSE3
    #endif
    #if !defined(@prefix@_ARCH_SSE)
    # define @prefix@_ARCH_SSE @prefix@_ARCH_SSE2
    #endif
    #if !defined(@prefix@_ARCH_MMX)
    # define @prefix@_ARCH_MMX 0
    #endif

    #if !defined(@prefix@_ARCH_NEON)
    # if (@prefix@_ARCH_ARM32 || @prefix@_ARCH_ARM64) && defined(__ARM_NEON__)
    #  define @prefix@_ARCH_NEON 1
    # else
    #  define @prefix@_ARCH_NEON 0
    # endif
    #endif
  `
};

exports.ARCH_SIMD_INCLUDE = {
  requires: ["ARCH", "ARCH_SIMD"],
  template: `
    #if defined(_MSC_VER) || defined(__BORLANDC__) || defined(__CODEGEARC__)
    # include <intrin.h>
    #endif

    #if @prefix@_ARCH_SSE
    # include <xmmintrin.h>
    #endif
    #if @prefix@_ARCH_SSE2
    # include <emmintrin.h>
    #endif
    #if @prefix@_ARCH_SSE3 && !defined(_MSC_VER)
    # include <pmmintrin.h>
    #endif
    #if @prefix@_ARCH_SSSE3
    # include <tmmintrin.h>
    #endif
    #if @prefix@_ARCH_SSE4_1
    # include <smmintrin.h>
    #endif
    #if @prefix@_ARCH_SSE4_2
    # include <nmmintrin.h>
    #endif
    #if @prefix@_ARCH_AVX || @prefix@_ARCH_AVX2
    # include <immintrin.h>
    #endif

    #if @prefix@_ARCH_NEON
    # include <arm_neon.h>
    #endif
  `
};

// ============================================================================
// [Templates - CC]
// ============================================================================

// BORLAND / CODEGEAR:
//   - Versions:
//     - 0x0520 C++ Builder 1
//     - 0x0530 C++ Builder 3
//     - 0x0540 C++ Builder 4
//     - 0x0550 C++ Builder 5
//     - 0x0560 C++ Builder 6
//     - 0x0570 BDS 2006
//     - 0x0590 C++ Builder 2007
//     - 0x0591 C++ Builder 2007 Update 1
//     - 0x0592 RAD Studio 2007
//     - 0x0593 RAD Studio 2007 Update 1
//     - 0x0610 C++ Builder 2009 Update 1
//     - 0x0620 C++ Builder 2010 Update 1
//     - 0x0621 C++ Builder 2010 Update 2
//     - 0x0630 C++ Builder XE
//     - 0x0631 C++ Builder XE Update 1
//     - 0x0640 C++ Builder XE2
//     - 0x0650 C++ Builder XE3
//     - 0x0660 C++ Builder XE4
//   - Features:
//     -http://docwiki.embarcadero.com/RADStudio/Seattle/en/C%2B%2B11_Features_Index
//
// CLANG:
//   - Features:
//     - http://clang.llvm.org/cxx_status.html
//
// GCC:
//   - Features:
//     - http://gcc.gnu.org/projects/cxx0x.html
//
// MSC:
//   - Versions:
//     - 1000 - Visual C++ 4
//     - 1100 - Visual C++ 5
//     - 1200 - Visual C++ 6
//     - 1300 - Visual C++ .NET
//     - 1310 - Visual C++ .NET 2003
//     - 1400 - Visual C++ 2005
//     - 1500 - Visual C++ 2008
//     - 1600 - Visual C++ 2010
//     - 1700 - Visual C++ 2012
//     - 1800 - Visual C++ 2013
//     - 1900 - Visual C++ 2015
//   - Features:
//     - http://blogs.msdn.com/b/vcblog/archive/2010/04/06/c-0x-core-language-features-in-vc10-the-table.aspx
//     - http://blogs.msdn.com/b/vcblog/archive/2011/09/12/10209291.aspx
//   - Features 2013/Nov CTP:
//     - http://blogs.msdn.com/b/vcblog/archive/2013/11/18/announcing-the-visual-c-compiler-november-2013-ctp.aspx
//
// USEFUL LINKS:
//   - http://sourceforge.net/p/predef/wiki/Compilers/
exports.CC = {
  template: `
    // \\def @prefix@_CC_CLANG
    // Non-zero if the detected C++ compiler is CLANG (contains normalized CLANG version).
    //
    // \\def @prefix@_CC_CODEGEAR
    // Non-zero if the detected C++ compiler is CODEGEAR or BORLAND (version not normalized).
    //
    // \\def @prefix@_CC_INTEL
    // Non-zero if the detected C++ compiler is INTEL (version not normalized).
    //
    // \\def @prefix@_CC_GCC
    // Non-zero if the detected C++ compiler is GCC (contains normalized GCC version).
    //
    // \\def @prefix@_CC_MSC
    // Non-zero if the detected C++ compiler is MSC (contains normalized MSC version).
    //
    // \\def @prefix@_CC_MINGW
    // Non-zero if the detected C++ compiler is MINGW32 (set to 32) or MINGW64 (set to 64).

    #define @prefix@_CC_CLANG    0
    #define @prefix@_CC_CODEGEAR 0
    #define @prefix@_CC_GCC      0
    #define @prefix@_CC_INTEL    0
    #define @prefix@_CC_MSC      0

    // Intel masquerades as GCC, so check for it first.
    #if defined(__INTEL_COMPILER)
    # undef  @prefix@_CC_INTEL
    # define @prefix@_CC_INTEL __INTEL_COMPILER
    #elif defined(__CODEGEARC__)
    # undef  @prefix@_CC_CODEGEAR
    # define @prefix@_CC_CODEGEAR (__CODEGEARC__)
    #elif defined(__BORLANDC__)
    # undef  @prefix@_CC_CODEGEAR
    # define @prefix@_CC_CODEGEAR (__BORLANDC__)
    #elif defined(__clang__) && defined(__clang_minor__)
    # undef  @prefix@_CC_CLANG
    # define @prefix@_CC_CLANG (__clang_major__ * 10000000 + __clang_minor__ * 100000 + __clang_patchlevel__)
    #elif defined(__GNUC__) && defined(__GNUC_MINOR__) && defined(__GNUC_PATCHLEVEL__)
    # undef  @prefix@_CC_GCC
    # define @prefix@_CC_GCC (__GNUC__ * 10000000 + __GNUC_MINOR__ * 100000 + __GNUC_PATCHLEVEL__)
    #elif defined(_MSC_VER) && defined(_MSC_FULL_VER)
    # undef  @prefix@_CC_MSC
    # if _MSC_VER == _MSC_FULL_VER / 10000
    #  define @prefix@_CC_MSC (_MSC_VER * 100000 + (_MSC_FULL_VER % 10000))
    # else
    #  define @prefix@_CC_MSC (_MSC_VER * 100000 + (_MSC_FULL_VER % 100000))
    # endif
    #else
    # error "[@product@] Unable to detect the C/C++ compiler."
    #endif

    #if @prefix@_CC_INTEL && (defined(__GNUC__) || defined(__clang__))
    # define @prefix@_CC_INTEL_COMPAT_MODE 1
    # else
    # define @prefix@_CC_INTEL_COMPAT_MODE 0
    #endif

    #define @prefix@_CC_CODEGEAR_EQ(x, y) (@prefix@_CC_CODEGEAR == (((x) << 8) + (y)))
    #define @prefix@_CC_CODEGEAR_GE(x, y) (@prefix@_CC_CODEGEAR >= (((x) << 8) + (y)))

    #define @prefix@_CC_CLANG_EQ(x, y, z) (@prefix@_CC_CLANG == ((x) * 10000000 + (y) * 100000 + (z)))
    #define @prefix@_CC_CLANG_GE(x, y, z) (@prefix@_CC_CLANG >= ((x) * 10000000 + (y) * 100000 + (z)))

    #define @prefix@_CC_GCC_EQ(x, y, z) (@prefix@_CC_GCC == ((x) * 10000000 + (y) * 100000 + (z)))
    #define @prefix@_CC_GCC_GE(x, y, z) (@prefix@_CC_GCC >= ((x) * 10000000 + (y) * 100000 + (z)))

    #define @prefix@_CC_INTEL_EQ(x, y) (@prefix@_CC_INTEL == (((x) * 100) + (y)))
    #define @prefix@_CC_INTEL_GE(x, y) (@prefix@_CC_INTEL >= (((x) * 100) + (y)))

    #define @prefix@_CC_MSC_EQ(x, y, z) (@prefix@_CC_MSC == ((x) * 10000000 + (y) * 100000 + (z)))
    #define @prefix@_CC_MSC_GE(x, y, z) (@prefix@_CC_MSC >= ((x) * 10000000 + (y) * 100000 + (z)))

    #if defined(__MINGW64__)
    # define @prefix@_CC_MINGW 64
    #elif defined(__MINGW32__)
    # define @prefix@_CC_MINGW 32
    #else
    # define @prefix@_CC_MINGW 0
    #endif

    #if defined(__cplusplus)
    # if __cplusplus >= 201103L
    #  define @prefix@_CC_CXX_VERSION __cplusplus
    # elif defined(__GXX_EXPERIMENTAL_CXX0X__) || \
           @prefix@_CC_MSC_GE(18, 0, 0) || \
           @prefix@_CC_INTEL_GE(14, 0)
    #  define @prefix@_CC_CXX_VERSION 201103L
    # else
    #  define @prefix@_CC_CXX_VERSION 199711L
    # endif
    #endif

    #if !defined(@prefix@_CC_CXX_VERSION)
    # define @prefix@_CC_CXX_VERSION 0
    #endif
  `
};

exports.CC_FEATURES = {
  requires: ["CC"],
  template: `
    #if @prefix@_CC_CLANG
    # define @prefix@_CC_HAS_ATTRIBUTE_ALIGNED       (__has_attribute(__aligned__))
    # define @prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE (__has_attribute(__always_inline__))
    # define @prefix@_CC_HAS_ATTRIBUTE_NOINLINE      (__has_attribute(__noinline__))
    # define @prefix@_CC_HAS_ATTRIBUTE_NORETURN      (__has_attribute(__noreturn__))
    # define @prefix@_CC_HAS_ATTRIBUTE_OPTIMIZE      (__has_attribute(__optimize__))
    # define @prefix@_CC_HAS_BUILTIN_ASSUME          (__has_builtin(__builtin_assume))
    # define @prefix@_CC_HAS_BUILTIN_ASSUME_ALIGNED  (__has_builtin(__builtin_assume_aligned))
    # define @prefix@_CC_HAS_BUILTIN_EXPECT          (__has_builtin(__builtin_expect))
    # define @prefix@_CC_HAS_BUILTIN_UNREACHABLE     (__has_builtin(__builtin_unreachable))
    # define @prefix@_CC_HAS_ALIGNAS                 (__has_extension(__cxx_alignas__))
    # define @prefix@_CC_HAS_ALIGNOF                 (__has_extension(__cxx_alignof__))
    # define @prefix@_CC_HAS_CONSTEXPR               (__has_extension(__cxx_constexpr__))
    # define @prefix@_CC_HAS_DECLTYPE                (__has_extension(__cxx_decltype__))
    # define @prefix@_CC_HAS_DEFAULT_FUNCTION        (__has_extension(__cxx_defaulted_functions__))
    # define @prefix@_CC_HAS_DELETE_FUNCTION         (__has_extension(__cxx_deleted_functions__))
    # define @prefix@_CC_HAS_FINAL                   (__has_extension(__cxx_override_control__))
    # define @prefix@_CC_HAS_INITIALIZER_LIST        (__has_extension(__cxx_generalized_initializers__))
    # define @prefix@_CC_HAS_LAMBDA                  (__has_extension(__cxx_lambdas__))
    # define @prefix@_CC_HAS_NATIVE_CHAR             (1)
    # define @prefix@_CC_HAS_NATIVE_WCHAR_T          (1)
    # define @prefix@_CC_HAS_NATIVE_CHAR16_T         (__has_extension(__cxx_unicode_literals__))
    # define @prefix@_CC_HAS_NATIVE_CHAR32_T         (__has_extension(__cxx_unicode_literals__))
    # define @prefix@_CC_HAS_NOEXCEPT                (__has_extension(__cxx_noexcept__))
    # define @prefix@_CC_HAS_NULLPTR                 (__has_extension(__cxx_nullptr__))
    # define @prefix@_CC_HAS_OVERRIDE                (__has_extension(__cxx_override_control__))
    # define @prefix@_CC_HAS_RVALUE                  (__has_extension(__cxx_rvalue_references__))
    # define @prefix@_CC_HAS_STATIC_ASSERT           (__has_extension(__cxx_static_assert__))
    # define @prefix@_CC_HAS_VARIADIC_TEMPLATES      (__has_extension(__cxx_variadic_templates__))
    #endif

    #if @prefix@_CC_CODEGEAR
    # define @prefix@_CC_HAS_DECLSPEC_ALIGN          (@prefix@_CC_CODEGEAR >= 0x0610)
    # define @prefix@_CC_HAS_DECLSPEC_FORCEINLINE    (0)
    # define @prefix@_CC_HAS_DECLSPEC_NOINLINE       (0)
    # define @prefix@_CC_HAS_DECLSPEC_NORETURN       (@prefix@_CC_CODEGEAR >= 0x0610)
    # define @prefix@_CC_HAS_ALIGNAS                 (0)
    # define @prefix@_CC_HAS_ALIGNOF                 (0)
    # define @prefix@_CC_HAS_CONSTEXPR               (0)
    # define @prefix@_CC_HAS_DECLTYPE                (@prefix@_CC_CODEGEAR >= 0x0610)
    # define @prefix@_CC_HAS_DEFAULT_FUNCTION        (0)
    # define @prefix@_CC_HAS_DELETE_FUNCTION         (0)
    # define @prefix@_CC_HAS_FINAL                   (0)
    # define @prefix@_CC_HAS_INITIALIZER_LIST        (0)
    # define @prefix@_CC_HAS_LAMBDA                  (0)
    # define @prefix@_CC_HAS_NATIVE_CHAR             (1)
    # define @prefix@_CC_HAS_NATIVE_WCHAR_T          (1)
    # define @prefix@_CC_HAS_NATIVE_CHAR16_T         (0)
    # define @prefix@_CC_HAS_NATIVE_CHAR32_T         (0)
    # define @prefix@_CC_HAS_NOEXCEPT                (0)
    # define @prefix@_CC_HAS_NULLPTR                 (0)
    # define @prefix@_CC_HAS_OVERRIDE                (0)
    # define @prefix@_CC_HAS_RVALUE                  (@prefix@_CC_CODEGEAR >= 0x0610)
    # define @prefix@_CC_HAS_STATIC_ASSERT           (@prefix@_CC_CODEGEAR >= 0x0610)
    # define @prefix@_CC_HAS_VARIADIC_TEMPLATES      (0)
    #endif

    #if @prefix@_CC_GCC
    # define @prefix@_CC_HAS_ATTRIBUTE_ALIGNED       (@prefix@_CC_GCC_GE(2, 7, 0))
    # define @prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE (@prefix@_CC_GCC_GE(4, 4, 0) && !@prefix@_CC_MINGW)
    # define @prefix@_CC_HAS_ATTRIBUTE_NOINLINE      (@prefix@_CC_GCC_GE(3, 4, 0) && !@prefix@_CC_MINGW)
    # define @prefix@_CC_HAS_ATTRIBUTE_NORETURN      (@prefix@_CC_GCC_GE(2, 5, 0))
    # define @prefix@_CC_HAS_ATTRIBUTE_OPTIMIZE      (@prefix@_CC_GCC_GE(4, 4, 0))
    # define @prefix@_CC_HAS_BUILTIN_ASSUME          (0)
    # define @prefix@_CC_HAS_BUILTIN_ASSUME_ALIGNED  (@prefix@_CC_GCC_GE(4, 7, 0))
    # define @prefix@_CC_HAS_BUILTIN_EXPECT          (1)
    # define @prefix@_CC_HAS_BUILTIN_UNREACHABLE     (@prefix@_CC_GCC_GE(4, 5, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_ALIGNAS                 (@prefix@_CC_GCC_GE(4, 8, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_ALIGNOF                 (@prefix@_CC_GCC_GE(4, 8, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_CONSTEXPR               (@prefix@_CC_GCC_GE(4, 6, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_DECLTYPE                (@prefix@_CC_GCC_GE(4, 3, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_DEFAULT_FUNCTION        (@prefix@_CC_GCC_GE(4, 4, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_DELETE_FUNCTION         (@prefix@_CC_GCC_GE(4, 4, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_FINAL                   (@prefix@_CC_GCC_GE(4, 7, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_INITIALIZER_LIST        (@prefix@_CC_GCC_GE(4, 4, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_LAMBDA                  (@prefix@_CC_GCC_GE(4, 5, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_NATIVE_CHAR             (1)
    # define @prefix@_CC_HAS_NATIVE_WCHAR_T          (1)
    # define @prefix@_CC_HAS_NATIVE_CHAR16_T         (@prefix@_CC_GCC_GE(4, 5, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_NATIVE_CHAR32_T         (@prefix@_CC_GCC_GE(4, 5, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_NOEXCEPT                (@prefix@_CC_GCC_GE(4, 6, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_NULLPTR                 (@prefix@_CC_GCC_GE(4, 6, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_OVERRIDE                (@prefix@_CC_GCC_GE(4, 7, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_RVALUE                  (@prefix@_CC_GCC_GE(4, 3, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_STATIC_ASSERT           (@prefix@_CC_GCC_GE(4, 3, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    # define @prefix@_CC_HAS_VARIADIC_TEMPLATES      (@prefix@_CC_GCC_GE(4, 3, 0) && @prefix@_CC_CXX_VERSION >= 201103L)
    #endif

    #if @prefix@_CC_INTEL
    # define @prefix@_CC_HAS_ATTRIBUTE_ALIGNED       (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_ATTRIBUTE_NOINLINE      (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_ATTRIBUTE_NORETURN      (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_ATTRIBUTE_OPTIMIZE      (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_BUILTIN_EXPECT          (@prefix@_CC_INTEL_COMPAT_MODE)
    # define @prefix@_CC_HAS_DECLSPEC_ALIGN          (@prefix@_CC_INTEL_COMPAT_MODE == 0)
    # define @prefix@_CC_HAS_DECLSPEC_FORCEINLINE    (@prefix@_CC_INTEL_COMPAT_MODE == 0)
    # define @prefix@_CC_HAS_DECLSPEC_NOINLINE       (@prefix@_CC_INTEL_COMPAT_MODE == 0)
    # define @prefix@_CC_HAS_DECLSPEC_NORETURN       (@prefix@_CC_INTEL_COMPAT_MODE == 0)
    # define @prefix@_CC_HAS_ASSUME                  (1)
    # define @prefix@_CC_HAS_ASSUME_ALIGNED          (1)
    # define @prefix@_CC_HAS_ALIGNAS                 (@prefix@_CC_INTEL >= 1500)
    # define @prefix@_CC_HAS_ALIGNOF                 (@prefix@_CC_INTEL >= 1500)
    # define @prefix@_CC_HAS_CONSTEXPR               (@prefix@_CC_INTEL >= 1400)
    # define @prefix@_CC_HAS_DECLTYPE                (@prefix@_CC_INTEL >= 1200)
    # define @prefix@_CC_HAS_DEFAULT_FUNCTION        (@prefix@_CC_INTEL >= 1200)
    # define @prefix@_CC_HAS_DELETE_FUNCTION         (@prefix@_CC_INTEL >= 1200)
    # define @prefix@_CC_HAS_FINAL                   (@prefix@_CC_INTEL >= 1400)
    # define @prefix@_CC_HAS_INITIALIZER_LIST        (@prefix@_CC_INTEL >= 1400)
    # define @prefix@_CC_HAS_LAMBDA                  (@prefix@_CC_INTEL >= 1200)
    # define @prefix@_CC_HAS_NATIVE_CHAR             (1)
    # define @prefix@_CC_HAS_NATIVE_WCHAR_T          (1)
    # define @prefix@_CC_HAS_NATIVE_CHAR16_T         (@prefix@_CC_INTEL >= 1400 || (@prefix@_CC_INTEL_COMPAT_MODE > 0 && @prefix@_CC_INTEL >= 1206))
    # define @prefix@_CC_HAS_NATIVE_CHAR32_T         (@prefix@_CC_INTEL >= 1400 || (@prefix@_CC_INTEL_COMPAT_MODE > 0 && @prefix@_CC_INTEL >= 1206))
    # define @prefix@_CC_HAS_NOEXCEPT                (@prefix@_CC_INTEL >= 1400)
    # define @prefix@_CC_HAS_NULLPTR                 (@prefix@_CC_INTEL >= 1206)
    # define @prefix@_CC_HAS_OVERRIDE                (@prefix@_CC_INTEL >= 1400)
    # define @prefix@_CC_HAS_RVALUE                  (@prefix@_CC_INTEL >= 1110)
    # define @prefix@_CC_HAS_STATIC_ASSERT           (@prefix@_CC_INTEL >= 1110)
    # define @prefix@_CC_HAS_VARIADIC_TEMPLATES      (@prefix@_CC_INTEL >= 1206)
    #endif

    #if @prefix@_CC_MSC
    # define @prefix@_CC_HAS_DECLSPEC_ALIGN          (1)
    # define @prefix@_CC_HAS_DECLSPEC_FORCEINLINE    (1)
    # define @prefix@_CC_HAS_DECLSPEC_NOINLINE       (1)
    # define @prefix@_CC_HAS_DECLSPEC_NORETURN       (1)
    # define @prefix@_CC_HAS_ASSUME                  (1)
    # define @prefix@_CC_HAS_ASSUME_ALIGNED          (0)
    # define @prefix@_CC_HAS_ALIGNAS                 (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_ALIGNOF                 (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_CONSTEXPR               (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_DECLTYPE                (@prefix@_CC_MSC_GE(16, 0, 0))
    # define @prefix@_CC_HAS_DEFAULT_FUNCTION        (@prefix@_CC_MSC_GE(18, 0, 0))
    # define @prefix@_CC_HAS_DELETE_FUNCTION         (@prefix@_CC_MSC_GE(18, 0, 0))
    # define @prefix@_CC_HAS_FINAL                   (@prefix@_CC_MSC_GE(14, 0, 0))
    # define @prefix@_CC_HAS_INITIALIZER_LIST        (@prefix@_CC_MSC_GE(18, 0, 0))
    # define @prefix@_CC_HAS_LAMBDA                  (@prefix@_CC_MSC_GE(16, 0, 0))
    # define @prefix@_CC_HAS_NATIVE_CHAR             (1)
    # if defined(_NATIVE_WCHAR_T_DEFINED)
    #  define @prefix@_CC_HAS_NATIVE_WCHAR_T         (1)
    # else
    #  define @prefix@_CC_HAS_NATIVE_WCHAR_T         (0)
    # endif
    # define @prefix@_CC_HAS_NATIVE_CHAR16_T         (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_NATIVE_CHAR32_T         (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_NOEXCEPT                (@prefix@_CC_MSC_GE(19, 0, 0))
    # define @prefix@_CC_HAS_NULLPTR                 (@prefix@_CC_MSC_GE(16, 0, 0))
    # define @prefix@_CC_HAS_OVERRIDE                (@prefix@_CC_MSC_GE(14, 0, 0))
    # define @prefix@_CC_HAS_RVALUE                  (@prefix@_CC_MSC_GE(16, 0, 0))
    # define @prefix@_CC_HAS_STATIC_ASSERT           (@prefix@_CC_MSC_GE(16, 0, 0))
    # define @prefix@_CC_HAS_VARIADIC_TEMPLATES      (@prefix@_CC_MSC_GE(18, 0, 0))
    #endif

    // Fixup some vendor specific keywords.
    #if !defined(@prefix@_CC_HAS_ASSUME)
    # define @prefix@_CC_HAS_ASSUME                  (0)
    #endif
    #if !defined(@prefix@_CC_HAS_ASSUME_ALIGNED)
    # define @prefix@_CC_HAS_ASSUME_ALIGNED          (0)
    #endif

    // Fixup compilers that don't support '__attribute__'.
    #if !defined(@prefix@_CC_HAS_ATTRIBUTE_ALIGNED)
    # define @prefix@_CC_HAS_ATTRIBUTE_ALIGNED       (0)
    #endif
    #if !defined(@prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE)
    # define @prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE (0)
    #endif
    #if !defined(@prefix@_CC_HAS_ATTRIBUTE_NOINLINE)
    # define @prefix@_CC_HAS_ATTRIBUTE_NOINLINE      (0)
    #endif
    #if !defined(@prefix@_CC_HAS_ATTRIBUTE_NORETURN)
    # define @prefix@_CC_HAS_ATTRIBUTE_NORETURN      (0)
    #endif
    #if !defined(@prefix@_CC_HAS_ATTRIBUTE_OPTIMIZE)
    # define @prefix@_CC_HAS_ATTRIBUTE_OPTIMIZE      (0)
    #endif

    // Fixup compilers that don't support '__builtin?'.
    #if !defined(@prefix@_CC_HAS_BUILTIN_ASSUME)
    # define @prefix@_CC_HAS_BUILTIN_ASSUME          (0)
    #endif
    #if !defined(@prefix@_CC_HAS_BUILTIN_ASSUME_ALIGNED)
    # define @prefix@_CC_HAS_BUILTIN_ASSUME_ALIGNED  (0)
    #endif
    #if !defined(@prefix@_CC_HAS_BUILTIN_EXPECT)
    # define @prefix@_CC_HAS_BUILTIN_EXPECT          (0)
    #endif
    #if !defined(@prefix@_CC_HAS_BUILTIN_UNREACHABLE)
    # define @prefix@_CC_HAS_BUILTIN_UNREACHABLE     (0)
    #endif

    // Fixup compilers that don't support 'declspec'.
    #if !defined(@prefix@_CC_HAS_DECLSPEC_ALIGN)
    # define @prefix@_CC_HAS_DECLSPEC_ALIGN          (0)
    #endif
    #if !defined(@prefix@_CC_HAS_DECLSPEC_FORCEINLINE)
    # define @prefix@_CC_HAS_DECLSPEC_FORCEINLINE    (0)
    #endif
    #if !defined(@prefix@_CC_HAS_DECLSPEC_NOINLINE)
    # define @prefix@_CC_HAS_DECLSPEC_NOINLINE       (0)
    #endif
    #if !defined(@prefix@_CC_HAS_DECLSPEC_NORETURN)
    # define @prefix@_CC_HAS_DECLSPEC_NORETURN       (0)
    #endif
  `
};

exports.CC_ALIGN = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_ALIGN_TYPE
    // \\def @prefix@_ALIGN_VAR
    #if @prefix@_CC_HAS_DECLSPEC_ALIGN
    # define @prefix@_ALIGN_TYPE(type, nbytes) __declspec(align(nbytes)) type
    # define @prefix@_ALIGN_VAR(type, name, nbytes) __declspec(align(nbytes)) type name
    #elif @prefix@_CC_HAS_ATTRIBUTE_ALIGNED
    # define @prefix@_ALIGN_TYPE(type, nbytes) __attribute__((__aligned__(nbytes))) type
    # define @prefix@_ALIGN_VAR(type, name, nbytes) type __attribute__((__aligned__(nbytes))) name
    #else
    # define @prefix@_ALIGN_TYPE(type, nbytes) type
    # define @prefix@_ALIGN_VAR(type, name, nbytes) type name
    #endif
  `
};

exports.CC_ALIGNAS = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_ALIGNAS(x)
    // Align a type or a variable to 'x' bytes.
    #if @prefix@_CC_HAS_ALIGNAS
    # define @prefix@_ALIGNAS(x) alignas(x)
    #elif @prefix@_CC_HAS_DECLSPEC_ALIGN
    # define @prefix@_ALIGNAS(x) __declspec(align(x))
    #elif @prefix@_CC_HAS_ATTRIBUTE_ALIGNED
    # define @prefix@_ALIGNAS(x) __attribute__((__aligned__(x)))
    #else
    # define @prefix@_ALIGNAS(x)
    #endif
  `
};

exports.CC_INLINE = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_INLINE
    // Always inline the decorated function.
    #if @prefix@_CC_HAS_ATTRIBUTE_ALWAYS_INLINE
    # define @prefix@_INLINE inline __attribute__((__always_inline__))
    #elif @prefix@_CC_HAS_DECLSPEC_FORCEINLINE
    # define @prefix@_INLINE __forceinline
    #else
    # define @prefix@_INLINE inline
    #endif
  `
};

exports.CC_NOINLINE = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_NOINLINE
    // Never inline the decorated function.
    #if @prefix@_CC_HAS_ATTRIBUTE_NOINLINE
    # define @prefix@_NOINLINE __attribute__((__noinline__))
    #elif @prefix@_CC_HAS_DECLSPEC_NOINLINE
    # define @prefix@_NOINLINE __declspec(noinline)
    #else
    # define @prefix@_NOINLINE
    #endif
  `
};

exports.CC_NORETURN = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_NORETURN
    // The decorated function never returns (exit, assertion failure, etc...).
    #if @prefix@_CC_HAS_ATTRIBUTE_NORETURN
    # define @prefix@_NORETURN __attribute__((__noreturn__))
    #elif @prefix@_CC_HAS_DECLSPEC_NORETURN
    # define @prefix@_NORETURN __declspec(noreturn)
    #else
    # define @prefix@_NORETURN
    #endif
  `
};

exports.CC_NOEXCEPT = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_NOEXCEPT
    // The decorated function never throws an exception (noexcept).
    #if @prefix@_CC_HAS_NOEXCEPT
    # define @prefix@_NOEXCEPT noexcept
    #else
    # define @prefix@_NOEXCEPT
    #endif
  `
};

exports.CC_API = {
  requires: ["CC", "OS"],
  template: `
    // \\def @prefix@_API
    // The decorated function is @product@ API and should be exported.
    #if !defined(@prefix@_API)
    # if defined(@prefix@_STATIC)
    #  define @prefix@_API
    # elif @prefix@_OS_WINDOWS
    #  if (@prefix@_CC_GCC || @prefix@_CC_CLANG) && !@prefix@_CC_MINGW
    #   if defined(@prefix@_EXPORTS)
    #    define @prefix@_API __attribute__((__dllexport__))
    #   else
    #    define @prefix@_API __attribute__((__dllimport__))
    #   endif
    #  else
    #   if defined(@prefix@_EXPORTS)
    #    define @prefix@_API __declspec(dllexport)
    #   else
    #    define @prefix@_API __declspec(dllimport)
    #   endif
    #  endif
    # else
    #  if @prefix@_CC_CLANG || @prefix@_CC_GCC_GE(4, 0, 0)
    #   define @prefix@_API __attribute__((__visibility__("default")))
    #  endif
    # endif
    #endif
  `
};

exports.CC_NOAPI = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_NOAPI
    // The decorated function is considered private and is not exported.
    #define @prefix@_NOAPI
  `
};

exports.CC_VARAPI = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_VARAPI
    // The decorated variable is part of @product@ API and is exported.
    #if !defined(@prefix@_VARAPI)
    # define @prefix@_VARAPI extern @prefix@_API
    #endif
  `
};

exports.CC_VIRTAPI = {
  requires: ["CC", "CC_API", "OS"],
  template: `
    // \\def @prefix@_VIRTAPI
    // The decorated class has a virtual table and is part of @product@ API.
    //
    // This is basically a workaround. When using MSVC and marking class as DLL
    // export everything gets exported, which is unwanted in most projects. MSVC
    // automatically exports typeinfo and vtable if at least one symbol of the
    // class is exported. However, GCC has some strange behavior that even if
    // one or more symbol is exported it doesn't export typeinfo unless the
    // class itself is decorated with "visibility(default)" (i.e. @product@_API).
    #if (@prefix@_CC_GCC || @prefix@_CC_CLANG) && !@prefix@_OS_WINDOWS
    # define @prefix@_VIRTAPI @prefix@_API
    #else
    # define @prefix@_VIRTAPI
    #endif
  `
};

exports.CC_ASSUME = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_ASSUME(exp)
    // Assume that the expression exp is always true.
    #if @prefix@_CC_HAS_ASSUME
    # define @prefix@_ASSUME(exp) __assume(exp)
    #elif @prefix@_CC_HAS_BUILTIN_ASSUME
    # define @prefix@_ASSUME(exp) __builtin_assume(exp)
    #elif @prefix@_CC_HAS_BUILTIN_UNREACHABLE
    # define @prefix@_ASSUME(exp) do { if (!(exp)) __builtin_unreachable(); } while (0)
    #else
    # define @prefix@_ASSUME(exp) ((void)0)
    #endif
  `
};

exports.CC_ASSUME_ALIGNED = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_ASSUME_ALIGNED(p, alignment)
    // Assume that the pointer 'p' is aligned to at least 'alignment' bytes.
    #if @prefix@_CC_HAS_ASSUME_ALIGNED
    # define @prefix@_ASSUME_ALIGNED(p, alignment) __assume_aligned(p, alignment)
    #elif @prefix@_CC_HAS_BUILTIN_ASSUME_ALIGNED
    # define @prefix@_ASSUME_ALIGNED(p, alignment) p = __builtin_assume_aligned(p, alignment)
    #else
    # define @prefix@_ASSUME_ALIGNED(p, alignment) ((void)0)
    #endif
  `
};

exports.CC_EXPECT = {
  requires: ["CC", "CC_FEATURES"],
  template: `
    // \\def @prefix@_LIKELY(exp)
    // Expression exp is likely to be true.
    //
    // \\def @prefix@_UNLIKELY(exp)
    // Expression exp is likely to be false.
    #if @prefix@_CC_HAS_BUILTIN_EXPECT
    # define @prefix@_LIKELY(exp) __builtin_expect(!!(exp), 1)
    # define @prefix@_UNLIKELY(exp) __builtin_expect(!!(exp), 0)
    #else
    # define @prefix@_LIKELY(exp) exp
    # define @prefix@_UNLIKELY(exp) exp
    #endif
  `
};

exports.CC_FALLTHROUGH = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_FALLTHROUGH
    // The code falls through annotation (switch / case).
    #if @prefix@_CC_CLANG && __cplusplus >= 201103L
    # define @prefix@_FALLTHROUGH [[clang::fallthrough]]
    #else
    # define @prefix@_FALLTHROUGH (void)0
    #endif
  `
};

exports.CC_UNUSED = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_UNUSED(x)
    // Mark a variable x as unused.
    #define @prefix@_UNUSED(x) (void)(x)
  `
};

exports.CC_ARRAY_SIZE = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_ARRAY_SIZE(x)
    // Get the array size of x at compile-time.
    #define @prefix@_ARRAY_SIZE(x) (sizeof(x) / sizeof(x[0]))
  `
};

exports.CC_OFFSET_OF = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_OFFSET_OF(x, y).
    // Get the offset of a member y of a struct x at compile-time.
    #define @prefix@_OFFSET_OF(x, y) ((int)(intptr_t)((const char*)&((const x*)0x1)->y) - 1)
  `
};

exports.CC_MACRO = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_MACRO_BEGIN
    // Begin of a macro.
    //
    // \\def @prefix@_MACRO_END
    // End of a macro.
    #if @prefix@_CC_GCC || @prefix@_CC_CLANG
    # define @prefix@_MACRO_BEGIN ({
    # define @prefix@_MACRO_END })
    #else
    # define @prefix@_MACRO_BEGIN do {
    # define @prefix@_MACRO_END } while (0)
    #endif
  `
};

exports.CC_NOP = {
  requires: ["CC"],
  template: `
    // \\def @prefix@_NOP
    // No operation.
    #if !defined(@prefix@_NOP)
    # define @prefix@_NOP ((void)0)
    #endif
  `
};

exports.CC_CDECL = {
  requires: ["CC", "CC_FEATURES", "ARCH"],
  template: `
    // \\def @prefix@_CDECL
    // Standard C function calling convention decorator (__cdecl).
    #if @prefix@_ARCH_X86
    # if @prefix@_CC_HAS_ATTRIBUTE
    #  define @prefix@_CDECL __attribute__((__cdecl__))
    # else
    #  define @prefix@_CDECL __cdecl
    # endif
    #else
    # define @prefix@_CDECL
    #endif
  `
};

exports.CC_STDCALL = {
  requires: ["CC", "CC_FEATURES", "ARCH"],
  template: `
    // \\def @prefix@_STDCALL
    // StdCall function calling convention decorator (__stdcall).
    #if @prefix@_ARCH_X86
    # if @prefix@_CC_HAS_ATTRIBUTE
    #  define @prefix@_STDCALL __attribute__((__stdcall__))
    # else
    #  define @prefix@_STDCALL __stdcall
    # endif
    #else
    # define @prefix@_STDCALL
    #endif
  `
};

exports.CC_FASTCALL = {
  requires: ["CC", "CC_FEATURES", "ARCH"],
  template: `
    // \\def @prefix@_FASTCALL
    // FastCall function calling convention decorator (__fastcall).
    #if @prefix@_ARCH_X86
    # if @prefix@_CC_HAS_ATTRIBUTE
    #  define @prefix@_FASTCALL __attribute__((__fastcall__))
    # else
    #  define @prefix@_FASTCALL __fastcall
    # endif
    #else
    # define @prefix@_FASTCALL
    #endif
  `
};

exports.CC_REGPARM = {
  requires: ["CC", "CC_FEATURES", "ARCH"],
  template: `
    // \\def @prefix@_REGPARM(n)
    // A custom calling convention which passes n arguments in registers.
    #if @prefix@_ARCH_X86 && (@prefix@_CC_GCC || @prefix@_CC_CLANG)
    # define @prefix@_REGPARM(n) __attribute__((__regparm__(n)))
    #else
    # define @prefix@_REGPARM(n)
    #endif
  `
};

// ============================================================================
// [Templates - OS]
// ============================================================================

// http://sourceforge.net/p/predef/wiki/OperatingSystems/
exports.OS = {
  template: `
    #if defined(_WIN32) || defined(_WINDOWS)
    #define @prefix@_OS_WINDOWS       (1)
    #else
    #define @prefix@_OS_WINDOWS       (0)
    #endif

    #if defined(__APPLE__)
    # include <TargetConditionals.h>
    # define @prefix@_OS_MAC          (TARGET_OS_MAC)
    # define @prefix@_OS_IOS          (TARGET_OS_IPHONE)
    #else
    # define @prefix@_OS_MAC          (0)
    # define @prefix@_OS_IOS          (0)
    #endif

    #if defined(__ANDROID__)
    # define @prefix@_OS_ANDROID      (1)
    #else
    # define @prefix@_OS_ANDROID      (0)
    #endif

    #if defined(__linux__) || defined(__ANDROID__)
    # define @prefix@_OS_LINUX        (1)
    #else
    # define @prefix@_OS_LINUX        (0)
    #endif

    #if defined(__DragonFly__)
    # define @prefix@_OS_DRAGONFLYBSD (1)
    #else
    # define @prefix@_OS_DRAGONFLYBSD (0)
    #endif

    #if defined(__FreeBSD__)
    # define @prefix@_OS_FREEBSD      (1)
    #else
    # define @prefix@_OS_FREEBSD      (0)
    #endif

    #if defined(__NetBSD__)
    # define @prefix@_OS_NETBSD       (1)
    #else
    # define @prefix@_OS_NETBSD       (0)
    #endif

    #if defined(__OpenBSD__)
    # define @prefix@_OS_OPENBSD      (1)
    #else
    # define @prefix@_OS_OPENBSD      (0)
    #endif

    #if defined(__QNXNTO__)
    # define @prefix@_OS_QNX          (1)
    #else
    # define @prefix@_OS_QNX          (0)
    #endif

    #if defined(__sun)
    # define @prefix@_OS_SOLARIS      (1)
    #else
    # define @prefix@_OS_SOLARIS      (0)
    #endif

    #if defined(__CYGWIN__)
    # define @prefix@_OS_CYGWIN       (1)
    #else
    # define @prefix@_OS_CYGWIN       (0)
    #endif

    #define @prefix@_OS_BSD ( \\
            @prefix@_OS_FREEBSD       || \\
            @prefix@_OS_DRAGONFLYBSD  || \\
            @prefix@_OS_NETBSD        || \\
            @prefix@_OS_OPENBSD       || \\
            @prefix@_OS_MAC)
    #define @prefix@_OS_POSIX         (!@prefix@_OS_WINDOWS)
  `
};

// ============================================================================
// [Templates - STDTYPES]
// ============================================================================

exports.STDTYPES = {
  template: `
    #if defined(__MINGW32__) || defined(__MINGW64__)
    # include <sys/types.h>
    #endif
    #if defined(_MSC_VER) && (_MSC_VER < 1600)
    # include <limits.h>
    # if !defined(@prefix@_SUPPRESS_STD_TYPES)
    #  if (_MSC_VER < 1300)
    typedef signed char      int8_t;
    typedef signed short     int16_t;
    typedef signed int       int32_t;
    typedef signed __int64   int64_t;
    typedef unsigned char    uint8_t;
    typedef unsigned short   uint16_t;
    typedef unsigned int     uint32_t;
    typedef unsigned __int64 uint64_t;
    #  else
    typedef __int8           int8_t;
    typedef __int16          int16_t;
    typedef __int32          int32_t;
    typedef __int64          int64_t;
    typedef unsigned __int8  uint8_t;
    typedef unsigned __int16 uint16_t;
    typedef unsigned __int32 uint32_t;
    typedef unsigned __int64 uint64_t;
    #  endif
    # endif
    # define @prefix@_INT64_C(x) (x##i64)
    # define @prefix@_UINT64_C(x) (x##ui64)
    #else
    # include <stdint.h>
    # include <limits.h>
    # define @prefix@_INT64_C(x) (x##ll)
    # define @prefix@_UINT64_C(x) (x##ull)
    #endif
  `
};

// ============================================================================
// [Templates - WIN32]
// ============================================================================

exports.WIN32_CRT_NO_DEPRECATE = {
  purpose: `
    Turn off CRT deprecation warnings.

    Defines _CRT_SECURE_NO_DEPRECATE and _CRT_SECURE_NO_WARNINGS if not defined.
  `,
  template: `
    #if defined(_MSC_VER) && defined(@prefix@_EXPORTS)
    # if !defined(_CRT_SECURE_NO_DEPRECATE)
    #  define _CRT_SECURE_NO_DEPRECATE
    # endif
    # if !defined(_CRT_SECURE_NO_WARNINGS)
    #  define _CRT_SECURE_NO_WARNINGS
    # endif
    #endif
  `
};

exports.WIN32_LEAN_AND_MEAN = {
  purpose: `
    Include <windows.h> with 'WIN32_LEAN_AND_MEAN' and 'NOMINMAX' macros defined.

    It cleans up itself after including <windows.h> by undefining all macros
    defined before the inclusion.
  `,
  template: `
    #if (defined(_WIN32) || defined(_WINDOWS)) && !defined(_WINDOWS_)
    # if !defined(WIN32_LEAN_AND_MEAN)
    #  define WIN32_LEAN_AND_MEAN
    #  define @prefix@_UNDEF_WIN32_LEAN_AND_MEAN
    # endif
    # if !defined(NOMINMAX)
    #  define NOMINMAX
    #  define @prefix@_UNDEF_NOMINMAX
    # endif
    # include <windows.h>
    # if defined(@prefix@_UNDEF_NOMINMAX)
    #  undef NOMINMAX
    #  undef @prefix@_UNDEF_NOMINMAX
    # endif
    # if defined(@prefix@_UNDEF_WIN32_LEAN_AND_MEAN)
    #  undef WIN32_LEAN_AND_MEAN
    #  undef @prefix@_UNDEF_WIN32_LEAN_AND_MEAN
    # endif
    #endif
  `
};
