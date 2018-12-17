import gulp from 'gulp';
import browserify from 'browserify';
import babelify from 'babelify';
import log from 'gulplog';
import tap from 'gulp-tap';
import buffer from 'gulp-buffer';
import sourcemaps from 'gulp-sourcemaps';

export function compile() {
    return gulp
                .src('js/**/*.js', {read: false}) // no need reading the file since browserify does

                // transform the file objects using gulp-atp plugin
        .pipe(tap((file) => {
            log.info(`Bundling ${file.path}`);

            // replace the file contents with browserify's bundle stream
            file.contents = browserify(file.path, {debug: true})
                .transform(babelify.configure({presets: ['@babel/preset-env']} )).bundle();
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

export default compile;