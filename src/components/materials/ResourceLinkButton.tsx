import { ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isExternalLink } from '@/lib/url-utils';

interface ResourceLinkButtonProps {
  url: string;
  title?: string;
  /** Compact icon-only variant for table rows */
  compact?: boolean;
}

/**
 * Opens a URL in a new browser tab using window.open().
 * This bypasses iframe sandbox restrictions that block target="_blank" anchor tags.
 */
function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Renders a professional button that opens a study material resource.
 * Uses window.open() to ensure links work even inside sandboxed iframes.
 */
export function ResourceLinkButton({ url, title = 'Resource', compact = false }: ResourceLinkButtonProps) {
  const external = isExternalLink(url);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openInNewTab(url);
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="hover:scale-110 transition-transform"
        onClick={handleClick}
        title={external ? 'Open in new tab' : 'Download file'}
      >
        {external ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button
      className="gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleClick}
    >
      {external ? (
        <>
          <ExternalLink className="h-4 w-4" />
          Open Assignment Resource
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download File
        </>
      )}
    </Button>
  );
}
