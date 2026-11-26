  const TAU = Math.PI * 2;
  const finite = Number.isFinite;
  const clamp = value => Math.max(0, Math.min(1, value));

  function hsl(hue, saturation, lightness) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const sector = ((hue % 360) + 360) % 360 / 60;
    const secondary = chroma * (1 - Math.abs(sector % 2 - 1));
    const parts = sector < 1 ? [chroma, secondary, 0] :
      sector < 2 ? [secondary, chroma, 0] :
      sector < 3 ? [0, chroma, secondary] :
      sector < 4 ? [0, secondary, chroma] :
      sector < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
    const offset = lightness - chroma / 2;
    return parts.map(component => component + offset).concat(1);
  }

  function seedFor(id) {
    let seed = 17;
    for (const character of String(id)) seed = ((seed * 31) + character.charCodeAt(0)) >>> 0;
    return seed;
  }

