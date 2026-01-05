# Contributing to PALO Framework

First off, thank you for considering contributing to PALO! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 📜 Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@paloframework.org.

---

## 🤔 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and expected**
- **Include screenshots if applicable**
- **Note your browser and version**

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any similar features in other projects if applicable**

### 📝 Documentation

- Fix typos or clarify language
- Add missing documentation
- Improve code comments
- Write tutorials or guides

### 🌍 Translations

We welcome translations! Currently available:
- 🇬🇧 English (default)
- 🇮🇹 Italian (partial)

To add a new language:
1. Copy the English version of the file
2. Add language suffix (e.g., `_DE.html` for German)
3. Translate all content
4. Submit a pull request

---

## 💻 Development Setup

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor (VS Code recommended)
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/palo.git
cd palo

# Create a branch for your feature
git checkout -b feature/your-feature-name

# Start a local server (optional, but recommended for testing)
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

---

## 🎨 Style Guidelines

### HTML

- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Maintain consistent indentation (4 spaces)
- Include `alt` attributes for all images

### CSS

- Use CSS custom properties (variables) for colors
- Follow BEM naming convention where applicable
- Ensure responsive design (mobile-first)
- Test in multiple browsers

### JavaScript

- Use vanilla JavaScript (no frameworks required)
- Add comments for complex logic
- Ensure keyboard navigation works
- Handle errors gracefully

### Accessibility

All contributions must maintain WCAG 2.1 AA compliance:
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Keyboard navigable
- ✅ Screen reader compatible
- ✅ Focus indicators visible

---

## 🔄 Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### PR Checklist

- [ ] My code follows the style guidelines
- [ ] I have tested in multiple browsers
- [ ] I have updated documentation if needed
- [ ] I have added tests if applicable
- [ ] My changes generate no new warnings
- [ ] I have checked accessibility compliance

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Celebrate! 🎉

---

## ❓ Questions?

Feel free to open an issue with the tag `question` or reach out to the maintainers.

---

**Thank you for contributing to responsible AI governance! 🛡️**
