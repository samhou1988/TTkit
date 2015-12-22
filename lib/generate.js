'use strict';

var Promise = require('bluebird'),
  fs = Promise.promisifyAll(require('fs-extra'));

var re = /ttkit\/lib/i;
var root = __dirname.replace(re, 'ttkit');
function generate(project) {
  return fs.copyAsync(root + '/template', project, {clobber: true})
    .then(function (err) {
      if (err) {
        return console.error(err);
      }
    });
}

module.exports = generate;
