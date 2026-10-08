import { mountGalleryAdapter } from './gallery-host-core.mjs';

await mountGalleryAdapter({
  windowRef: window,
  locationRef: location,
  documentRef: document,
  importPreview: () => import('./preview.mjs')
});
