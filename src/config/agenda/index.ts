export default (): { dbUri: string; defaultTenantCode: string } => {
  return {
    dbUri: process.env.AGENDA_MONGO_DB_URI,
    defaultTenantCode: process.env.AGENDA_DEFAULT_TENANT_CODE,
  };
};
