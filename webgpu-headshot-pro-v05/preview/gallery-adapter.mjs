/** Build the same-origin preview URL and carry the gallery's mute contract. */
export function previewUrl(href) {
  const outer = new URL(href);
  const source = new URL('./index.html', outer);
  source.searchParams.set('embed', '1');
  if (outer.searchParams.has('verify')) source.searchParams.set('verify', '1');
  if (outer.searchParams.has('galleryRelease')) source.searchParams.set('galleryRelease', outer.searchParams.get('galleryRelease'));
  return source;
}

export function isVerifyMode(search) {
  return new URLSearchParams(search).has('verify');
}

export function audioAllowed(search) {
  return !isVerifyMode(search);
}
