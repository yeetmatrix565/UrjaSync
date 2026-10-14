'use client';

import { Children, type ReactNode } from 'react';

/**
 * Square cards, two to a row on a phone, widening to three or four as the
 * viewport allows. Cards flow into it rather than defining their own layout.
 * Rendered as a list so assistive tech hears "list, 7 items" instead of a
 * flat run of links; each <li> is a plain wrapper — the card inside is the
 * interactive element and keeps its own focus ring.
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4">
      {Children.map(children, (child) => (
        <li className="min-w-0">{child}</li>
      ))}
    </ul>
  );
}
