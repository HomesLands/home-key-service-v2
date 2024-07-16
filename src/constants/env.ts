export interface IEnv {
  basePath: string;
  protocol: string;
  jwtSecret: string;
  defaultAccessUsername: string;
  defaultAccessPassword: string;
  hashSalt: string;
  branchKey: string;
  webBaseUrl: string;
  webBaseUrlUser: string;
  mode: string;
  homelandsBaseUrl: string;
  baseApiUrl: string;
}

export default (): IEnv => {
  return {
    basePath: process.env.BASE_PATH,
    protocol: process.env.PROTOCOL,
    jwtSecret: process.env.JWT_SECRET,
    defaultAccessUsername: process.env.DEFAULT_ACCESS_USERNAME,
    defaultAccessPassword: process.env.DEFAULT_ACCESS_PASSWORD,
    hashSalt: process.env.HASH_SALT,
    branchKey: process.env.BRANCH_KEY,
    webBaseUrl: process.env.WEB_BASE_URL,
    webBaseUrlUser: process.env.WEB_BASE_URL_USER,
    mode: process.env.NODE_ENV,
    homelandsBaseUrl: process.env.HOMELANDS_BASE_URL,
    baseApiUrl: process.env.BASE_API_URL,
  };
};
