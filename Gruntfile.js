/*global module:false*/
module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.initConfig({
    wiredep: {
      task: {
        src: [
          'public/index.html'
        ],
      }
    }
  });
  grunt.registerTask('default', ['wiredep']);
};
