export type Language = 'EN' | 'AR';

export const isRTL = (language: Language): boolean => language === 'AR';

export const getDirection = (language: Language): 'rtl' | 'ltr' =>
  isRTL(language) ? 'rtl' : 'ltr';

export const rtlClass = (language: Language, rtlClass: string, ltrClass: string = ''): string =>
  isRTL(language) ? rtlClass : ltrClass;

export const mirrorValue = (language: Language, rtlValue: any, ltrValue: any = rtlValue): any =>
  isRTL(language) ? rtlValue : ltrValue;

export const getFlexDirection = (language: Language, defaultDirection: 'row' | 'col' = 'row'): 'row' | 'col' | 'row-reverse' | 'col-reverse' => {
  if (defaultDirection === 'row') {
    return isRTL(language) ? 'row-reverse' : 'row';
  }
  return defaultDirection;
};

export const getTextAlign = (language: Language, alignment: 'left' | 'right' | 'center' = 'left'): 'text-left' | 'text-right' | 'text-center' => {
  if (alignment === 'center') return 'text-center';
  if (alignment === 'left') {
    return isRTL(language) ? 'text-right' : 'text-left';
  }
  return isRTL(language) ? 'text-left' : 'text-right';
};

export const getPaddingClass = (language: Language, side: 'l' | 'r', size: string): string => {
  if (isRTL(language)) {
    return side === 'l' ? `pr-${size}` : `pl-${size}`;
  }
  return side === 'l' ? `pl-${size}` : `pr-${size}`;
};

export const getMarginClass = (language: Language, side: 'l' | 'r', size: string): string => {
  if (isRTL(language)) {
    return side === 'l' ? `mr-${size}` : `ml-${size}`;
  }
  return side === 'l' ? `ml-${size}` : `mr-${size}`;
};

export const getTransformClass = (language: Language, rtlTransform: string, ltrTransform: string = ''): string =>
  isRTL(language) ? rtlTransform : ltrTransform;
