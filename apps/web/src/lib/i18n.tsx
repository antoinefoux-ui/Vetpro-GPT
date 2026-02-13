import { createContext, useContext, useMemo, useState } from "react";

type Lang = "en" | "sk";

const messages: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Program Dashboard",
    login: "Staff Login",
    logout: "Logout",
    language: "Language"
  },
  sk: {
    dashboard: "Prehľad programu",
    login: "Prihlásenie personálu",
    logout: "Odhlásiť",
    language: "Jazyk"
  }
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string) => messages[lang][key] ?? key
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
