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

//dependencies
var async   = require('async');

module.exports = function BlogArticleServiceModule(pb) {
    
    //pb dependencies
    var util        = pb.util;
    var MediaLoader = pb.MediaLoader;

    /**
     *
     * @class BlogArticleService
     * @constructor
     */
    function BlogArticleService() {
        this.object_type = 'article';
    }

    util.inherits(BlogArticleService, pb.ArticleService);

    /**
     * @static
     * @method init
     */
    BlogArticleService.init = function(cb) {
        pb.log.debug("BlogArticleService: Initialized");
        cb(null, true);
    };


    BlogArticleService.prototype.find = function(where, options, cb) {
        // Check the "forIndex" flag to see if this is a query for an index page,
        // to force the "read more" links even if only one article is found.
        var forIndex = false;
        if (options.for_index && options.for_index === true) {
            forIndex = true;
        }

        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!options) {
            options = {};
        }

        //verify the where is valid
        if (!util.isObject(where)) {
            return cb(new Error('The where clause must be an object'));
        }

        //build out query
        if(!where.publish_date) {
            where.publish_date = {$lt: new Date()};
        }
        if(!where.draft) {
            where.draft = {$ne: 1};
        }

        //build out the ordering
        var order;
        if (options.order) {
            order = options.order;
        }
        else {
            order = [{'publish_date': pb.DAO.DESC}, {'created': pb.DAO.DESC}];
        }

        //build out select
        var select;
        if (util.isObject(options.select)) {
            select = options.select;
        }
        else {
            select = pb.DAO.SELECT_ALL;
        }

        //build out the limit (must be a valid integer)
        var limit = undefined;
        if (pb.validation.isInt(options.limit, true, true)) {
            limit = options.limit;
        }

        //build out the limit (must be a valid integer)
        var offset = 0;
        if (pb.validation.isInt(options.offset, true, true)) {
            offset = options.offset;
        }

        var self = this;
        var dao  = new pb.DAO();
        dao.q(this.getContentType(), {where: where, select: select, order: order, limit: limit, offset: offset}, function(err, articles) {
            if (util.isError(err)) {
                return cb(err, []);
            }
            else if (articles.length === 0) {
                return cb(null, []);
            }

            //get authors
            self.getArticleAuthors(articles, function(err, authors) {

                var contentService = new pb.ContentService();
                contentService.getSettings(function(err, contentSettings) {

                    var tasks = util.getTasks(articles, function(articles, i) {
                        return function(callback) {
                            self.processArticleForDisplay(articles[i], articles.length, forIndex, authors, contentSettings, function(){
                                callback(null, null);
                            });
                        };
                    });
                    async.series(tasks, function(err, results) {
                        cb(err, articles);
                    });
                });
            });
        });

    };

    BlogArticleService.prototype.processArticleForDisplay = function(article, articleCount, forIndex, authors, contentSettings, cb) {
        var self = this;

        if (this.getContentType() === 'article') {
            if(contentSettings.display_bylines) {

                for(var j = 0; j < authors.length; j++) {

                    if(pb.DAO.areIdsEqual(authors[j][pb.DAO.getIdField()], article.author)) {
                        if(authors[j].photo && contentSettings.display_author_photo) {
                            article.author_photo     = authors[j].photo;
                            article.media_body_style = '';
                        }

                        article.author_name     = pb.users.getFormattedName(authors[j]);
                        article.author_position = (authors[j].position && contentSettings.display_author_position) ? authors[j].position : '';
                        break;
                    }
                }
            }

            if(contentSettings.display_timestamp ) {
                article.timestamp = pb.ContentService.getTimestampTextFromSettings(
                    article.publish_date,
                    contentSettings
                );
            }

            if(article.article_layout.indexOf('^read_more^') > -1) {
                if(articleCount > 1 || forIndex) {
                    article.article_layout = article.article_layout.substr(0, article.article_layout.indexOf('^read_more^')) + ' <div class="read-more"><a href="' + pb.config.siteRoot + '/article/' + article.url + '">' + contentSettings.read_more_text + '...</a></div>';
                }
                else {
                    article.article_layout = article.article_layout.split('^read_more^').join('');
                }
            }
            else if((articleCount > 1 || forIndex) && contentSettings.auto_break_articles) {
                var breakString = '<br>';
                var tempLayout;

                // Firefox uses br and Chrome uses div in content editables.
                // We need to see which one is being used
                var brIndex = article.article_layout.indexOf('<br>');
                if(brIndex === -1) {
                    brIndex = article.article_layout.indexOf('<br />');
                    breakString = '<br />';
                }
                var divIndex = article.article_layout.indexOf('</div>');

                // Temporarily replace double breaks with a directive so we don't mess up the count
                if(divIndex === -1 || (brIndex > -1 && divIndex > -1 && brIndex < divIndex)) {
                    tempLayout = article.article_layout.split(breakString + breakString).join(breakString + '^dbl_pgf_break^');
                }
                else {
                    breakString = '</div>';
                    tempLayout = article.article_layout.split('<div><br></div>').join(breakString + '^dbl_pgf_break^')
                        .split('<div><br /></div>').join(breakString + '^dbl_pgf_break^');
                }

                // Split the layout by paragraphs and remove any empty indices
                var tempLayoutArray = tempLayout.split(breakString);
                for(var i = 0; i < tempLayoutArray.length; i++) {
                    if(!tempLayoutArray[i].length) {
                        tempLayoutArray.splice(i, 1);
                        i--;
                    }
                }

                // Only continue if we have more than 1 paragraph
                if(tempLayoutArray.length > 1) {
                    var newLayout = '';

                    // Cutoff the article at the right number of paragraphs
                    for(i = 0; i < tempLayoutArray.length && i < contentSettings.auto_break_articles; i++) {
                        if(i === contentSettings.auto_break_articles -1 && i != tempLayoutArray.length - 1) {
                            newLayout += tempLayoutArray[i] + '&nbsp;<div class="read-more"><a href="' + pb.config.siteRoot + '/article/' + article.url + '">' + contentSettings.read_more_text + '...</a></div>' + breakString;
                            continue;
                        }
                        newLayout += tempLayoutArray[i] + breakString;
                    }

                    if(breakString === '</div>') {
                        breakString = '<div><br /></div>';
                    }

                    // Replace the double breaks
                    newLayout = newLayout.split('^dbl_pgf_break^').join(breakString);

                    article.article_layout = newLayout;
                }
            }
        }

        article.layout  = article.article_layout;
        var mediaLoader = new MediaLoader();
        mediaLoader.start(article[this.getContentType()+'_layout'], function(err, newLayout) {
            article.layout = newLayout;
            delete article.article_layout;

            if (self.getContentType() === 'article') {

                var where = {article: article[pb.DAO.getIdField()].toString()};
                var order = {created: pb.DAO.ASC};
                var dao   = new pb.DAO();
                dao.q('comment', {where: where, select: pb.DAO.PROJECT_ALL, order: order}, function(err, comments) {
                    if(util.isError(err) || comments.length == 0) {
                        return cb(null, null);
                    }

                    self.getCommenters(comments, contentSettings, function(err, commentsWithCommenters) {
                        article.comments = commentsWithCommenters;
                        cb(null, null);
                    });
                });
            }
            else {
                cb(null, null);
            }
        });
    };


    //exports
    return BlogArticleService;
};
