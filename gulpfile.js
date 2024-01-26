const gulp = require("gulp");
const autoprefixer = require("autoprefixer");
const sass = require("gulp-sass")(require("sass"));
const browsersync = require("browser-sync").create();
const livereload = require("gulp-livereload");
const pug = require("gulp-pug");

const paths = {
  css: {
    src: "./assets/scss/**/**.scss",
    dest: "./assets/css",
  },
  html: {
    src: "./assets/pug/pages/template/*.pug",
    dest: "./template",
  },
};

/// Style Task ///
gulp.task("scss", () => {
  return gulp
    .src(paths.css.src)
    .pipe(
      sass({
        //  outputStyle: 'compressed'
      }).on("error", sass.logError)
    )
    .pipe(gulp.dest(paths.css.dest))
    .pipe(browsersync.stream())
    .pipe(livereload());
  done();
});

/// Html Task ///
gulp.task("html", () => {
  return gulp
    .src(paths.html.src)
    .pipe(
      pug({
        pretty: true,
      })
    )
    .on("error", console.error.bind(console))
    .pipe(gulp.dest(paths.html.dest))
    .pipe(browsersync.stream())
    .pipe(livereload());
});

/// Browser Sync Task ///
gulp.task("browser-sync", async function (done) {
  browsersync.init({
    base: "./",
    server: "./",
    startPath: "template/index.html",
    host: "localhost",
    open: true,
    tunnel: false,
  });

  done();
});

/// Watch function ///
gulp.task(
  "default",
  gulp.series("scss", "html", "browser-sync", function () {
    gulp.watch(
      ["./assets/pug/pages/**/*.pug", "./assets/scss/**/*.scss"],
      gulp.series("html", "scss")
    );
    livereload.listen();
  })
);
