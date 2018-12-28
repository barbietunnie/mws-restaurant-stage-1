import gulp from 'gulp';
import browserify from 'browserify';
import babelify from 'babelify';
import del from 'del';
import uglify from 'gulp-uglify';
import log from 'gulplog';
import tap from 'gulp-tap';
import buffer from 'gulp-buffer';
import sourcemaps from 'gulp-sourcemaps';

export function transpile() {
    return gulp
                .src(['js/**/*.js'], {read: false}) // no need reading the file since browserify does

                // transform the file objects using gulp-atp plugin
        .pipe(tap((file) => {
            log.info(`Bundling '${file.path}'`);

            // replace the file contents with browserify's bundle stream
            file.contents = createBundle(file.path);
        }))

        // transform streaming contents into buffer contents
        // (since gulp-sourcemaps does not support streaming contents)
        .pipe(buffer())

        // load and initialize sourcemaps
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
    
        // write sourcemaps
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/scripts'));
}

export function createBundle(src) {
    if (!src.push) {
        src = [src];
    }

    const customOpts = {
        entries: src,
        cache: {},
        packageCache: {},
        debug: true
    };

    const bundle = browserify(customOpts);
    bundle.transform(babelify.configure({presets: ['@babel/preset-env']} ));
    bundle.on('error', (err) => { console.error(err); this.emit('end'); });
    bundle.on('update', (ids) => { console.log('Updated: ', ids); transpile(); });
    return bundle.bundle();
}

function clean(done) {
    del(['dist/'], done);
    done();
}

exports.default = gulp.series(clean, transpile);