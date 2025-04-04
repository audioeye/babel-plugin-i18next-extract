import { ExtractionError } from "./commons";
import extractCustomTransComponent from "./customTransComponent";
import extractCustomUseTranslationHook from "./customUseTranslationHook";
import extractGetClassMember from "./getClassMember";
import extractGetFixedTFunction from "./getFixedTFunction";
import extractI18nextInstance from "./i18nextInstance";
import extractTFunction from "./tFunction";
import extractTransComponent from "./transComponent";
import extractTranslationRenderProp from "./translationRenderProp";
import extractUseTranslationHook from "./useTranslationHook";
import extractWithTranslationHOC from "./withTranslationHOC";

export { ExtractionError };

/**
 * All extractors sorted by priority.
 */
export const EXTRACTORS_PRIORITIES = [
  extractCustomTransComponent.name,
  extractTransComponent.name,
  extractCustomUseTranslationHook.name,
  extractUseTranslationHook.name,
  extractGetFixedTFunction.name,
  extractTranslationRenderProp.name,
  extractWithTranslationHOC.name,
  extractGetClassMember.name,
  extractI18nextInstance.name,
  extractTFunction.name,
];

export default {
  extractCustomTransComponent,
  extractTransComponent,
  extractUseTranslationHook,
  extractCustomUseTranslationHook,
  extractGetFixedTFunction,
  extractTranslationRenderProp,
  extractWithTranslationHOC,
  extractGetClassMember,
  extractI18nextInstance,
  extractTFunction,
};
