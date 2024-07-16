export default (): { defaultLanguage: string; availableLanguages: string } => {
  return {
    defaultLanguage: process.env.DEFAULT_LANGUAGE,
    availableLanguages: process.env.AVAILABLE_LANGUAGE_LIST,
  };
};
