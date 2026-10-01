// GPT-6.1-Sol r2 original procedural stroke alphabet. No old E font/code input.
// Each coordinate pair is a pen position on a 4x6 grid; semicolon lifts the pen.
export const GLYPHS = Object.freeze({
  a:'03 12 32 43 46;43 13 04 05 16 36 45', b:'00 06;03 12 32 43 45 36 16 05',
  c:'42 12 03 05 16 46', d:'40 46;43 32 12 03 05 16 36 45',
  e:'04 44 43 32 12 03 05 16 46', f:'40 20 11 16;02 32',
  g:'46 47 38 18;43 32 12 03 05 16 36 45;42 46', h:'00 06;03 12 32 43 46',
  i:'20 21;22 26;16 36', j:'30 31;32 37 28 08', k:'00 06;42 04 46',
  l:'10 15 26 36', m:'02 06;03 12 23 26;23 32 43 46', n:'02 06;03 12 32 43 46',
  o:'12 32 43 45 36 16 05 03 12', p:'02 08;03 12 32 43 45 36 16 05',
  q:'42 48;43 32 12 03 05 16 36 45', r:'02 06;03 12 32 43',
  s:'42 12 03 14 34 45 36 06', t:'20 25 36 46;02 42',
  u:'02 05 16 36 45;42 46', v:'02 26 42', w:'02 16 24 36 42',
  x:'02 46;42 06', y:'02 25 42;25 17 08', z:'02 42 06 46',
  '0':'10 30 41 45 36 16 05 01 10;04 42', '1':'01 20 26;06 46',
  '2':'01 10 30 41 42 04 06 46', '3':'00 30 41 32 22;32 43 45 36 06',
  '4':'40 46;30 03 43', '5':'40 00 03 33 44 45 36 06',
  '6':'40 10 01 05 16 36 45 44 33 03', '7':'00 40 16',
  '8':'10 30 41 42 33 13 02 01 10;13 04 05 16 36 45 44 33',
  '9':'43 13 02 01 10 30 41 45 36 06',
  '(':'40 21 15 46', ')':'00 21 25 06', '[':'40 00 06 46', ']':'00 40 46 06',
  '"':'10 12;30 32', "'":'20 22', ';':'25 26;26 17', ':':'22 23;25 26',
  '_':'07 47', '-':'03 43', '=':'02 42;04 44', ',':'26 17', '.':'26 27',
  '>':'01 43 05', '<':'41 03 45', '/':'06 40', '+':'03 43;20 26', ' ':'',
});
export function strokeGlyph(character) {
  const path = GLYPHS[character];
  if (path === undefined) throw new RangeError(`Unsupported code glyph: ${character}`);
  return path.split(';').filter(Boolean).flatMap(line => {
    const points = line.split(' ').map(p => [Number(p[0])/4, Number(p[1])/8]);
    return points.slice(1).map((p,i) => [...points[i], ...p]);
  });
}
export function strokeText(text, x, y, height, advance) {
  return [...text].flatMap((ch,i) => strokeGlyph(ch).map(([ax,ay,bx,by]) =>
    [x+i*advance+ax*advance*.72, y+ay*height, x+i*advance+bx*advance*.72, y+by*height]));
}
