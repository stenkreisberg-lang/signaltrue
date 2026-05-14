import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-lg px-6">
        <h1 className="mb-4 text-4xl font-bold text-foreground">This page is not here.</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          The signal is missing, but the site still works. Go back to SignalTrue and see how
          work-system friction becomes visible before it turns into bigger problems.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Back to homepage
        </a>
      </div>
    </div>
  );
};

export default NotFound;
