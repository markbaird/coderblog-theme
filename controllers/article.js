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

module.exports = function ArticleModule(pb) {

    //pb dependencies
    var util  = pb.util;
    var Index = require('./index.js')(pb);
    var async = require('async');

    var ArticleService = pb.ArticleService;

    /**
     * Loads a single article
     */
    function Article(){}
    util.inherits(Article, Index);

    Article.prototype.render = function(cb) {
        var self    = this;
        var custUrl = this.pathVars.customUrl;

        //check for object ID as the custom URL
        var where  = null;
        if(pb.validation.isIdStr(custUrl)) {
            where = {_id: pb.DAO.getObjectID(custUrl)};
            if (pb.log.isSilly()) {
                pb.log.silly("ArticleController: The custom URL was not an object ID [%s].  Will now search url field. [%s]", custUrl, e.message);
            }
        }
        else {
            where = {url: custUrl};
        }

        // fall through to URL key
        if (where === null) {
            where = {url: custUrl};
        }

        //attempt to load object
        var dao = new pb.DAO();
        dao.loadByValues(where, 'article', function(err, article) {
            if (util.isError(err) || article == null) {
                if (where.url) {
                    self.reqHandler.serve404();
                    return;
                }

                dao.loadByValues({url: custUrl}, 'article', function(err, article) {
                    if (util.isError(err) || article == null) {
                        self.reqHandler.serve404();
                        return;
                    }

                    self.renderArticle(article, cb);
                });

                return;
            }

            self.renderArticle(article, cb);
        });
    };

    Article.prototype.renderArticle = function(article, cb) {
        var self = this;
        this.req.pencilblue_article = article._id.toString();
        this.article = article;
        this.setPageName(article.name);

        var contentService = new pb.ContentService();
        contentService.getSettings(function(err, contentSettings) {
            self.gatherData(0, 1, function(err, data) {
                ArticleService.getMetaInfo(data.content[0], function(metaKeywords, metaDescription, metaTitle, metaThumbnail) {
                    if (metaKeywords && metaKeywords.indexOf(",") === 0) {
                        metaKeywords = metaKeywords.substring(1);
                    }

                    self.ts.registerLocal('meta_keywords', metaKeywords);
                    self.ts.registerLocal('meta_desc', metaDescription);
                    self.ts.registerLocal('meta_title', metaTitle);
                    self.ts.registerLocal('meta_thumbnail', metaThumbnail);
                    self.ts.registerLocal('meta_lang', 'en-us');
                    self.ts.registerLocal('meta_type', 'article');
                    self.ts.registerLocal('current_url', self.req.url);
                    self.ts.registerLocal('article_headline_nolink', data.content[0].headline);
                    self.ts.registerLocal('author_name', data.content[0].author_name ? data.content[0].author_name : '');
                    self.ts.registerLocal('author_position', data.content[0].author_position ? data.content[0].author_position : '');
                    self.ts.registerLocal('article_published', data.content[0].publish_date ? data.content[0].publish_date.toISOString() : '');
                    self.ts.registerLocal('article_modified', data.content[0].last_modified ? data.content[0].last_modified.toISOString() : '');

                    //self.ts.registerLocal('navigation', new pb.TemplateValue(data.nav.navigation, false));
                    self.ts.registerLocal('content', function(flag, cb) {
                        var tasks = util.getTasks(data.content, function(content, i) {
                            return function(callback) {
                                self.renderContent(content[i], contentSettings, data.nav.themeSettings, i, callback);
                            };
                        });
                        async.parallel(tasks, function(err, result) {
                            cb(err, new pb.TemplateValue(result.join(''), false));
                        });
                    });
                    self.ts.registerLocal('page_name', function(flag, cb) {
                        var content = data.content.length > 0 ? data.content[0] : null;
                        self.getContentSpecificPageName(content, cb);
                    });

                    self.getTemplate(data.content, function(err, template) {
                        if (util.isError(err)) {
                            throw err;
                        }

                        self.ts.load(template, function(err, result) {
                            if (util.isError(err)) {
                                throw err;
                            }

                            cb({content: result});
                        });
                    });
                });
            });
        });
    };

    Article.prototype.renderContent = function(content, contentSettings, themeSettings, index, cb) {
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
        ats.registerLocal('author_position', content.author_position ? content.author_position : '');
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

        ats.registerLocal('customs', function(flag, cb) {
            self.getCustoms(content, function(customs) {
                if (customs) {
                    var tasks = util.getTasks(customs, function (topics, i) {
                        return function (callback) {
                            self.renderCustom(customs[i], contentSettings, themeSettings, i, callback);
                        };
                    });
                    async.parallel(tasks, function (err, result) {
                        cb(err, new pb.TemplateValue(result.join(''), false));
                    });
                }
            });
        });

        ats.load('elements/article_full', cb);
    };

    Article.prototype.renderTopic = function(topic, contentSettings, themeSettings, index, cb) {
        var ats = new pb.TemplateService(this.ls);
        ats.registerLocal('topic_name', topic.name);
        ats.registerLocal('topic_name_encoded', encodeURIComponent(topic.name));
        ats.load('elements/topic', cb);
    };

    Article.prototype.getTopics = function(article, cb) {
        var topics = article.article_topics;

        var dao = new pb.DAO();
        var opts = {
            where: pb.DAO.getIdInWhere(topics),
            order: {name: 1}
        };
        dao.q('topic', opts, function(err, topicObjects) {
            cb(topicObjects);
        });
    };

    Article.prototype.getCustoms = function(article, cb) {
        var self = this;
        this.getCustomTypeByName("TestObjects", function(customType) {
            if (customType) {
                var cos = new pb.CustomObjectService();
                // TODO: sort order??
                var opts = {
                    where: {
                        Post: self.req.pencilblue_article
                    }
                };

                cos.findByType(customType, opts, function(err, customObjects) {
                    cb(customObjects);
                });
            }
            else {
                cb([]);
            }
        });
    };

    Article.prototype.getCustomTypeByName = function(name, cb) {
        var cos = new pb.CustomObjectService();
        cos.loadTypeByName(name, function(err, custObjType) {
            cb(custObjType);
        });
    }

    Article.prototype.renderCustom = function(custom, contentSettings, themeSettings, index, cb) {
        var ats = new pb.TemplateService(this.ls);
        ats.registerLocal('custom_name', custom.name);
        ats.load('elements/custom', cb);
    };

    Article.prototype.getTemplate = function(content, cb) {
        cb(null, 'article');
        return;
    };

    Article.getRoutes = function(cb) {
        var routes = [{
            method: 'get',
            path: "/article/:customUrl",
            auth_required: false,
            content_type: 'text/html'
        }];
        cb(null, routes);
    };

    //exports
    return Article;
};
