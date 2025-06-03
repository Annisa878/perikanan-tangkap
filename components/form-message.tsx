"use client";

export type Message = {
  success?: string;
  error?: string;
  // Allow any other properties that might come from searchParams
  [key: string]: any;
};

export function FormMessage({ message }: { message: Message }) {
  // If message is null or undefined, or has no success/error, don't render
  if (!message || (message.success === undefined && message.error === undefined)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-md text-sm">
      {message.success !== undefined && (
        <div className="text-foreground border-l-2 border-foreground px-4 py-2 bg-green-50 border-green-500 text-green-700 rounded">
          {message.success}
        </div>
      )}
      {message.error !== undefined && (
        <div className="text-destructive-foreground border-l-2 border-destructive px-4 py-2 bg-red-50 border-red-500 text-red-700 rounded">
          {message.error}
        </div>
      )}
    </div>
  );
}