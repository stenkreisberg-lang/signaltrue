## Description
<!-- Provide a clear and concise description of your changes -->

## Type of Change
<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style/formatting update
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test updates
- [ ] 🔧 Configuration change

## Related Issues
<!-- Link related issues here -->
Fixes #(issue number)

## Changes Made
<!-- List the key changes in bullet points -->

- 
- 
- 

## Testing
<!-- Describe the tests you ran and how to reproduce them -->

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

### How to Test
```bash
# Steps to test your changes
```

## Checklist
<!-- Mark completed items with an "x" -->

### Code Quality
- [ ] My code follows the project's code style guidelines
- [ ] I have run `npm run lint:fix` and resolved all linting errors
- [ ] I have run `npm run format` to format my code
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas

### Testing
- [ ] All existing tests pass (`npm test`)
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Test coverage has not decreased

### Security
- [ ] My changes don't introduce security vulnerabilities
- [ ] I have added input validation where necessary
- [ ] Sensitive data is not logged or exposed
- [ ] Dependencies are up to date and have no known vulnerabilities

### Documentation
- [ ] I have updated the documentation accordingly
- [ ] I have added JSDoc comments for new functions
- [ ] API changes are documented (if applicable)
- [ ] README is updated (if needed)

### Backend Specific (if applicable)
- [ ] Database migrations are included (if schema changed)
- [ ] Error handling is implemented
- [ ] Input validation is added to new routes
- [ ] New endpoints are properly secured with authentication/authorization

### Frontend Specific (if applicable)
- [ ] Components are properly typed (TypeScript)
- [ ] Accessibility standards are followed
- [ ] Responsive design is implemented
- [ ] No console errors or warnings

## Screenshots/Videos
<!-- If applicable, add screenshots or videos to demonstrate your changes -->

## Performance Impact
<!-- Describe any performance implications of your changes -->

- [ ] No significant performance impact
- [ ] Performance improved
- [ ] Performance may be affected (explain below)

## Breaking Changes
<!-- If this PR introduces breaking changes, describe them here -->

## Additional Notes
<!-- Add any other context about the PR here -->

## Deployment Notes
<!-- Any special deployment considerations? Environment variables? Database migrations? -->

---

**Before submitting:**
1. Pre-commit hooks should have run automatically (linting + formatting)
2. All tests should pass: `npm test` (frontend) and `cd backend && npm test` (backend)
3. No merge conflicts with the base branch
4. Ready for review by at least one team member
