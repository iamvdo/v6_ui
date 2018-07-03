import DocumentEditingController from '../document/document-editing.controller';

/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.JQLite} $element Element.
 * @param {angular.Attributes} $attrs Attributes.
 * @param {angular.$http} $http
 * @param {Object} $uibModal modal from angular bootstrap.
 * @param {angular.$compile} $compile Angular compile service.
 * @param {app.Lang} LangService Lang service.
 * @param {app.Authentication} AuthenticationService
 * @param {ngeo.Location} ngeoLocation ngeo Location service.
 * @param {app.Alerts} appAlerts
 * @param {app.Api} ApiService Api service.
 * @param {string} authUrl Base URL of the authentication page.
 * @param {app.Document} DocumentService
 * @param {app.Url} appUrl URL service.
 * @constructor
 * @extends {app.DocumentEditingController}
 * @ngInject
 */
export default class XreportEditingController extends DocumentEditingController {
  constructor($scope, $attrs, $http, $uibModal, $compile, LangService, AuthenticationService,
    AlertsService, ApiService, authUrl, DocumentService, UrlService) {
    'ngInject';

    super($scope, $attrs, $http, $uibModal, $compile, LangService, AuthenticationService, AlertsService,
      ApiService, authUrl, DocumentService, UrlService);

    /**
     * Start cannot be after today nor end_date.
     * @type {Date}
     * @export
     */
    this.dateMaxStart = new Date();

    /**
     * @type {Date}
     * @export
     */
    this.today = new Date();

    if (this.auth.isAuthenticated()) {

      this.scope[this.modelName]['associations']['users'].push({
        'document_id': this.auth.userData.id,
        'name': this.auth.userData.name,
        'locales': [
          {
            'lang': this.auth.userData.lang
          }
        ]
      });
    }
  }

  /**
   * @param {appx.Document} data
   * @return {appx.Document}
   * @override
   * @public
   */
  filterData(data) {
    data['date'] = new Date(data['date']);
    return data;
  }


  /**
   * @param {appx.Document} data Document attributes.
   * @return {appx.Document}
   * @public
   */
  prepareData(data) {
    if (data['anonymous']) {
      data['associations']['users'] = [];
    }
    return data;
  }
}
