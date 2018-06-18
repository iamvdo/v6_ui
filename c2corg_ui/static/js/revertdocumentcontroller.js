/**
 * @module app.RevertDocumentController
 */
import appBase from './index.js';

/**
 * @param {app.Authentication} AuthenticationService
 * @param {app.Api} ApiService Api service.
 * @param {app.Alerts} appAlerts
 * @param {angularGettext.Catalog} gettextCatalog Gettext catalog.
 * @constructor
 * @ngInject
 */
const exports = function(AuthenticationService, ApiService, appAlerts, gettextCatalog) {

  /**
   * @type {app.Authentication}
   * @private
   */
  this.auth_ = AuthenticationService;

  /**
   * @type {app.Api}
   * @private
   */
  this.apiService_ = ApiService;

  /**
   * @type {app.Alerts}
   * @private
   */
  this.appAlerts_ = appAlerts;

  /**
   * @type {angularGettext.Catalog}
   * @private
   */
  this.gettextCatalog_ = gettextCatalog;
};


/**
 * @param {number} documentId
 * @param {string} lang
 * @param {number} versionId
 * @export
 */
exports.prototype.revert = function(
  documentId, lang, versionId) {
  const catalog = this.gettextCatalog_;
  const gettext = function(str) {
    return catalog.getString(str);
  };
  if (this.auth_.isModerator() && window.confirm(gettext(
    'Are you sure you want to revert to this version of the document?'
  ))) {
    this.apiService_.revertDocument(documentId, lang, versionId).then(
      (response) => {
        this.appAlerts_.addSuccess(gettext('Revert succeeded'));
      }
    );
  }
};

appBase.module.controller('appRevertDocumentController', exports);


export default exports;
