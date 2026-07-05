import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

/**
 * Renders a 5-star rating display as an array of icon elements.
 *
 * WHY this exists: this exact star-rendering logic (full/half/empty star
 * counting) was duplicated across `CompaniesPage.tsx` and
 * `CompanyDetailPage.tsx`, differing only in icon size. Extracted here,
 * parameterized by size, so both pages share one implementation.
 *
 * @param rating - A rating from 0-5 (may be fractional, e.g. 3.5).
 * @param sizeClassName - Tailwind size classes applied to each star icon
 *   (defaults to the smaller of the two sizes previously used, `h-4 w-4`).
 * @returns An array of star icon elements suitable for direct rendering.
 */
export const renderStars = (rating: number, sizeClassName = 'h-4 w-4'): JSX.Element[] => {
  const stars: JSX.Element[] = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(<StarSolidIcon key={i} className={`${sizeClassName} text-yellow-400`} aria-hidden="true" />);
  }

  if (hasHalfStar) {
    stars.push(<StarIcon key="half" className={`${sizeClassName} text-yellow-400`} aria-hidden="true" />);
  }

  const remainingStars = 5 - Math.ceil(rating);
  for (let i = 0; i < remainingStars; i++) {
    stars.push(<StarIcon key={`empty-${i}`} className={`${sizeClassName} text-gray-300`} aria-hidden="true" />);
  }

  return stars;
};
