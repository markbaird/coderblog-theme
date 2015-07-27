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

module.exports = function TopicModule(pb) {

  //pb dependencies
  var util  = pb.util;
  var Index = require('./index.js')(pb);

  /**
   * Index page of the pencilblue theme
   */
  function Topic(){}
  util.inherits(Topic, Index);

  Topic.prototype.init = function(context, cb) {
    var self = this;
    var init = function(err) {

      //get content settings
      var contentService = new pb.ContentService();
      contentService.getSettings(function(err, contentSettings) {
        if (util.isError(err)) {
          return cb(err);
        }

        //create the service
        self.contentSettings = contentSettings;
        var asContext = self.getServiceContext();
        asContext.contentSettings = contentSettings;
        self.service = new pb.ArticleServiceV2(asContext);

        //create the loader context
        var cvlContext             = self.getServiceContext();
        cvlContext.contentSettings = contentSettings;
        cvlContext.service         = self.service;
        self.contentViewLoader     = new pb.ContentViewLoader(cvlContext);
        self.contentViewLoader.getDefaultTemplatePath = function() {
          return 'topic';
        };

        //provide a dao
        self.dao = new pb.DAO();

        cb(null, true);
      });
    };
    Topic.super_.prototype.init.apply(this, [context, init]);
  };

  Topic.prototype.render = function(cb) {
    var self    = this;
    var topicName = decodeURIComponent(this.pathVars.topicName);
    var where = {name: topicName};

    //attempt to load object
    var dao = new pb.DAO();
    dao.loadByValues(where, 'topic', function(err, topic) {
      if (util.isError(err) || topic == null) {
        if (where.name) {
          self.reqHandler.serve404();
          return;
        }
      }

      if (topic) {
        self.renderTopic(topic, cb);
      }
      else {
        self.reqHandler.serve404();
        return;
      }
    });
  };

  Topic.prototype.renderTopic = function(topic, cb) {
    this.ts.registerLocal('topic_name', topic.name);

    this.req.pencilblue_topic = topic._id.toString();
    this.setPageName(topic.name);
    Topic.super_.prototype.render.apply(this, [cb]);
  };

  /**
   * Provides the routes that are to be handled by an instance of this prototype.
   * The route provides a definition of path, permissions, authentication, and
   * expected content type.
   * Method is optional
   * Path is required
   * Permissions are optional
   * Access levels are optional
   * Content type is optional
   *
   * @param cb A callback of the form: cb(error, array of objects)
   */
  Topic.getRoutes = function(cb) {
    var routes = [
      {
        method: 'get',
        path: '/topic/:topicName',
        auth_required: false,
        content_type: 'text/html'
      },
      {
        method: 'get',
        path: '/tag/:topicName',
        auth_required: false,
        content_type: 'text/html'
      }];
    cb(null, routes);
  };

  //exports
  return Topic;
};
