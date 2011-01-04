/*

CoffeeScript syntax highlighting for Mozilla SkyWriter (former Bespin).
Author: Maurice Machado <maurice@bitbending.com>

Originally written in CoffeeScript, checkout the source at:
http://github.com/mauricemach/coffeescript-bespin

Thanks for the authors of the syntax files used as reference:

  Marc Harter <wavded@gmail.com> (gedit coffeescript syntax)
  Marc McIntyre <marchaos@gmail.com> (bespin ruby syntax)
  Scott Ellis <mail@scottellis.com.au> (bespin python syntax)

  And of course the Bespin Team <bespin@mozilla.com> for the js and python
  syntaxes, and the awesome editor itself.

MIT LICENSE:

Copyright (c) 2010 Maurice Machado <maurice@bitbending.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
"define metadata";
({
  "description": "CoffeeScript syntax highlighter",
  "dependencies": {
    "standard_syntax": "0.0.0"
  },
  "environments": {
    "worker": true
  },
  "provides": [
    {
      "ep": "syntax",
      "name": "coffee",
      "pointer": "#CoffeeScriptSyntax",
      "fileexts": ["coffee"]
    }
  ]
});
"end";
var StandardSyntax = require('standard_syntax').StandardSyntax;
exports.CoffeeScriptSyntax = new StandardSyntax({
  start: [
    {
      regex: /^(?:undefined|null|false|true|yes|no|on|off|if|else|unless|switch|when|then|and|or|in|of|by|is|isnt|not|return|break|continue|try|catch|finally|throw|for|while|until|loop|instanceof|typeof|delete|new|where|class|extends|super|this)(?![a-zA-Z0-9_])/,
      tag: 'keyword'
    }, {
      regex: /^(-|=)>/,
      tag: 'operator'
    }, {
      regex: /^\w*:/,
      tag: 'operator'
    }, {
      regex: /^[A-Z][a-zA-Z0-9_]*/,
      tag: 'identifier'
    }, {
      regex: /^\@[a-z_]*\w*(?![a-zA-Z])/,
      tag: 'identifier'
    }, {
      regex: /^\d(?![a-zA-Z])/,
      tag: 'number'
    }, {
      regex: /^\/.*\/g?i?m?s?/,
      tag: 'number'
    }, {
      regex: /^'''/,
      tag: 'string',
      then: 'q3string'
    }, {
      regex: /^"""/,
      tag: 'string',
      then: 'q4string'
    }, {
      regex: /^'/,
      tag: 'string',
      then: 'qstring'
    }, {
      regex: /^"/,
      tag: 'string',
      then: 'q2string'
    }, {
      regex: /^`/,
      tag: 'directive',
      then: 'literal'
    }, {
      regex: /^###/,
      tag: 'comment',
      then: 'multiline_comment'
    }, {
      regex: /^#.*/,
      tag: 'comment'
    }, {
      regex: /^(::|:|>=|<=|>|<|!=|!|\?=|\?|!=|=|==|\-=|\+=|\-\-|\+\+|\-|\+|\/|\*|\.\.\.|\.\.)/,
      tag: 'operator'
    }, {
      regex: /^[A-Za-z_][A-Za-z0-9_]*/,
      tag: 'plain'
    }, {
      regex: /^[^@\?'"\/ \tA-Za-z0-9_]+/,
      tag: 'plain'
    }, {
      regex: /^./,
      tag: 'plain'
    }
  ],
  multiline_comment: [
    {
      regex: /^###/,
      tag: 'comment',
      then: 'start'
    }, {
      regex: /^./,
      tag: 'comment'
    }
  ],
  literal: [
    {
      regex: /^[^\\]?`/,
      tag: 'directive',
      then: 'start'
    }, {
      regex: /^./,
      tag: 'directive'
    }
  ],
  qstring: [
    {
      regex: /^[^\\]?'/,
      tag: 'string',
      then: 'start'
    }, {
      regex: /^./,
      tag: 'string'
    }
  ],
  q2string: [
    {
      regex: /^[^\\]?"/,
      tag: 'string',
      then: 'start'
    }, {
      regex: /^\#\{.*?\}/,
      tag: 'operator'
    }, {
      regex: /^./,
      tag: 'string'
    }
  ],
  q3string: [
    {
      regex: /^'''/,
      tag: 'string',
      then: 'start'
    }, {
      regex: /^./,
      tag: 'string'
    }
  ],
  q4string: [
    {
      regex: /^"""/,
      tag: 'string',
      then: 'start'
    }, {
      regex: /^\#\{.*?\}/,
      tag: 'operator'
    }, {
      regex: /^./,
      tag: 'string'
    }
  ]
});