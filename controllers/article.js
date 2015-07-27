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
  var async = require('async');
  var ContentViewLoader = pb.ContentViewLoader;

  /**
   * Loads a single article
   * @class ArticleViewController
   * @constructor
   * @extends BaseController
   */
  function ArticleViewController(){}
  util.inherits(ArticleViewController, pb.BaseController);

  /**
   * @method init
   * @param {Object} content
   * @param {Function} cb
   */
  ArticleViewController.prototype.init = function(context, cb) {
    var self = this;
    var init = function(err) {
      if (util.isError(err)) {
        return cb(err);
      }

      //create the service
      self.service = new pb.ArticleServiceV2(self.getServiceContext());

      //create the loader context
      var context     = self.getServiceContext();
      context.service = self.service;

      self.contentViewLoader = new pb.ContentViewLoader(context);
      self.contentViewLoader.getDefaultTemplatePath = function() {
        return 'article';
      };

      self.contentViewLoader.renderContent = function(content, options, cb) {
        var self = this;

        //set recurring params
        if (util.isNullOrUndefined(options.contentIndex)) {
          options.contentIndex = 0;
        }

        var isPage           = this.service.getType() === 'page';
        var showByLine       = this.contentSettings.display_bylines && !isPage;
        var showTimestamp    = this.contentSettings.display_timestamp && !isPage;
        var ats              = self.ts.getChildInstance();
        self.ts.reprocess = false;
        ats.registerLocal('article_permalink', function(flag, cb) {
          self.onContentPermalink(content, options, cb);
        });
        ats.registerLocal('article_headline', function(flag, cb) {
          self.onContentHeadline(content, options, cb);
        });

        ats.registerLocal('article_headline_nolink', content.headline);
        ats.registerLocal('article_subheading', ContentViewLoader.valOrEmpty(content.subheading));
        ats.registerLocal('article_subheading_display', ContentViewLoader.getDisplayAttr(content.subheading));
        ats.registerLocal('article_id', content[pb.DAO.getIdField()] + '');
        ats.registerLocal('article_index', options.contentIndex);
        ats.registerLocal('article_timestamp', showTimestamp && content.timestamp ? content.timestamp : '');
        ats.registerLocal('article_timestamp_display', ContentViewLoader.getDisplayAttr(showTimestamp));
        ats.registerLocal('article_layout', new pb.TemplateValue(content.layout, false));
        ats.registerLocal('article_url', content.url);
        ats.registerLocal('display_byline', ContentViewLoader.getDisplayAttr(showByLine));
        ats.registerLocal('author_photo', ContentViewLoader.valOrEmpty(content.author_photo));
        ats.registerLocal('author_photo_display', ContentViewLoader.getDisplayAttr(content.author_photo));
        ats.registerLocal('author_name', ContentViewLoader.valOrEmpty(content.author_name));
        ats.registerLocal('author_position', ContentViewLoader.valOrEmpty(content.author_position));
        ats.registerLocal('media_body_style', ContentViewLoader.valOrEmpty(content.media_body_style));
        ats.registerLocal('comments', function(flag, cb) {
          if (isPage || !pb.ArticleService.allowComments(self.contentSettings, content)) {
            return cb(null, '');
          }

          var ts = ats.getChildInstance();
          self.renderComments(content, ts, function(err, comments) {
            cb(err, new pb.TemplateValue(comments, false));
          });
        });
        ats.load('elements/article_full', cb);

        options.contentIndex++;
      };

      cb(null, true);
    };

    ArticleViewController.super_.prototype.init.apply(this, [context, init]);
  };

  /**
   * @method render
   * @param {Function} cb
   */
  ArticleViewController.prototype.render = function(cb) {
    var self    = this;
    var custUrl = this.pathVars.customUrl;

    //attempt to load object
    var opts = {
      render: true,
      where: this.getWhereClause(custUrl)
    };
    this.service.getSingle(opts, function(err, article) {
      if (util.isError(err)) {
        return cb(err);
      }
      else if (article == null) {
        return self.reqHandler.serve404();
      }

      self.ts.registerLocal('meta_lang', 'en-us');
      self.ts.registerLocal('meta_type', 'article');
      self.ts.registerLocal('article_headline_nolink', article.headline);
      self.ts.registerLocal('author_name', article.author_name ? article.author_name : '');
      self.ts.registerLocal('author_position', article.author_position ? article.author_position : '');
      self.ts.registerLocal('article_published', article.publish_date ? article.publish_date.toISOString() : '');
      self.ts.registerLocal('article_modified', article.last_modified ? article.last_modified.toISOString() : '');

      self.ts.registerLocal('topics', function(flag, cb) {
        self.getTopics(article, function(topics) {
          var tasks = util.getTasks(topics, function(topics, i) {
            return function(callback) {
              self.renderTopic(topics[i], i, callback);
            };
          });
          async.parallel(tasks, function(err, result) {
            cb(err, new pb.TemplateValue(result.join(''), false));
          });
        });
      });

      var options = {};
      self.contentViewLoader.render([article], options, function(err, html) {
        if (util.isError(err)) {
          return cb(err);
        }

        var result = {
          content: html
        };
        cb(result);
      });
    });
  };

  ArticleViewController.prototype.renderTopic = function(topic, index, cb) {
    var ats = new pb.TemplateService(this.ls);
    ats.registerLocal('topic_name', topic.name);
    ats.registerLocal('topic_name_encoded', encodeURIComponent(topic.name));
    ats.load('elements/topic', cb);
  };

  ArticleViewController.prototype.getTopics = function(article, cb) {
    var topics = article.article_topics;

    pb.log.info("TOPICS: ", article)

    var dao = new pb.DAO();
    var opts = {
      where: pb.DAO.getIdInWhere(topics),
      order: {name: 1}
    };
    dao.q('topic', opts, function(err, topicObjects) {
      cb(topicObjects);
    });
  };

  /**
   * Builds out the where clause for finding the article to render.  Because
   * MongoDB has an object ID represented by 12 characters we must account
   * for this condition by building a where clause with an "or" condition.
   * Otherwise we will only query on the url key
   * @method getWhereClause
   * @param {String} custUrl Represents the article's ID or its slug
   * @return {Object} An object representing the where clause to use in the
   * query to locate the article
   */
  ArticleViewController.prototype.getWhereClause = function(custUrl) {

    //put a check to look up by ID *FIRST*
    var conditions = [];
    if(pb.validation.isIdStr(custUrl, true)) {
      conditions.push(pb.DAO.getIdWhere(custUrl));
    }

    //put a check to look up by URL
    conditions.push({
      url: custUrl
    });

    //check for object ID as the custom URL
    var where;
    if (conditions.length > 1) {
      where = {
        $or: conditions
      };
    }
    else {
      where = conditions[0];
    }
    return where;
  };

  ArticleViewController.getRoutes = function(cb) {
    var routes = [{
      method: 'get',
      path: "/article/:customUrl",
      auth_required: false,
      content_type: 'text/html'
    }];
    cb(null, routes);
  };

  //exports
  return ArticleViewController;
};
