import { PropsWithChildren } from "react";

export default function ExternalLink({
  href,
  children,
  className,
  title,
}: PropsWithChildren<{ href: string; className?: string; title?: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title ?? "新しいタブで開きます"}
      aria-label={title ?? "新しいタブで開きます"}
    >
      {children}
    </a>
  );
}
