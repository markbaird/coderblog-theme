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

module.exports = function(pb) {

  //pb dependencies
  var util = pb.util;

  /**
   * Loads a section
   */
  function Index(){}
  util.inherits(Index, pb.BaseController);


  Index.prototype.init = function(context, cb) {
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

        //provide a dao
        self.dao = new pb.DAO();

        cb(null, true);
      });
    };
    Index.super_.prototype.init.apply(this, [context, init]);
  };

  Index.prototype.render = function(cb) {
    var self    = this;
    var query = this.query;
    var pageNumber = undefined;
    if (query.page && pb.validation.isInt(query.page, true, false)) {
      pageNumber = parseInt(query.page, 10);
    }

    self.getContent(pageNumber, self.contentSettings.articles_per_page, function(err, articles) {
      if (util.isError(err)) {
        return cb(err);
      }

      self.getCount(pageNumber, self.contentSettings.articles_per_page, function(err, count) {
        //render
        var options = {
          useDefaultTemplate: true
        };

        // Setup pagination
        var prev = undefined, next = 1, prevDisplay = "none", nextDisplay = "none";
        if (pageNumber && pageNumber > 0) {
          prev = pageNumber - 1;
          prevDisplay = "inline-block";

          next = pageNumber +1;
        }
        if (count) {
          var page = pageNumber || 0;
          var lastPage = Math.ceil(count / self.contentSettings.articles_per_page) - 1;
          if (lastPage > page) {
            nextDisplay = "inline-block";
          }
        }
        self.ts.registerLocal('previous_page', prev);
        self.ts.registerLocal('previous_display', prevDisplay);
        self.ts.registerLocal('next_page', next);
        self.ts.registerLocal('next_display', nextDisplay);

        self.contentViewLoader.render(articles, options, function(err, html) {
          if (util.isError(err)) {
            return cb(err);
          }

          var result = {
            content: html
          };
          cb(result);
        });
      });
    });
  };

  Index.prototype.getDefaultTemplatePath = function() {
    return 'index';
  };

  Index.prototype.getContent = function(pageNumber, articlesPerPage, cb) {
    var self = this;

    var opts = {
      render: true,
      limit: self.contentSettings.articles_per_page || 5,
      order: [{'publish_date': pb.DAO.DESC}, {'created': pb.DAO.DESC}]
    };

    if (pageNumber) {
      opts.offset = pageNumber * articlesPerPage;
    }

    self.service.getPublished(opts, cb);
  };

  Index.prototype.getCount = function(pageNumber, articlesPerPage, cb) {
    var self = this;

    var opts = {
      where: {}
    };

    pb.ContentObjectService.setPublishedClause(opts.where);
    self.service.count(opts, cb);
  };

  Index.getRoutes = function(cb) {
    var routes = [{
      method: 'get',
      path: '/',
      auth_required: false,
      content_type: 'text/html'
    }];
    cb(null, routes);
  };

  //exports
  return Index;


};
