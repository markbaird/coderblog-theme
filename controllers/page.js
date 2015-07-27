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
    var ContentViewLoader = pb.ContentViewLoader;

    /**
     * Loads a single article
     * @class ArticleViewController
     * @constructor
     * @extends BaseController
     */
    function PageViewController(){}
    util.inherits(PageViewController, pb.BaseController);

    /**
     * @method init
     * @param {Object} content
     * @param {Function} cb
     */
    PageViewController.prototype.init = function(context, cb) {
        var self = this;
        var init = function(err) {
            if (util.isError(err)) {
                return cb(err);
            }

            //create the service
            self.service = new pb.PageService(self.getServiceContext());

            //create the loader context
            var context     = self.getServiceContext();
            context.service = self.service;
            self.contentViewLoader = new pb.ContentViewLoader(context);
            self.contentViewLoader.getDefaultTemplatePath = function() {
                return 'page';
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
                ats.load('elements/page', cb);

                options.contentIndex++;
            };

            cb(null, true);
        };
        PageViewController.super_.prototype.init.apply(this, [context, init]);
    };

    /**
     * @method render
     * @param {Function} cb
     */
    PageViewController.prototype.render = function(cb) {
        var self    = this;
        var custUrl = this.pathVars.customUrl;

        //attempt to load object
        var opts = {
            render: true,
            where: this.getWhereClause(custUrl)
        };
        this.service.getSingle(opts, function(err, content) {
            if (util.isError(err)) {
                return cb(err);
            }
            else if (content == null) {
                return self.reqHandler.serve404();
            }

            var options = {};
            self.contentViewLoader.render([content], options, function(err, html) {
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
    PageViewController.prototype.getWhereClause = function(custUrl) {

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

    PageViewController.getRoutes = function(cb) {
        var routes = [{
            method: 'get',
            path: "/page/:customUrl",
            auth_required: false,
            content_type: 'text/html'
        }, {
            method: 'get',
            path: "/page-preview/:customUrl",
            access_level: pb.SecurityService.ACCESS_WRITER,
            auth_required: true,
            content_type: 'text/html'
        }];
        cb(null, routes);
    };

    //exports
    return PageViewController;
};
