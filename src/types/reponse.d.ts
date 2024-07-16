// Custom response type
declare interface CustomResponse{
    error: boolean,
    data: any,
    errors: ErrorObject[]
}

// Error type
declare interface ErrorObject{
    errorCode: string;
    errorMessage: string;
}