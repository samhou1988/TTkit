#!/usr/bin/env node

var program = require('commander'),
  generate = require('./lib/generate.js');

program
  .version(require('./package.json').version)
  .usage('[options][project name]')
  .parse(process.argv);

var pname = program.args[0];

if (!pname) program.help();

generate(pname);
