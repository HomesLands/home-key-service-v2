import * as mongoose from 'mongoose';

export default class MongoDb {
    private mongoose: mongoose;
    private serverConfigs: any;
    private dbConfigs: any;
    private isDisconnected: boolean;
    private masterConnection: any;
    private tenantCode: string = null;

    constructor(dbConfigs: object, serverConfigs: object, tenantCode?: string) {
        this.mongoose = mongoose;
        // Store this mongoose instance
        global.mongoose = this.mongoose;
        this.isDisconnected = false;
        this.serverConfigs = serverConfigs;
        this.dbConfigs = dbConfigs;
        if (tenantCode) {
            this.tenantCode = tenantCode;
        }
    }

    // Create the connection
    public async createConnection(): Promise<object> {
        try {
            // Create the master connection to database createConnection or connect
            this.masterConnection = await this.mongoose.createConnection(this.dbConfigs.dbUri, this.serverConfigs);

            // Create listener on master connection
            this.onConnectionListener(this.masterConnection);

            //Use another tenant  without creating additional connections
            const currentTenantConnection = this.masterConnection.useDb(this.tenantCode ? this.tenantCode : this.dbConfigs.defaultTenantCode);
            
            // Store this tenants
            let tenants = {};
            tenants[this.dbConfigs.tenantCode] = currentTenantConnection;

            return {
                masterConnection: this.masterConnection,
                currentTenantConnection,
                tenants,
            };
        } catch (err) {
            return {};
        }
    }

    // Get tenant connection by tenant code
    public async getTenantConnectionByTenantCode(code: string, connections: MongoConnection): Promise<any> {
        let connection;
        let isNew = false;
        // If connection to this db already opened
        if (connections.tenants[code]) {
            connection = connections.tenants[code];
        } else { // If not, switch to the new one
            isNew = true;
            connection = this.masterConnection.useDb(code);
        }

        return {
            connection,
            isNew
        };
    }

    // Update current connection by the new one by code
    public async updateCurrentConnectionByTenantCode(code: string, connections: MongoConnection): Promise<MongoConnection> {
        // Get new connection
        const {connection, isNew} = await this.getTenantConnectionByTenantCode(code, connections);

        // Update
        connections.currentTenantConnection = connection;
        connections.tenants[code] = connection;

        return isNew
    }

    // Connection listener
    private onConnectionListener(connection: any): void {
        connection.on('connected', () => {
            try {
                if (this.isDisconnected) {
                    this.isDisconnected = false;
                    process.send({
                        type: 'reload',
                    });
                }
            } catch (err) {
            }
        });

        connection.on('disconnected', () => {
            try {
                // Reconnect to mongo
                this.isDisconnected = true;

                setTimeout(() => {
                    this.createConnection();
                }, this.serverConfigs.reconnectInterval);


            } catch (err) {
            }
        });
    }
}