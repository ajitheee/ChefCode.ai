import { useEffect } from 'react';

const SITE = 'ChefCode.ai';

/**
 * Sets the browser tab title for a page, and restores the previous one on
 * unmount. Every route used to share index.html's title, so a reviewer with
 * Privacy, Terms and the Security Overview open in three tabs saw three
 * identical tabs — and a bookmark or history entry could not say which page it
 * was. Pass the page name only; the site name is appended.
 */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = page ? `${page} — ${SITE}` : `${SITE} — AI Invoice Coding`;
    return () => {
      document.title = previous;
    };
  }, [page]);
}
