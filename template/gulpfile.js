'use strict';

var gulp = require('gulp');
var del = require('del');
var glob = require('glob');
var karma = require('karma').server;
var merge = require('merge-stream');
var plato = require('plato');
var argv = require('yargs').argv;
var exec = require('child_process').exec;
var browserSync = require('browser-sync');
var sprity = require('sprity');
var plug = require('gulp-load-plugins')();

var paths = {
  js: './src/js/**/*.js',
  sass: './src/sass/**/*.scss',
  report: './report',
  build: './build'
};

var colors = plug.util.colors;
var log = plug.util.log;

var pkg = require('./package.json');
pkg.date = formatCurrentDate();
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @author <%= pkg.author %>',
  ' * @date <%= pkg.date %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n');

/**
 * List the available gulp tasks
 */
gulp.task('help', plug.taskListing);

/**
 * Lint the code, create coverage report, and a visualizer
 * @return {Stream}
 */
gulp.task('analyze', function() {
  log('Analyzing source with JSHint, JSCS, and Plato');

  var jshint = analyzejshint([paths.js]);
  var jscs = analyzejscs([paths.js]);

  startPlatoVisualizer();

  return merge(jshint, jscs);
});

/**
 * Minify and bundle the app's JavaScript
 * @return {Stream}
 */
gulp.task('js', function() {
  log('Bundling, minifying, and copying the app\'s JavaScript');

  return gulp.src(paths.js)
    .pipe(plug.sourcemaps.init())
    .pipe(plug.bytediff.start())
    .pipe(plug.uglify({}))
    .pipe(plug.bytediff.stop(bytediffFormatter))
    .pipe(plug.sourcemaps.write('.'))
    .pipe(plug.rename(function(file) {
      if (file.extname === '.js') {
        file.basename += '.min';
      }
    }))
    .pipe(gulp.dest(paths.build));
});

/**
 * Minify and bundle the CSS
 * @return {Stream}
 */
gulp.task('css', ['scss-lint'], function() {
  log('Bundling, minifying, and copying the app\'s CSS');

  return plug.rubySass(paths.sass)
    .on('error', plug.rubySass.logError)
    .pipe(plug.autoprefixer())
    .pipe(plug.header(banner, {
      pkg: pkg
    }))
    .pipe(gulp.dest('./src/css'))
    .pipe(plug.livereload())
    .pipe(plug.bytediff.start())
    .pipe(plug.minifyCss({}))
    .pipe(plug.bytediff.stop(bytediffFormatter))
    .pipe(plug.rename(pkg.name + '-' + pkg.version + '.min.css'))
    .pipe(gulp.dest(paths.build));
});

/**
 * creating image sprites and the corresponding stylesheets
 */
gulp.task('sprites', function () {
  return sprity.src({
    src: './src/img/icon/*.png',
    style: './src/sass/_sprite.scss',
    processor: 'sass'
  })
  .pipe(gulp.dest('./build/img'));
});

/**
 * use Postcss plugin
 */
gulp.task('styles', function () {
  return gulp.src('./src/css/main.css')
    .pipe(plug.postcss([]))
    .pipe(gulp.dest('./build/css'));
});

/**
 * start a server
 */
gulp.task('browser-sync', function () {
  var files = ['./src/**/*.*'];

  browserSync.init(files, {
    server: {
      baseDir: './src'
    }
  })
})

/**
 * Validate .scss files with scss-lint
 * @return {Stream}
 */
gulp.task('scss-lint', function() {
  return gulp.src('./src/sass/**/*.scss')
    .pipe(plug.cached('scsslint'))
    .pipe(plug.scssLint());
});

/**
 * Watch the files changed
 */
gulp.task('watch', function() {
  gulp.watch('./src/sass/**/*.scss', ['scss-lint']);
});

/**
 * Add/Commit/Push files to remote git
 */
gulp.task('git', function() {
  var message = argv.m,
    branch = argv.branch || 'master';
  execute('git add -A', function (add) {
    log('execute: ' + plug.util.colors.blue(add));
    execute('git commit -m "' + message + '"', function (commit) {
      log('execute: ' + plug.util.colors.blue(commit));
      execute('git push origin ' + branch, function (branch) {
        log('execute: ' + plug.util.colors.blue(branch));
      })
    })
  });

  function execute(command, callback) {
    log('Command is ' + plug.util.colors.red(command));
    exec(command, function (err, stdout, stderr) {
      if (err) {
        throw err;
      }

      callback(stdout);
    });
  }
});

/**
 * Build js and css
 */
gulp.task('default', ['js', 'css'], function() {
  log('Analyze, Build CSS and JS');
});



/**
 * Remove all files from the build folder
 * One way to run clean before all tasks is to run
 * from the cmd line: gulp clean && gulp build
 * @return {Stream}
 */
gulp.task('clean', function(cb) {
  log('Cleaning: ' + plug.util.colors.blue(paths.report));
  log('Cleaning: ' + plug.util.colors.blue(paths.build));

  var delPaths = [paths.build, paths.report];
  del(delPaths, cb);
});

/**
 * Run specs once and exit
 * To start servers and run midway specs as well:
 *    gulp test --startServers
 * @return {Stream}
 */
gulp.task('test', function(done) {
  startTests(true, done);
});

////////////////

/**
 * Execute JSHint on given source files
 * @param  {Array} sources
 * @param  {String} overrideRcFile
 * @return {Stream}
 */
function analyzejshint(sources, overrideRcFile) {
  var jshintrcFile = overrideRcFile || './.jshintrc';
  log('Running JSHint');
  return gulp
    .src(sources)
    .pipe(plug.jshint(jshintrcFile))
    .pipe(plug.jshint.reporter('jshint-stylish'));
}

/**
 * Execute JSCS on given source files
 * @param  {Array} sources
 * @return {Stream}
 */
function analyzejscs(sources) {
  log('Running JSCS');
  return gulp
    .src(sources)
    .pipe(plug.jscs('./.jscsrc'));
}

/**
 * Start Plato inspector and visualizer
 */
function startPlatoVisualizer() {
  log('Running Plato');

  var files = glob.sync('build/**/*.js');

  var options = {
    title: 'Plato Inspections Report'
  };
  var outputDir = './report/plato';

  plato.inspect(files, outputDir, options, platoCompleted);

  function platoCompleted(report) {
    var overview = plato.getOverviewReport(report);
    log(overview.summary);
  }
}

/**
 * Start the tests using karma.
 * @param  {boolean} singleRun - True means run once and end (CI), or keep running (dev)
 * @param  {Function} done - Callback to fire when karma is done
 * @return {undefined}
 */
function startTests(singleRun, done) {
  karma.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: !!singleRun
  }, karmaCompleted);

  ////////////////

  function karmaCompleted() {
    done();
  }
}

/**
 * Formatter for bytediff to display the size changes after processing
 * @param  {Object} data - byte data
 * @return {String}      Difference in bytes, formatted
 */
function bytediffFormatter(data) {
  var difference = (data.savings > 0) ? ' smaller.' : ' larger.';
  return data.fileName + ' went from ' +
    (data.startSize / 1000).toFixed(2) + ' kB to ' + (data.endSize / 1000).toFixed(2) + ' kB' +
    ' and is ' + formatPercent(1 - data.percent, 2) + '%' + difference;
}

/**
 * Format a number as a percentage
 * @param  {Number} num       Number to format as a percent
 * @param  {Number} precision Precision of the decimal
 * @return {Number}           Formatted perentage
 */
function formatPercent(num, precision) {
  return (num * 100).toFixed(precision);
}

/**
 * Format a current date
 * @return {String}       Formatted current date
 */
function formatCurrentDate() {
  var date = new Date(),
    year = date.getFullYear(),
    month = date.getMonth() + 1,
    day = date.getDate(),
    hour = date.getHours(),
    minute = date.getMinutes(),
    second = date.getSeconds();

  return year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
}
