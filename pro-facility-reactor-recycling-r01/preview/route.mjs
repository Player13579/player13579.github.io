/** Gallery/static routing only; authored target implementations remain untouched. */
export function routeOptions(search) {
  const params = new URLSearchParams(search);
  const value = params.get('target');
  const embed = params.get('embed') === '1';
  return Object.freeze({embed,target:value === 'A' || value === 'B' ? value : null,verify:embed || params.get('verify') !== '0'});
}

export function requestedTarget(search) { return routeOptions(search).target; }
