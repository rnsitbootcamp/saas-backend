const gulp = require('gulp');
const ts = require('gulp-typescript');
const clean = require('gulp-clean');
const server = require('gulp-develop-server');
const cache = require('gulp-cached');

const source = ['src/**/**/*.ts'];
// const dontWatchMe = ['!src/tasks/**/*.ts'];
const dontWatchMe = [];
const { compilerOptions } = require('./tsconfig.json');

console.log(compilerOptions);

gulp.task('ts', () => {
    return gulp
        .src(source, { base: './src' })
        .pipe(cache('typescript'))
        .pipe(ts(compilerOptions))
        .pipe(gulp.dest('./dist'));
});

gulp.task('clean', () => {
    return gulp
        .src(['./**/*.map.js', './**/*.js.map', 'dist'], { read: false })
        .pipe(clean());
});

gulp.task('server:start', gulp.series(['ts']), () => {
    if (!process.env.INSPECT) {
        server.listen({ path: `${process.cwd()}/dist/Server` }, (error) => {
            if (error) {
                console.log(error);
            }
        });
    }
});

gulp.task('server:restart', gulp.series(['ts']), () => {
    if (!process.env.INSPECT) {
        server.restart();
    }
});

gulp.task('default', gulp.series(['server:start']), () => {
    const watch = source.concat(dontWatchMe);
    console.log({ watch });
    gulp.watch(watch, ['server:restart'], () => {
        console.log('Watching ... ');
    });
});
