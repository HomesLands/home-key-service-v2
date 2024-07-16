import {
  SUCCESS_REQUEST,
  BAD_REQUEST_ERROR,
  UNAUTHORIZED_ERROR,
  ENTITY_DUPLICATION_ERROR,
  NOT_FOUND_ERROR,
  INTERNAL_SERVER_ERROR,
} from './constants';
import CustomResponse from './customResponse';
import i18nService from '../i18n';

export default class HttpResponse {
  // Return success with data
  static returnSuccessResponse(res: any, data: any): any {
    const obj = new CustomResponse(data);
    return res.status(SUCCESS_REQUEST).json(obj);
  }

  // Return not found error with codes
  static returnNotFoundResponse(res: any, errors: any): any {
    const obj = new CustomResponse({}, errors, i18nService.getLangFromRequest(res));
    return res.status(NOT_FOUND_ERROR).json(obj);
  }

  // Return not found error with message
  static returnNotFoundResponseWithMessage(res: any, errorMessage?: string): any {
    const obj = new CustomResponse({}, errorMessage, i18nService.getLangFromRequest(res));
    return res.status(NOT_FOUND_ERROR).json(obj);
  }

  // Return bad request error with codes
  static returnBadRequestResponse(res: any, errors: any): any {
    const obj = new CustomResponse({}, errors, i18nService.getLangFromRequest(res));
    return res.status(BAD_REQUEST_ERROR).json(obj);
  }

  // Return unauthorized error with codes
  static returnUnAuthorizeResponse(res: any, errors: any): any {
    const obj = new CustomResponse({}, errors, i18nService.getLangFromRequest(res));
    return res.status(UNAUTHORIZED_ERROR).json(obj);
  }

  // Return unauthorized error with message
  static returnUnAuthorizeResponseWithMessage(res: any, errorMessage: string): any {
    const obj = new CustomResponse({}, errorMessage, i18nService.getLangFromRequest(res));
    return res.status(UNAUTHORIZED_ERROR).json(obj);
  }

  // Return duplicated error with codes
  static returnDuplicateResponse(res: any, errors: any): any {
    const obj = new CustomResponse({}, errors, i18nService.getLangFromRequest(res));
    return res.status(ENTITY_DUPLICATION_ERROR).json(obj);
  }

  // Return internal server error with codes
  static returnInternalServerResponse(res: any, errors: any): any {
    const obj = new CustomResponse({}, errors, i18nService.getLangFromRequest(res));
    return res.status(INTERNAL_SERVER_ERROR).json(obj);
  }

  // Return internal server error with message
  static returnInternalServerResponseWithMessage(res: any, errorMessage: string): any {
    const obj = new CustomResponse({}, errorMessage, i18nService.getLangFromRequest(res));
    return res.status(INTERNAL_SERVER_ERROR).json(obj);
  }

  // Return error object with code and message
  static returnErrorWithMessage(errorMessage?: string, lang?: string): CustomResponse {
    return new CustomResponse({}, errorMessage, lang);
  }

  // Return error object with code and message
  static returnSuccess(data?: any): CustomResponse {
    return new CustomResponse(data ? data : 'Success');
  }

  // Return response with CustomResponse instance
  static returnErrorResponse(res: any, error: CustomResponse): any {
    return res.status(404).json(error);
  }
}
