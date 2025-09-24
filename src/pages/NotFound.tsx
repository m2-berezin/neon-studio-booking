import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary neon-glow">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
        <Link 
          to="/" 
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors tap-target"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
