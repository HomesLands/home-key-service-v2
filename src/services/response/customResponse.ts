import i18nService from '../i18n';

export default class CustomResponse implements CustomResponse {
  error: boolean = false;
  data: any = null;
  errors: ErrorObject[] = [];

  constructor(data?: any, errors?: any, lang?: string) {
    // Init i18n service
    let i18n = global.i18n;

    // Response data
    this.data = data;

    // Response error
    if (errors) {
      this.error = true;
      this.errors = this.getErrorResponse(i18n, errors, lang);
    }
  }

  // Get error response data
  private getErrorResponse(i18n: i18nService, data: any, lang?: string): ErrorObject[] {
    let errors = [];

    // Code arrays
    if (typeof data === 'object') {
      data.map(code => {
        errors.push(this.getError(i18n, code, lang));
      });
    } else {
      // String (error code string or message string)
      errors.push(this.getError(i18n, data, lang));
    }

    return errors;
  }

  // Get error translate by language
  private getError(i18n: i18nService, data: any, lang?: string): ErrorObject {
    // Translate the error
    let error = i18n.translate(data, lang);

    let errorObject = null;

    if (error && error.code) {
      errorObject = {
        errorCode: error.code,
        errorMessage: error.message,
      };
    } else {
      // Translate the error
      error = i18n.translate('system.customMessage', lang);

      errorObject = {
        errorCode: error.code,
        errorMessage: data,
      };
    }

    return errorObject;
  }
}
