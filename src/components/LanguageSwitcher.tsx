import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  language: 'EN' | 'AR';
  onLanguageChange: (language: 'EN' | 'AR') => void;
}

export default function LanguageSwitcher({ language, onLanguageChange }: LanguageSwitcherProps) {
  const toggleLanguage = () => {
    onLanguageChange(language === 'EN' ? 'AR' : 'EN');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 hover:from-blue-50 hover:to-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
      title="Toggle language"
      aria-label="Language switcher"
    >
      <Globe className="w-4 h-4 md:w-5 md:h-5" />
      <span className="text-sm md:text-base font-bold">{language}</span>
    </button>
  );
}
