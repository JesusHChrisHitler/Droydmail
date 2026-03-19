export function Spinner({ className = "w-8 h-8" }) {
  return (
    <div className={`border-2 border-primary border-t-transparent rounded-full animate-spin ${className}`} />
  );
}