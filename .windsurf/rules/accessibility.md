---
trigger: glob
globs: **/*.{jsx,tsx,html}
---

# Accessibility Guidelines (WCAG)

<semantic_html>
- Use proper HTML5 semantic elements (header, nav, main, section, article, aside, footer)
- Ensure proper heading hierarchy (h1 → h2 → h3)
- Use landmark elements for screen reader navigation
- Provide skip links for navigation
</semantic_html>

<aria_labels>
- Add descriptive aria-labels for interactive elements without text
- Use aria-describedby for additional context
- Implement proper aria-expanded states for collapsible content
- Use aria-live regions for dynamic content updates
- Add aria-hidden to decorative elements
</aria_labels>

<keyboard_navigation>
- Ensure all interactive elements are keyboard accessible
- Implement proper focus management
- Add visible focus indicators
- Support tab navigation in logical order
- Provide keyboard alternatives for mouse actions
</keyboard_navigation>

<visual_accessibility>
- Ensure sufficient color contrast (4.5:1 for normal text)
- Don't rely on color alone to convey information
- Support text resizing up to 200%
- Use responsive design for different screen sizes
- Provide alt text for meaningful images
</visual_accessibility>

<forms_accessibility>
- Associate labels with form inputs
- Provide field descriptions and error messages
- Use proper input types and attributes
- Implement form validation with clear error messages
- Support autocomplete where appropriate
</forms_accessibility>
