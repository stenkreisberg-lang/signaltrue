# Contributing to SignalTrue

Thank you for your interest in contributing to SignalTrue! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and professional environment. We are committed to providing a welcoming and inclusive experience for everyone.

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- MongoDB (local or cloud instance)
- Git

### Initial Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/stenkreisberg-lang/signaltrue.git
cd signaltrue
```

2. **Install dependencies:**
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

3. **Set up environment variables:**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

4. **Run the application:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm start
```

---

## Development Workflow

### Branch Strategy

We follow a simplified Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Work on your feature...

# Push to your fork
git push origin feature/your-feature-name
```

### Pre-Commit Hooks

We use Husky to run automated checks before commits:

- **ESLint** - Lints and auto-fixes code
- **Prettier** - Formats code
- **Backend linting** - If backend files changed

If the pre-commit hook fails:
```bash
npm run lint:fix      # Fix linting errors
npm run format        # Format code
git add .
git commit -m "..."   # Try again
```

---

## Code Style Guidelines

### General Principles

- Write clean, readable, and maintainable code
- Follow the Single Responsibility Principle
- Keep functions small and focused
- Use meaningful variable and function names
- Comment complex logic

### JavaScript/TypeScript

- **Use ES6+ features:** arrow functions, destructuring, template literals
- **Async/await over callbacks:** For asynchronous operations
- **Avoid `var`:** Use `const` by default, `let` when necessary
- **No magic numbers:** Use named constants

```javascript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const isValid = checkValidation(data);

// ❌ Bad
const x = 3;
if (checkValidation(data) === true) { }
```

### React Components

- **Use functional components** with hooks
- **TypeScript types** for all props
- **Destructure props** in function signature
- **Keep components small** (<200 lines)

```typescript
// ✅ Good
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return <div>{user.name}</div>;
};
```

### Backend Routes

- **Always use input validation**
- **Wrap async functions** with catchAsync
- **Return consistent responses**

```javascript
import { validateProjectCreation } from '../middleware/validation.js';
import { catchAsync } from '../middleware/errorHandler.js';

router.post('/projects',
  validateProjectCreation,
  catchAsync(async (req, res) => {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  })
);
```

### File Naming

- **React components:** PascalCase (`UserProfile.tsx`)
- **Utilities:** camelCase (`formatDate.js`)
- **Routes:** camelCase (`userRoutes.js`)
- **Models:** PascalCase (`User.js`)

---

## Testing Requirements

### Unit Tests

All new features and bug fixes must include tests.

**Backend:**
```bash
cd backend
npm test              # Run tests
npm run test:coverage # With coverage
npm run test:watch    # Watch mode
```

**Frontend:**
```bash
npm test              # Run tests
npm test -- --coverage # With coverage
```

### Test Coverage Requirements

- **Minimum:** 40% overall coverage
- **New code:** Aim for 80%+ coverage
- **Critical paths:** 100% coverage (auth, payment, data processing)

### Writing Tests

```javascript
import { describe, test, expect } from '@jest/globals';

describe('FeatureName', () => {
  test('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Testing Checklist

- [ ] Unit tests for new functions
- [ ] Integration tests for new routes
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] All tests pass locally

---

## Pull Request Process

### Before Submitting

1. **Update from main:**
```bash
git checkout main
git pull origin main
git checkout your-branch
git rebase main
```

2. **Run all checks:**
```bash
npm run lint          # Frontend
npm test              # Frontend
cd backend
npm run lint          # Backend
npm test              # Backend
```

3. **Verify build:**
```bash
npm run build
```

### PR Checklist

Use the PR template and ensure:

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Test coverage maintained/improved
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Input validation added (backend)
- [ ] Error handling implemented
- [ ] Self-review completed

### Review Process

1. Submit PR with clear description
2. Wait for automated CI checks to pass
3. Request review from at least one team member
4. Address all review comments
5. Squash commits if requested
6. PR will be merged by maintainers

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(auth): add password reset functionality

Implemented email-based password reset with token expiration.
Includes email template and validation.

Closes #123

---

fix(api): prevent duplicate user creation

Added unique constraint check before user creation
to handle race conditions.

---

docs(readme): update installation instructions

Added MongoDB setup steps and environment variable
configuration examples.
```

### Best Practices

- Use imperative mood ("add" not "added")
- Keep subject line under 72 characters
- Reference issues in footer
- Explain "what" and "why" in body, not "how"

---

## Project-Specific Guidelines

### Backend Development

1. **Always validate input:**
```javascript
import { body, validateRequest } from '../middleware/validation.js';

router.post('/',
  body('email').isEmail(),
  validateRequest,
  handler
);
```

2. **Use async/await with error handling:**
```javascript
import { catchAsync } from '../middleware/errorHandler.js';

router.get('/', catchAsync(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

3. **Consistent error responses:**
```javascript
// Automatic via error handler
throw new AppError('Resource not found', 404);

// Or manual
res.status(400).json({
  status: 'error',
  message: 'Validation failed',
  errors: [...]
});
```

### Frontend Development

1. **Use TanStack Query for data fetching:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

2. **Type all component props:**
```typescript
interface Props {
  user: User;
  onSave: (user: User) => void;
}
```

3. **Handle loading and error states:**
```typescript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### Database Migrations

Currently no migration system is in place. When modifying Mongoose schemas:

1. Document breaking changes in PR
2. Coordinate with team for production updates
3. Consider backward compatibility

---

## Getting Help

- **Questions:** Open a discussion on GitHub
- **Bugs:** Create an issue using the bug report template
- **Features:** Create an issue using the feature request template
- **Security:** Email security concerns (don't create public issues)

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to SignalTrue! 🎉
