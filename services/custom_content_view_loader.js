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
var async       = require('async');
//var HtmlEncoder = require('htmlencode');

module.exports = function(pb) {

  //pb dependencies
  var util = pb.util;
  var DAO          = pb.DAO;
  var Localization = pb.Localization;
  var ClientJs     = pb.ClientJs;

  /**
   * Renders a 1 or more pieces of content such as articles or pages
   * @class CustomContentViewLoader
   * @constructor
   * @param {Object} context
   * @param {TemplateService} context.ts
   * @param {Localization} context.ls
   * @param {Object} [context.contentSettings]
   * @param {Object} context.session
   * @param {ContentObjectService} context.service
   * @param {String} context.activeTheme
   */
  function CustomContentViewLoader(context) {
    CustomContentViewLoader.super_.call(this, context);
  }
  util.inherits(CustomContentViewLoader, pb.ContentViewLoader);

  /**
   * @static
   * @method init
   */
  CustomContentViewLoader.init = function(cb) {
    pb.log.debug("CustomContentViewLoader: Initialized");
    cb(null, true);
  };

  /**
   *
   * @method getTemplate
   * @param {Array|Object} content
   * @param {Object} options
   * @param {Boolean} [options.useDefaultTemplate] Forces the default theme template to be selected
   * @param {Object} [options.topic] The topic represented by the collection of content to be rendered
   * @param {Object} [options.section] The section represented by the collection of content to be rendered
   * @param {Function} cb
   */
  CustomContentViewLoader.prototype.getTemplate = function(content, options, cb) {
    return cb(null, 'article');

    //CustomContentViewLoader.super_.prototype.getTemplate.apply(this, [content, options, cb]);
  };


  return CustomContentViewLoader;
};