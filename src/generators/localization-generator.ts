
export class LocalizationGenerator {
    
    generateDelegate(supportedLangs: string[]): string {
        let code = 
`import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'localizations.dart';

class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const AppLocalizationsDelegate();
  
  @override
  bool isSupported(Locale locale) => [${supportedLangs.map(a => `"${a}"`).join(', ')}].contains(locale.languageCode);
  
  @override
  Future<AppLocalizations> load(Locale locale) {
    // Returning a SynchronousFuture here because an async "load" operation
    // isn't needed to produce an instance of AppLocalizations.
    return SynchronousFuture<AppLocalizations>(AppLocalizations(locale));
  }
  
  @override
  bool shouldReload(AppLocalizationsDelegate old) => false;
}`;
        return code;
    }
    
    generateLocalization(langs: { [name: string]: string }): string {
        const langsTranslation = this.generateLangsTranslation(langs);
        let code = 
`import 'package:flutter/widgets.dart';

class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  String getTranslation(String key) {
    final lang = _localizedValues[locale.languageCode];
    if (lang != null) {
      return lang[key];
    }
    return null;
  }

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static Map<String, Map<String, String>> _localizedValues = {
    ${langsTranslation.join(',\n    ')}
  };
}`;
        return code;
    }
    
    private generateLangsTranslation(langs: { [name: string]: string; }): string[] {
        const codes: string[] = [];
        Object.keys(langs).forEach(lang => {
            const data = JSON.parse(langs[lang]);
            const code = `"${lang}": {\n      ${this.generateLangTranslation(data)}\n    }`;
            codes.push(code);
        });
        return codes;
    }

    private generateLangTranslation(data: any): string {
        const codes: string[] = [];
        
        Object.keys(data).forEach(key => {
            codes.push(`"${key}": "${data[key]}"`);
        });

        return codes.join(',\n      ');
    }
}