/**
 * @module app.HttpAuthenticationInterceptor
 */
import appBase from './index.js';

/**
 * @ngInject
 * @param {string} apiUrl Base URL of the API.
 * @param {app.Authentication} AuthenticationService
 * @return {angular.$http.Interceptor}
 */
const exports = function(apiUrl, AuthenticationService) {
  return {
    'request': (
      /**
       * @param {!angular.$http.Config} config
       * @return {!angular.$http.Config}
       */
      function(config) {
        const method = config.method;
        const url = config.url;
        goog.asserts.assert(method && url);
        if (AuthenticationService.needAuthorization(method, url)) {
          config.headers = config.headers || {};
          AuthenticationService.addAuthorizationToHeaders(url, config.headers);
        }
        return config;
      }
    )
  };
};

appBase.module.factory('appHttpAuthenticationInterceptor',
  exports);


export default exports;
