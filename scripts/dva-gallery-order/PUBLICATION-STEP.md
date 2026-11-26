# Gallery publication order maintenance

Keep `update-package-order.py`, `package-update-order.json`, and this procedure in the GitHub source repository under `scripts/dva-gallery-order/`. Run the tool from the repository root in the same staged worktree that contains the gallery candidate. The tool accepts explicit source paths, so it does not depend on a temporary candidate directory or local clock.

After publishing a new eligible Effect version or updating a listed version's package, refresh the version metadata before releasing the gallery HTML pin. The tool reads the latest commit for the exact package path from GitHub's commit Atom feed and records its UTC timestamp, SHA, path, and version ID. It updates both the exact-version row and the group's latest-package row; the runtime comparator prefers a newer eligible version's `galleryPackagePublishedAt` / `packagePublishedAt` field, then its exact-version index, then the group fallback. Adoption-only commits stop for manual inspection.

Example from a fresh repository clone, after staging changes to the root gallery files:

```powershell
python scripts/dva-gallery-order/update-package-order.py `
  --js-path asset-gallery.js `
  --html-path webgpu-e-gallery.html `
  --order-file scripts/dva-gallery-order/package-update-order.json `
  --group-id fire-zero-sol61 `
  --version-id fire-zero-sol61-r6 `
  --package-path public/fire-zero-sol61/r6-technical-a1/PACKAGE.json `
  --category effect `
  --eligible-version-count 6
```

For each package publication/update, supply its newest eligible version ID and exact catalog source path, including updates to an existing group. For a new group, the tool inserts the row. Then run the gallery order verifier from the same checkout, `node --check asset-gallery.js`, and confirm `asset-gallery.js?gitBlob=` in the HTML equals `git hash-object --no-filters asset-gallery.js`. Gallery publication must include this metadata refresh; do not use a preparation timestamp or current time when GitHub cannot provide the package commit date.
