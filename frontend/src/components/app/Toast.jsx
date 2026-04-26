export default function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`app-toast toast-${toast.type}`}>
      {isError ? '⚠ ' : '✓ '}
      {toast.msg}
    </div>
  );
}
