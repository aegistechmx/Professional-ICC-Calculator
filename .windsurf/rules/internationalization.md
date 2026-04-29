---
trigger: glob
globs: **/*.{js,jsx,ts,tsx,json}
---

# Internationalization Guidelines (i18n, l10n)

<text_externalization>
- Never hardcode user-facing text in components
- Use i18n keys for all translatable content
- Extract text to translation files (JSON, YAML, etc.)
- Use meaningful key names (e.g., 'calculator.input.voltage' not 'text1')
</text_externalization>

<translation_management>
- Organize translations by feature/module
- Use namespace-based translation keys
- Provide fallback language (usually English)
- Keep translations consistent across languages
- Use pluralization rules correctly
</translation_management>

<date_and_numbers>
- Use locale-aware date formatting
- Format numbers according to locale conventions
- Handle currency and unit conversions properly
- Use timezone-aware date handling
- Consider right-to-left (RTL) language support
</date_and_numbers>

<ui_considerations>
- Design for text expansion (German can be 30% longer than English)
- Use flexible layouts that accommodate different text lengths
- Test with various languages during development
- Consider cultural differences in colors and symbols
- Implement language switcher in UI
</ui_considerations>

<technical_implementation>
- Use established i18n libraries (react-i18next, next-i18next, etc.)
- Lazy load translation files for performance
- Implement proper language detection
- Store user language preference
- Handle missing translations gracefully
</technical_implementation>
