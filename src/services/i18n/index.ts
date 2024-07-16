import * as i18n from 'i18n'


export default class i18nService {
    private availableLanguages: string[];
    private defaultLanguage: string;

    constructor(configs: i18nConfigs, mode?: string) {
        // Kiểm tra nếu availableLanguages không được cung cấp hoặc rỗng
        // this.availableLanguages = configs.availableLanguages.split(',');

        this.defaultLanguage = configs.defaultLanguage;

        // Configure multi language
        i18n.configure({
            locales: this.availableLanguages,
            defaultLocale: this.defaultLanguage,
            directory: mode === 'local' ? './src/locales' : (mode === 'development' ? './locales' : './locales'),
            autoReload: true, // Watch for changes in json files to reload locale on updates - defaults to false,
            updateFiles: false, // Whether to write new locale information to disk - defaults to true
        });
    }


    // Get language by request header
    static getLangFromRequest(res: any): string {
        return res.req.headers['lang'];
    }

    // Translate message by language
    public translate(string: string, lang?: string): any {

        // Return translation data with language in list
        if (lang && this.availableLanguages.toString().includes(lang)) {
            return i18n.__({ phrase: string, locale: lang })
        }

        // Return translation data with default language
        return i18n.__({ phrase: string, locale: this.defaultLanguage })
    }
}