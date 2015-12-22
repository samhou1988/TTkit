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
var $ = require('gulp-load-plugins')();

var paths = {
  js: './src/js/**/*.js',
  sass: './src/sass/**/*.scss',
  report: './report',
  build: './build',
  tmp: './.tmp'
};

var colors = $.util.colors;
var log = $.util.log;

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
gulp.task('help', $.taskListing);

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
 * Minify and bundle the CSS
 * @return {Stream}
 */
gulp.task('css', ['scss-lint'], function() {
  log('Bundling, minifying, and copying the app\'s CSS');

  return $.rubySass(paths.sass)
    .on('error', $.rubySass.logError)
    .pipe($.autoprefixer())
    .pipe($.header(banner, {
      pkg: pkg
    }))
    .pipe(gulp.dest('./src/css'))
    .pipe($.bytediff.start())
    .pipe($.minifyCss({}))
    .pipe($.bytediff.stop(bytediffFormatter))
    .pipe($.rename(pkg.name + '-' + pkg.version + '.min.css'))
    .pipe(gulp.dest('./.tmp/css'));
});

/**
 * Validate .scss files with scss-lint
 * @return {Stream}
 */
gulp.task('scss-lint', function() {
  return gulp.src('./src/sass/**/*.scss')
    .pipe($.cached('scsslint'))
    .pipe($.scssLint());
});

gulp.task('js', function() {
  log('Bundling, minifying, and copying the app\'s JS');

  return gulp.src('./src/**/*.js')
    .pipe($.header(banner, {
      pkg: pkg
    }))
    .pipe($.bytediff.start())
    .pipe($.uglify({}))
    .pipe($.concat('all.js'))
    .pipe($.bytediff.stop(bytediffFormatter))
    .pipe($.rename(pkg.name + '-' + pkg.version + '.min.js'))
    .pipe(gulp.dest('./.tmp/js'));
});

/**
 * creating image sprites and the corresponding stylesheets
 */
gulp.task('sprites', function() {
  return sprity.src({
      src: './src/img/icon/*.png',
      style: './src/sass/_sprite.scss',
      processor: 'sass'
    })
    .pipe($.if('*.png', gulp.dest('./build/images'), gulp.dest('./src/sass/')));
});

/**
 * use Postcss plugin
 */
gulp.task('styles', function() {
  return gulp.src('./src/css/main.css')
    .pipe($.postcss([]))
    .pipe(gulp.dest('./build/css'));
});

/**
 * start a server
 */
gulp.task('browser-sync', function() {
  var files = ['./src/**/*.*'];

  browserSync.init(files, {
    server: {
      baseDir: './src'
    }
  })
});

gulp.task('serve', function() {
  var files = ['./src/**/*.*'];

  browserSync.init(files, {
    server: {
      baseDir: './src'
    }
  })
});

/**
 * Build the Application
 */
gulp.task('build', ['html'], function() {
  gulp.src('./build/**/*')
    .pipe($.size({
      title: 'build',
      gzip: true
    }));

  var files = ['./build/**/*.*'];

  browserSync.init(files, {
    server: {
      baseDir: './build'
    }
  });
});

gulp.task('html', ['rev'], function() {
  var rev = require('./build/rev-manifest.json'),
    cssUrl = rev['css/' + pkg.name + '-' + pkg.version + '.min.css'],
    jsUrl = rev['js/' + pkg.name + '-' + pkg.version + '.min.js']

  return gulp.src('./src/index.html')
    .pipe($.htmlReplace({
      'css': cssUrl,
      'js': jsUrl
    }))
    .pipe($.minifyHtml({
      conditionals: true,
      spare: true
    }))
    .pipe(gulp.dest('./build'));
});

/**
 * Renames files for browser caching purposes
 */
gulp.task('rev', ['clean:static', 'rev:manifest', 'rev:css', 'rev:js'], function() {
  console.log('rev task running!');
});

gulp.task('clean:static', function(cb) {
  var delPaths = ['build/css/*', 'build/js/*'];
  del(delPaths, cb);
})

/**
 * rev js
 */
gulp.task('rev:js', ['js'], function() {
  return gulp.src(['./.tmp/js/*.js'])
    .pipe($.rev())
    .pipe(gulp.dest('./build/js'));
});

/**
 * rev js
 */
gulp.task('rev:css', ['css'], function() {
  return gulp.src('./.tmp/css/*.css')
    .pipe($.rev())
    .pipe(gulp.dest('./build/css'));
});

/**
 * rev manifest.json
 */
gulp.task('rev:manifest', ['js', 'css'], function() {
  return gulp.src(['./.tmp/**/*', '!./.tmp/**/*.html'])
    .pipe($.rev())
    .pipe($.rev.manifest())
    .pipe(gulp.dest('./build'));
});

/**
 * Validate .scss files with scss-lint
 * @return {Stream}
 */
gulp.task('scss-lint', function() {
  return gulp.src('./src/sass/**/*.scss')
    .pipe($.cached('scsslint'))
    .pipe($.scssLint());
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
  execute('git add -A', function(add) {
    log('execute: ' + $.util.colors.blue(add));
    execute('git commit -m "' + message + '"', function(commit) {
      log('execute: ' + $.util.colors.blue(commit));
      execute('git push origin ' + branch, function(branch) {
        log('execute: ' + $.util.colors.blue(branch));
      })
    })
  });

  function execute(command, callback) {
    log('Command is ' + $.util.colors.red(command));
    exec(command, function(err, stdout, stderr) {
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
  log('Cleaning: ' + $.util.colors.blue(paths.report));
  log('Cleaning: ' + $.util.colors.blue(paths.build));
  log('Cleaning: ' + $.util.colors.blue(paths.tmp));

  var delPaths = [paths.build, paths.report, paths.tmp];
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
    .pipe($.jshint(jshintrcFile))
    .pipe($.jshint.reporter('jshint-stylish'));
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
    .pipe($.jscs('./.jscsrc'));
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
