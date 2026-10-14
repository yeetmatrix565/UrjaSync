'use client';

import type { ReactNode } from 'react';

/**
 * Square cards, two to a row on a phone, widening to three or four as the
 * viewport allows. Cards flow into it rather than defining their own layout.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {children}
    </div>
  );
}
