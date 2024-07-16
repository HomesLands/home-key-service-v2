// Mongo connection instance type
declare interface MongoConnection{
    masterConnection: object,
    currentTenantConnection: object,
    tenants: object,
}