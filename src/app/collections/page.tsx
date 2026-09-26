import { getAllStarRoster } from '@/lib/stars/star-cohort';
import CollectionsClient from './CollectionsClient';

export default function CollectionsPage() {
  // Project public fields on the server; never bundle private production definitions.
  return <CollectionsClient allStars={getAllStarRoster()} />;
}
