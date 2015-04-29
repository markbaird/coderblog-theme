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

module.exports = function PageModule(pb) {
    
    //pb dependencies
    var util  = pb.util;
    var Index = require('./index.js')(pb);

    /**
     * Loads a page
     * @class PageController
     * @constructor
     */
    function PageController(){}
    util.inherits(PageController, Index);

    /**
     * Looks up a page and renders it
     * @see BaseController#render
     * @method render
     * @param {Function} cb
     */
    PageController.prototype.render = function(cb) {
        var self    = this;
        var custUrl = this.pathVars.customUrl;

        //check for object ID as the custom URL
        var doRedirect = false;
        var where      = null;
        if(pb.validation.isIdStr(custUrl)) {
            where = {_id: pb.DAO.getObjectID(custUrl)};
            if (pb.log.isSilly()) {
                pb.log.silly("ArticleController: The custom URL was not an object ID [%s].  Will now search url field. [%s]", custUrl, e.message);
            }
        }
        else {
            where = {url: custUrl};
        }

        var dao = new pb.DAO();
        dao.loadByValues(where, 'page', function(err, page) {
            if (util.isError(err) || page == null) {
                if (where.url) {
                    self.reqHandler.serve404();
                    return;
                }

                dao.loadByValues({url: custUrl}, 'page', function(err, page) {
                    if (util.isError(err) || page == null) {
                        self.reqHandler.serve404();
                        return;
                    }

                    self.renderPage(page, cb);
                });

                return;
            }

            self.renderPage(page, cb);
        });
    };

    PageController.prototype.renderContent = function(content, contentSettings, themeSettings, index, cb) {
        var self = this;

        var isPage           = content.object_type === 'page';
        var showByLine       = contentSettings.display_bylines && !isPage;
        var showTimestamp    = contentSettings.display_timestamp && !isPage;
        var ats              = new pb.TemplateService(this.ls);
        var contentUrlPrefix = isPage ? '/page/' : '/article/';
        self.ts.reprocess = false;
        ats.registerLocal('article_permalink', pb.UrlService.urlJoin(pb.config.siteRoot, contentUrlPrefix, content.url));
        ats.registerLocal('article_headline', new pb.TemplateValue('<a href="' + pb.UrlService.urlJoin(contentUrlPrefix, content.url) + '">' + content.headline + '</a>', false));
        ats.registerLocal('article_headline_nolink', content.headline);
        ats.registerLocal('article_subheading', content.subheading ? content.subheading : '');
        ats.registerLocal('article_subheading_display', content.subheading ? '' : 'display:none;');
        ats.registerLocal('article_id', content[pb.DAO.getIdField()].toString());
        ats.registerLocal('article_index', index);
        ats.registerLocal('article_timestamp', showTimestamp && content.timestamp ? content.timestamp : '');
        ats.registerLocal('article_timestamp_display', showTimestamp ? '' : 'display:none;');
        ats.registerLocal('article_layout', new pb.TemplateValue(content.layout, false));
        ats.registerLocal('article_url', content.url);
        ats.registerLocal('display_byline', showByLine ? '' : 'display:none;');
        ats.registerLocal('author_photo', content.author_photo ? content.author_photo : '');
        ats.registerLocal('author_photo_display', content.author_photo ? '' : 'display:none;');
        ats.registerLocal('author_name', content.author_name ? content.author_name : '');
        ats.registerLocal('media_body_style', content.media_body_style ? content.media_body_style : '');

        ats.registerLocal('topics', function(flag, cb) {
            self.getTopics(content, function(topics) {
                var tasks = util.getTasks(topics, function(topics, i) {
                    return function(callback) {
                        self.renderTopic(topics[i], contentSettings, themeSettings, i, callback);
                    };
                });
                async.parallel(tasks, function(err, result) {
                    cb(err, new pb.TemplateValue(result.join(''), false));
                });
            });
        });

        ats.load('elements/page', cb);
    };

    PageController.prototype.renderPage = function(page, cb) {
        this.req.pencilblue_page = page._id.toString();
        this.page = page;
        this.setPageName(page.name);
        PageController.super_.prototype.render.apply(this, [cb]);
    };

    PageController.prototype.getTemplate = function(content, cb) {
        cb(null, 'page');
        return;
    };

    /**
     * Retrieves the name of the page.  The page's headhile
     *
     */
    PageController.prototype.getPageTitle = function() {
        return this.page.headline;
    };

    PageController.getRoutes = function(cb) {
        var routes = [{
            method: 'get',
            path: "/page/:customUrl",
            auth_required: false,
            content_type: 'text/html'
        }];
        cb(null, routes);
    };

    //exports
    return PageController;
};
