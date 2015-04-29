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

module.exports = function PreviewModule(pb) {
    
    //pb dependencies
    var util  = pb.util;
    var Index = require('./index.js')(pb);
    var Article = require('./article.js')(pb);

    /**
     * Preview an article or page
     */
    function Preview(){}
    util.inherits(Preview, Index);
    //util.inherits(Preview, Article);


    Preview.prototype.render = function(cb) {
        var self    = this;
        var vars    = this.pathVars;

        var dao     = new pb.DAO();
        dao.loadById(vars.id, vars.type, function(err, item) {
            if (util.isError(err) || item === null) {
                cb({content: 'The section could not be found on this server', code: 404});
                return;
            }

            self.req.pencilblue_preview = item[pb.DAO.getIdField()].toString();
            switch(vars.type) {
                case 'page':
                    self.req.pencilblue_page = item[pb.DAO.getIdField()].toString();
                    this.page = item;
                    break;
                case 'article':
                default:
                    self.req.pencilblue_article = item[pb.DAO.getIdField()].toString();
                    this.article = item;
                    break;
            }
            //Preview.super_.prototype.render.apply(self, [cb]);
            var controller = new Article();
            controller.renderArticle(this.article, cb);
        });
    };

    Preview.prototype.getPageTitle = function() {
        return article.name;
    };

    Preview.getRoutes = function(cb) {
        var routes = [{
            method: 'get',
            path: "/preview/:type/:id",
            access_level: pb.SecurityService.ACCESS_WRITER,
            auth_required: true,
            content_type: 'text/html'
        }];
        cb(null, routes);
    };

    //exports
    return Preview;
};
