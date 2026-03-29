type LoaderProps = {
  label?: string;
  size?: number;
  className?: string;
  color?: string;
};

export default function Loader({
  label = "Loading",
  size = 45,
  className = "",
  color = "#ffffff",
}: LoaderProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      aria-label={label}
      role="status"
    >
      <span className="loader" style={{ fontSize: `${size}px`, color }} />
    </div>
  );
}
