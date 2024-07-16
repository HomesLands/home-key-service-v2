// Global type define
declare namespace NodeJS {
  export interface Global {
    env: any; // Hold env value
    errorCodes: any; // Error codes and messages data
    configs: any; // Hold all current configs data
    connections: any; // Hold mongo db connections
    mongoModel: any; // Hold all mongo model instances
    mongoose: any; // Hold mongoose instance,
    mongoInstances: any; // Hold all mongoose instances,
    socket: any; // Hold current socket io instance,
    agendaInstance: any; // Hold agenda instance
    logger: any;
    i18n: any;
  }
}
