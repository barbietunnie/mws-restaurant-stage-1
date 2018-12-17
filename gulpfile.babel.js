import gulp from 'gulp';
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';
import eslint from 'gulp-eslint';
import del from 'del';

const paths = {
    styles: {
        src: '',
        dest: ''
    },
    scripts: {
        src: 'js/**/*.js',
        dest: 'dist/'
    }
};

export const clean = () => del([ 'dist' ]);

function es6_compile() {
    return gulp.src(paths.scripts.src)
                .pipe(sourcemaps.init())
                .pipe(babel())
                .pipe(sourcemaps.write('.'))
                .pipe(gulp.dest(paths.scripts.dest));
}

function lint() {
    return gulp
            .src([paths.scripts.src])
            .pipe(eslint())
            .pipe(eslint.format());
}

function watch() {
    // gulp.watch(paths.scripts.src, ['scripts', 'lint']);
    gulp.watch(paths.scripts.src, build);
}

const build = gulp.series(clean, es6_compile);
exports.es6_compile = es6_compile;
exports.watch = watch;
exports.default = es6_compile;