import gulp from 'gulp';
import browserify from 'browserify';
import babelify from 'babelify';
import watchify from 'watchify';
import log from 'gulplog';
import tap from 'gulp-tap';
import buffer from 'gulp-buffer';
import sourcemaps from 'gulp-sourcemaps';
import assign from "lodash/assign";

export function compile() {
    return gulp
                .src('js/**/*.js', {read: false}) // no need reading the file since browserify does

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
    
        // write sourcemaps
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist'));
}

export function createBundle(src) {
    if (!src.push) {
        src = [src];
    }

    const customOpts = {
        entries: src,
        cache: {},
        packageCache: {},
        // plugin: [watchify],
        debug: true
    };

    let opts = assign({}, watchify.args, customOpts);
    const bundle = browserify(opts);
    bundle.transform(babelify.configure({presets: ['@babel/preset-env']} ));
    bundle.on('error', () => {});
    return bundle.bundle();
}

export default compile;