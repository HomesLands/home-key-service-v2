import * as AgendaInstance from "agenda";
import * as AgendashInstance from "agendash";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as express from "express";
import * as fs from "fs";
import * as http from "http";
import * as lodash from "lodash";
import * as logger from "morgan";
import * as path from "path";
import "reflect-metadata";
import * as swaggerJSDoc from "swagger-jsdoc";
import * as swaggerUi from "swagger-ui-express";
import * as logrotate from "logrotator";
import initGlobalVariables from "./constants";
import Agenda from "./services/agenda";
import HttpResponse from "./services/response";
import CustomResponse from "./services/response/customResponse";
import passportStrategies from "./config/passport";
import { helpers } from "./utils";
import * as fileupload from "express-fileupload";

// Rotation is based on copying the file contents and then truncating the file size to 0.
const rotator = logrotate.rotator;

// Load environment variables from .env file
dotenv.config();

(async () => {
  // Init global variables
  await initGlobalVariables();

  // Create Express server
  const app: express.Express = express();

  // Set view engine
  app.set('view engine', 'ejs');

  app.use(fileupload());
  app.use(express.urlencoded({ extended: true }));

  // CORS configuration
  app.use(cors({
    origin: "*", // Adjust this to specific origins in production
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));

  // Express configuration
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Logger configuration
  if (process.env.NODE_ENV === "development") {
    const logDirectory = path.resolve("logs");
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory);
    }
    const logPath = path.join(process.cwd(), "/logs/access.log");
    const accessLogStream = fs.createWriteStream(logPath, { flags: "a" });
    app.use(logger("combined", { stream: accessLogStream }));

    rotator.register(logPath, {
      schedule: "30m",
      size: "10m",
      compress: true,
      count: 3,
    });

    rotator.on("error", (err) => {
      console.error("Error during log rotation", err);
    });

    rotator.on("rotate", (file) => {
      console.log(`File ${file} was rotated`);
    });
  }

  app.use(logger("dev"));

  // Swagger configuration
  const swaggerDefinition = {
    info: {
      title: "Home Key APIs",
      version: "1.0.0",
    },
    basePath: "/api",
    securityDefinitions: {
      auth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
      },
    },
  };

  const filenameExtension = process.env.NODE_ENV === "local" ? "ts" : "js";
  const basePath = process.env.NODE_ENV === "local" ? "./src/" : "./build/";
  const lookupFolders = [
    path.join(basePath, "controllers"),
    path.join(basePath, "models"),
  ];

  const swaggerApis = [];
  lodash.forEach(lookupFolders, (lookupFolder) => {
    const directories = helpers.getDirectories(lookupFolder);
    lodash.forEach(directories, (directory) => {
      swaggerApis.push(path.join(directory, `*.${filenameExtension}`));
    });
  });

  const options = {
    swaggerDefinition,
    apis: swaggerApis,
  };

  const swaggerSpec = swaggerJSDoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Agenda dashboard configuration
  const agenda = new AgendaInstance({
    db: {
      address: global.configs.agenda.dbUri,
      collection: "scheduleJobs",
      options: {
        useNewUrlParser: true,
      },
    },
  });
  app.use("/agenda/dashboard", AgendashInstance(agenda));

  // Passport initialization
  passportStrategies(app);

  // Middleware to check tenant code
  // Uncomment and implement if needed
  // app.use(async (req, res, next) => {
  //   let tenantCode = req.get('code');
  //   if (tenantCode) {
  //     await global.mongoInstances['default'].updateCurrentConnectionByTenantCode(
  //       tenantCode, global.connections['default']);
  //     global.mongoModel = initModel(global.connections.currentTenantConnection);
  //   }
  //   next();
  // });

  // Import public routers
  const initPublicRouter = await import("./routes");
  initPublicRouter(app);

  // Set template engine
  app.set("views", "src/views");
  app.set("view engine", "hbs");

  // Serve static files
  app.use(express.static(path.resolve("public")));
  app.use(express.static(path.resolve("src/views")));
  app.use("/images/", express.static(path.resolve("public/images")));

  // Test socket client
  app.get("/socketClient", (req, res) => {
    res.sendFile(path.join(process.cwd(), "/public/socketClient.html"));
  });

  // Catch 404 and forward to error handler
  app.use((req, res, next) => {
    const error = HttpResponse.returnErrorWithMessage(`Not found: ${req.method} ${req.originalUrl}`);
    res.status(404);
    next(error);
  });

  // Error handling
  app.use((err, req, res, next) => {
    if (err instanceof CustomResponse && res.statusCode !== null) {
      res.json(err);
    } else {
      res.status(500);
      HttpResponse.returnInternalServerResponseWithMessage(res, err.message);
    }
  });

  // Create http server with express
  const httpServer = http.createServer(app);

  // Start Express server
  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`App is running at http://localhost:${port} in ${app.get("env")} mode`);
    console.log("Press CTRL-C to stop\n");
  });

  // Allow maximum 20 mongo connection listener
  process.setMaxListeners(20);

  // Init agenda
  global.agendaInstance = new Agenda();
})();
