////Todo: Get the notifier working with sass/hint errors
//
//Dependencies
var gulp = require('gulp');
//var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
//var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var del = require('del');
var htmlmin = require('gulp-htmlmin');
var uglify = require('gulp-uglify');
var notifier = require('terminal-notifier');
var livereload = require('gulp-livereload');
var beep = require('beepbeep')
var spawn = require('child_process').spawn;
var mainBowerFiles = require('main-bower-files');
var templateCache = require('gulp-angular-templatecache');
var flatten = require('gulp-flatten');
//var coffee = require('gulp-coffee');
var gutil = require('gulp-util');
var imagemin = require('gulp-imagemin');
var nodemon = require('gulp-nodemon');
var fs = require('fs');
var newy = require('gulp-newy');

//todo: debounce watchers (like when copying a folder)

//Capture JsHint errors. Rather dirty, easier than writing my own javascript checker
//var oldLog = gutil.log;
//gutil.log = function () {
//if (arguments.length && arguments[0].indexOf('js: line') >= 0) {
//    notifier("JSHint failed, check terminal", {title: "Oops!"});
//    beep();
//}
//oldLog.apply(console, arguments);
//};

//Auction worker task -> run with gulp worker
//gulp.task('worker', function () {
//    fs.readFile('.env', 'utf8', function (err, data) {
//        var env = {};
//        var lines = data.split("\n");
//        for (var i = 0; i < lines.length; i++) {
//            var line = lines[i];
//            var equalsLocation = line.indexOf('=');
//            env[line.substr(0, equalsLocation).trim()] = line.substr(equalsLocation + 1).trim();
//        }
//
//        nodemon({
//            script: 'src/server/auctionworker.js',
//            ext: 'js coffee',
//            env: env,
//            ignore: ['dist/**/*', 'src/server/web.js', 'src/public/*', 'gulpfile.js']
//        });
//    });
//});

//Node server, which in turn handles livereload + webserver
var serverProcess;
gulp.task('server', function() {


    //Read environment variables
    fs.readFile('.env', 'utf8', function(err, data) {
        var env = Object.create(process.env); //Clone existing env variables
        var lines = data.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var equalsLocation = line.indexOf('=');
            env[line.substr(0, equalsLocation).trim()] = line.substr(equalsLocation + 1).trim();
        }


        nodemon({
            script: './src/server/server.js',
            ext: 'js',
            // env: env,
            ignore: ['dist/**/*', 'src/public/*', 'gulpfile.js'],
            watch: ['src/server/*']
        });
    });

});

//Migrations
gulp.task('migrations', function() {


    //Read environment variables
    fs.readFile('.env', 'utf8', function(err, data) {
        var env = Object.create(process.env); //Clone existing env variables
        var lines = data.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var equalsLocation = line.indexOf('=');
            env[line.substr(0, equalsLocation).trim()] = line.substr(equalsLocation + 1).trim();
        }

        //Todo: for heroku projects, replace this with heroku's run thingamajig. $ heroku run, i believe
        serverProcess = spawn('node', ['src/server/migrations.js'], {
                stdio: 'inherit',
                env: env
            })
            //.on('close', function (code) {
            //    if (code === 8 || code === 1) {
            //        notifier("Node error " + code + ", check terminal", {title: "Error"});
            //        beep();
            //    }
            //});
    });

});

// Watch for changes
gulp.task('watch', ['build'], function() {

    //Coffee files in server = recompile + restart server
    //gulp.watch("src/server/**/*.coffee", ['compileserver']);

    //JS files in server OR .env = restart server
    // gulp.watch(["src/server/**/*.js", '.env'], ['server']);

    //CSS
    gulp.watch(["src/public/css/**/*.scss", "src/public/css/*.scss"], ["styles"]);

    //Images + Fonts
    gulp.watch("src/public/img/**/*", ["images"]);
    gulp.watch("src/public/fonts/**/*", ["fonts"]);

    //Libraries
    gulp.watch("bower_components/**/*.js", ["libraries"]);

    //JS
    //gulp.watch("src/public/script/**/*.coffee", ["scripts"]);
    gulp.watch("src/public/js/**/*.js", ["scripts"]);

    //HTML
    gulp.watch("src/public/index.html", ["html"]);

    //Templates
    gulp.watch("src/public/templates/**/*.html", ["buildtemplates"]);

    //Livereload
    livereload.listen({});
    gulp.watch("dist/public/**/*").on('change', function(file) {
        livereload.changed(file.path);
    });

});

//Compile styles
gulp.task('styles', function() {
    gutil.log("Compiling styles..");
    //del.sync("www/css"); //Seems to throw some errors here and there.. Todo: Look into this

    //Prepare globbing, so we can use the newly compiled file with all the imports
    //Disabled because it seems to take some time..
    //gulp.src('src/public/style/main.scss')
    //.pipe(cssGlobbing({extensions: ['.css', '.scss']}))
    //.pipe(rename('main.globbed.scss'))
    //.pipe(gulp.dest('src/public/style'));

    var sassPaths = [
        'bower_components/material-design-lite/src'
    ];

    //gulp.src('src/public/css/main.globbed.scss')
    gulp.src('src/public/css/main.scss')
        .pipe(rename('main.css'))
        .pipe(sourcemaps.init())
        .pipe(sass({
            includePaths: sassPaths,
            outputStyle: 'compressed' //expanded / compressed
        }).on('error', function() {
            sass.logError.apply(this, arguments);
            notifier("Sass error, check terminal", {
                title: "Error"
            });
            beep();
        }))
        .pipe(autoprefixer({})) //see https://github.com/postcss/autoprefixer#options
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/public/css'));
});

//Build libraries
gulp.task('libraries', function() {
    gutil.log("Compiling libraries..");

    gulp.src(mainBowerFiles({
            filter: /(.*)\.js/,
            paths: {
                bowerDirectory: 'bower_components',
                bowerJson: 'bower.json'
            }
        }))
        .on('error', function() {
            sass.logError.apply(this, arguments);
            notifier("Bower compile error, check terminal", {
                title: "Error"
            });
            beep();
        })
        //todo: minify shite and strip comments
        .pipe(sourcemaps.init())
        .pipe(concat('vendor.js'))
        //.pipe(uglify({
        //    mangle: false
        //}))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/public/js'));
});

//Build public scripts (disabled coffeescript)
gulp.task('scripts', function() {
    gutil.log("Compiling scripts..");

    //gulp.src("src/public/script/**/*.coffee")
    gulp.src("src/public/js/**/*.js")
        .pipe(sourcemaps.init())
        //.pipe(jshint())
        //.pipe(jshint.reporter('default'))
        //.pipe(coffee({bare: true}))
        //.on('error', function (error) {
        //    gutil.log(error.toString());
        //    gutil.beep();
        //    notifier("Coffee error, check terminal", {title: "Error"});
        //})
        .pipe(concat('app.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/public/js'));
});

gulp.task('html', function() {
    gulp.src('src/public/*.html')
        .pipe(htmlmin({
            removeComments: true,
            removeCommentsFromCDATA: true,
            collapseWhitespace: true,
            preserveLineBreaks: false,
            conservativeCollapse: false,
            useShortDoctype: true,
            //lint: true, //Throws errors
            maxLineLength: 150,
            caseSensitive: true
        }))
        .pipe(gulp.dest('dist/public'));
});

gulp.task('buildtemplates', function() {
    //Create angular template cache for faster loading
    gulp.src('src/public/templates/**/*.html')
        .pipe(templateCache({
            standalone: true
        }))
        .pipe(gulp.dest('dist/public/js'));
});

//Copy over all the fonts - a bit pointless maybe, but at least it keeps everything in the src folder for now. wat
gulp.task('fonts', function() {
    gutil.log("Copying fonts ..");
    del.sync("dist/public/fonts");
    gulp.src(['bower_components/**/*.@(otf|eot|ttf|woff|woff2)', 'public/**/*.@(otf|eot|ttf|woff|woff2)'])
        .pipe(flatten())
        .pipe(gulp.dest("dist/public/fonts"));
});

//Compress and copy images

gulp.task('images', function(src) {
    gutil.log("Compressing images..");
    return gulp.src('src/public/img/**/*')
        .pipe(newy(function(projectDir, srcFile, absSrcFile) {
            var path = absSrcFile.replace('src/', 'dist/');
            //console.log(path);
            return path;
        }))
        //https://github.com/sindresorhus/gulp-imagemin
        .pipe(imagemin({
            //PNG - 0-7 - default 3
            optimizationLevel: 7,
            //JPG - bool -> lossless jpg compression (bigger files)
            progressive: false,
            //GIF - bool - Interlace gif for progressive rendering.
            interlaced: true,
            //SVG - bool - Optimize svg multiple times until it's fully optimized.
            multipass: true,
            //SVGO poop.
            svgoPlugins: [{
                removeViewBox: false
            }],
            //extra plugins
            //use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/public/img'));
});

//Build everything
gulp.task('build', function() {
    gutil.log("Building project..");
    gulp.run("fonts");
    gulp.run("images");
    gulp.run("styles");
    gulp.run("libraries");
    //gulp.run("compileserver");
    gulp.run("scripts");
    gulp.run("buildtemplates");
    gulp.run("html");
});

// Default Task, run server and watch changes
gulp.task('default', ['build', 'watch', 'server']);
gulp.task('bw', ['build', 'watch']);
gulp.task('heroku:production', ['build', 'server']);