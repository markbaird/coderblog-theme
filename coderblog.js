/*
 Copyright (C) 2015  Mark Baird

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = function CoderBlogModule(pb) {

  /**
   * CoderBlog - A theme for PencilBlue
   *
   * @author Mark Baird <mark.r.baird@gmail.com>
   * @copyright 2015
   */
  function CoderBlog(){}

  /**
   * Called when the application is being installed for the first time.
   *
   * @param cb A callback that must be called upon completion.  cb(err, result).
   * The result is ignored
   */
  CoderBlog.onInstall = function(cb) {
    cb(null, true);
  };

  /**
   * Called when the application is uninstalling this plugin.  The plugin should
   * make every effort to clean up any plugin-specific DB items or any in function
   * overrides it makes.
   *
   * @param cb A callback that must be called upon completion.  cb(err, result).
   * The result is ignored
   */
  CoderBlog.onUninstall = function(cb) {
    cb(null, true);
  };

  /**
   * Called when the application is starting up. The function is also called at
   * the end of a successful install. It is guaranteed that all core PB services
   * will be available including access to the core DB.
   *
   * @param cb A callback that must be called upon completion.  cb(err, result).
   * The result is ignored
   */
  CoderBlog.onStartup = function(cb) {
    pb.TemplateService.registerGlobal('header_tagline', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('header_tagline', 'coderblog-theme', cb);
    });

    pb.TemplateService.registerGlobal('homepage_seo_keywords', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('homepage_seo_keywords', 'coderblog-theme', cb);
    });

    pb.TemplateService.registerGlobal('homepage_seo_description', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('homepage_seo_description', 'coderblog-theme', cb);
    });

    pb.TemplateService.registerGlobal('author_linkedin_url', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('author_linkedin_url', 'coderblog-theme', cb);
    });

    pb.TemplateService.registerGlobal('author_stackoverflow_url', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('author_stackoverflow_url', 'coderblog-theme', cb);
    });

    pb.TemplateService.registerGlobal('author_github_url', function(flag, cb) {
      var pluginService = new pb.PluginService();
      pluginService.getSetting('author_github_url', 'coderblog-theme', cb);
    });

    cb(null, true);
  };

  /**
   * Called when the application is gracefully shutting down.  No guarantees are
   * provided for how much time will be provided the plugin to shut down.
   *
   * @param cb A callback that must be called upon completion.  cb(err, result).
   * The result is ignored
   */
  CoderBlog.onShutdown = function(cb) {
    cb(null, true);
  };

  //exports
  return CoderBlog;
};
