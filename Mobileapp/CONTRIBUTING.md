# Contributing to Nearme

This guide will help you understand the codebase structure and development workflow.

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Firebase credentials
4. Start the dev server: `npm start`

## Code Style

### TypeScript

- Use strict TypeScript mode
- Define proper types for all props and return values
- Use interfaces for object types
- Avoid `any` type

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic to custom hooks
- Use `Screen` wrapper for all screens

### Styling

- Use NativeWind classes for styling
- Follow Tailwind naming conventions
- Use design tokens from `tailwind.config.js`
- Avoid inline styles

### File Naming

- Components: PascalCase (e.g., `Button.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useAuth.tsx`)
- Services: camelCase (e.g., `firebase.ts`)
- Routes: kebab-case (e.g., `onboarding.tsx`)

## Project Architecture

### Providers Hierarchy

```
QueryClientProvider
  └─ AuthProvider
      └─ ThemeProvider
          └─ NavigationGuard
              └─ App Routes
```

This order is important and should not be changed.

### Routing Rules

1. All public routes go in `app/(public)/`
2. All protected routes go in `app/(protected)/`
3. Navigation logic lives in `NavigationGuard`
4. Never hardcode route logic in individual screens

### State Management

- **Global Auth State**: `AuthProvider` + `useAuth` hook
- **Onboarding State**: `AsyncStorage` + `useOnboarding` hook
- **Server State**: TanStack Query
- **Local State**: React `useState`

### Adding New Features

#### Adding a New Screen

1. Create file in appropriate route group
2. Use `Screen` component wrapper
3. Import necessary hooks (`useAuth`, etc.)
4. Add navigation if needed

#### Adding a New Provider

1. Create provider in `src/providers/`
2. Add to provider hierarchy in `app/_layout.tsx`
3. Create corresponding hook in `src/hooks/`
4. Export types in `src/types/`

#### Adding a New UI Component

1. Create component in `src/components/ui/`
2. Use NativeWind for styling
3. Make it reusable (accept className prop)
4. Document prop types with TypeScript

## Testing Your Changes

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Manual Testing

- Test on both iOS and Android
- Test in both light and dark mode
- Test the full user flow (onboarding → auth → app)
- Test logout and re-login

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

### Commit Messages

Use conventional commits:

- `feat: Add dark mode toggle`
- `fix: Resolve login error handling`
- `refactor: Simplify navigation logic`
- `docs: Update README with new setup steps`

## Common Patterns

### Async Operations

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await someAsyncOperation();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Form Handling

```typescript
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const handleSubmit = async () => {
  if (!email) {
    setError('Email is required');
    return;
  }
  // Process form
};
```

### Using TanStack Query

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['items'],
  queryFn: fetchItems,
});

if (isLoading) return <Loader />;
if (error) return <ErrorView />;
return <ItemsList items={data} />;
```

## Performance Best Practices

1. Use `React.memo()` for expensive components
2. Memoize callbacks with `useCallback()`
3. Memoize computed values with `useMemo()`
4. Lazy load heavy screens
5. Optimize images (use WebP when possible)

## Security Best Practices

1. Never commit `.env` file
2. Validate all user inputs
3. Use Firebase security rules
4. Don't expose sensitive data in client code
5. Keep dependencies updated

## Questions?

If you have questions about the architecture or need help, please open an issue.
