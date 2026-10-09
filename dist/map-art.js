// A lightweight SVG postcard. Geography uses the same projection as the drive.
const xy = ([lon, lat]) => [100 + (lon + 125) * 27, 75 + (50 - lat) * 28];
const path = (points, close = false) => points.map((point, i) => `${i ? 'L' : 'M'}${xy(point).join(',')}`).join(' ') + (close ? ' Z' : '');

export function mapArtwork() {
  const coast = [
    [-124.73, 48.4], [-124.2, 48.25], [-123.1, 48.2], [-122.75, 48.65],
    [-123.1, 49], [-95.2, 49], [-94.8, 49.35], [-94.5, 48.75],
    [-89.5, 48], [-87, 46.5], [-84.3, 46.4], [-82.4, 45.5], [-82.5, 42],
    [-79, 43], [-74, 45], [-67, 47], [-67, 44.6], [-70, 43], [-70.7, 41.5],
    [-74, 40.4], [-75.6, 35.7], [-80, 32], [-81, 29.5], [-80.5, 25.2],
    [-82, 26], [-82.8, 28.9], [-85, 30], [-88, 30.4], [-89.6, 29.4],
    [-90.2, 29.15], [-91.1, 29.6], [-93.8, 29.8], [-95.1, 29.05],
    [-96.2, 28.5], [-97.1, 27.8], [-97.4, 26], [-99.2, 26.4],
    [-100.1, 28], [-101.1, 29.2], [-102.9, 29.8], [-103.3, 29],
    [-104.5, 29.7], [-106.5, 31.75], [-108.2, 31.75], [-108.2, 31.33],
    [-111.05, 31.33], [-114.75, 32.72], [-117.1, 32.55], [-117.45, 33.1],
    [-118.45, 33.75], [-118.55, 34.05], [-119.7, 34.4], [-120.5, 34.5],
    [-120.7, 35.2], [-121.4, 36.25], [-121.9, 36.65], [-122.5, 37.75],
    [-122.4, 38.25], [-123.7, 39.7], [-124.4, 40.4], [-124.1, 41.4],
    [-124.35, 42.1], [-124.25, 43.2], [-124, 44.7], [-123.95, 46.2],
    [-124.35, 47.4],
  ];
  const outline = path(coast, true);
  const borders = [
    [[-124.1,46],[-123,46],[-122.7,45.65],[-121.7,45.7],[-120.7,45.6],[-119.5,45.95],[-116.92,46]],
    [[-124.35,42],[-120,42],[-117,42]],
    [[-120,42],[-120,39],[-114.65,35],[-114.7,32.72]],
    [[-117,42],[-117,44],[-116.45,44.7],[-117.02,46],[-117.02,49]],
    [[-114,49],[-114,47],[-113,46],[-113.5,45.6],[-112,44.6],[-111,44.5]],
    [[-111,44.5],[-111,42],[-114,42],[-114,37],[-114.65,35]],
    [[-111,45],[-104,45]], [[-111,41],[-104,41]],
    [[-111,42],[-111,41],[-109.05,41],[-109.05,31.33]],
    [[-114,37],[-102,37]], [[-109.05,41],[-102.05,41]],
    [[-104,49],[-104,41],[-102.05,41]],
    [[-104,46],[-96.5,46]], [[-104,43],[-98,43],[-96.5,42.5]],
    [[-102.05,41],[-102.05,36.5],[-103,36.5],[-103,32],[-106.5,32]],
    [[-102.05,40],[-95.5,40]], [[-102.05,37],[-94.6,37]],
    [[-103,36.5],[-100,36.5],[-100,34.5],[-98,34.1],[-96.6,33.8],[-94.45,33.6]],
    [[-94.6,36.5],[-94.6,33.6],[-94,33.6],[-94,31],[-93.6,30],[-93.8,29.8]],
    [[-96.5,49],[-96.5,46],[-96.8,43],[-96.5,42.5],[-95.7,41.5],[-95.5,40],[-94.6,39],[-94.6,36.5]],
  ].map(points => `<path d="${path(points)}"/>`).join('');
  const mountain = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-17 14 0-17 17 14Z" fill="#a3baa0"/><path d="m0-17 17 31H0Z" fill="#88a990"/><path d="m-6-6 6-11 6 11-6-3Z" fill="#f8f9e8"/></g>`;
  const tree = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 1V14" stroke="#8e9d77" stroke-width="3"/><path d="M-9 7 0-13 9 7ZM-7-1 0-18 7-1Z" fill="#79a38c"/></g>`;
  const cactus = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#9cb087" stroke-width="4" stroke-linecap="round"><path d="M0 12V-12M0 2h-7v-9M0-2h7v-10"/></g>`;
  const label = (text,lon,lat,size=12) => `<text x="${xy([lon,lat])[0]}" y="${xy([lon,lat])[1]}" text-anchor="middle" font-size="${size}">${text}</text>`;
  return `
  <defs>
    <linearGradient id="postcard-ocean" x2="0" y2="1"><stop stop-color="#d5eef1"/><stop offset="1" stop-color="#bfe2e7"/></linearGradient>
    <linearGradient id="postcard-land" x2="0.7" y2="1"><stop stop-color="#fff9df"/><stop offset="1" stop-color="#f6edcf"/></linearGradient>
    <clipPath id="postcard-land-clip"><path d="${outline}"/></clipPath>
  </defs>
  <rect width="1200" height="760" fill="url(#postcard-ocean)"/>
  <g fill="none" stroke="#f1faf8" stroke-width="2" opacity=".65" stroke-linecap="round">
    <path d="M28 198q15 7 30 0m-7 12q15 7 30 0M60 350q18 8 36 0m-28 13q18 8 36 0M28 520q18 8 36 0m8 13q18 8 36 0M95 630q18 8 36 0M163 697q18 8 36 0m-6 13q18 8 36 0M1020 700q18 8 36 0m16 14q18 8 36 0"/>
  </g>
  <path d="M157 0H1200V111L924 111 924 104 208 104 149 124 107 84Z" fill="#e0e6ce"/>
  <path d="${path([[-117.1,32.55],[-114.75,32.72],[-111.05,31.33],[-108.2,31.33],[-108.2,31.75],[-106.5,31.75],[-104.5,29.7],[-103.3,29],[-102.9,29.8],[-101.1,29.2],[-100.1,28],[-99.2,26.4],[-97.4,26],[-97.5,23],[-109,23],[-114,27],[-117.1,32.55]],true)}" fill="#e9dec0"/>
  <path d="${outline}" fill="none" stroke="#94c8cd" stroke-width="14" stroke-linejoin="round" opacity=".32"/>
  <path d="${outline}" fill="url(#postcard-land)" stroke="#b5bca0" stroke-width="2" stroke-linejoin="round"/>
  <g clip-path="url(#postcard-land-clip)">
    <path d="M141 97Q260 95 296 190T353 349L309 442Q249 420 229 351T167 224Z" fill="#dbe7c0" opacity=".75"/>
    <path d="M339 120Q437 180 444 270T516 415L470 495Q397 422 387 340T314 176Z" fill="#dfe5bc" opacity=".65"/>
    <path d="M310 382Q380 337 451 416T581 509Q645 592 584 633L392 620Q295 556 280 465Z" fill="#efcf9f" opacity=".46"/>
    <path d="M568 124Q809 140 833 307T1002 475L1062 590Q941 620 810 536T622 413Z" fill="#e5e9b8" opacity=".45"/>
    <g fill="none" stroke="#c4c4a5" stroke-width="1.3" stroke-dasharray="4 6" stroke-linecap="round" opacity=".8">${borders}</g>
    <g fill="#a2a98b" font-family="Arial, sans-serif" font-weight="600" letter-spacing="2.4" opacity=".65">
      ${label('WASHINGTON',-120.4,48.3,10)}${label('OREGON',-120.8,44.4,11)}
      ${label('NEVADA',-116.7,39.5,10)}${label('IDAHO',-114.6,44.2,10)}
      ${label('MONTANA',-108.6,47.4,12)}${label('WYOMING',-107.2,43,10)}
      ${label('UTAH',-111.8,39.7,10)}${label('COLORADO',-105.5,39.6,10)}
      ${label('ARIZONA',-112.2,33.3,10)}${label('NEW MEXICO',-105.5,33.6,10)}
      ${label('TEXAS',-100.2,31.9,18)}${label('OKLAHOMA',-98.3,35.6,10)}
      ${label('KANSAS',-98.2,38.6,11)}${label('NEBRASKA',-99.6,41.5,10)}
      ${label('SOUTH DAKOTA',-100.2,44.6,10)}${label('NORTH DAKOTA',-100.2,47.5,10)}
    </g>
    <g opacity=".7">
      ${mountain(260,203,.8)}${mountain(282,222,.65)}${tree(218,230,.7)}${tree(203,249,.8)}
      ${mountain(405,170,.9)}${mountain(427,196,1.1)}${mountain(455,222,.7)}
      ${mountain(451,346,.9)}${mountain(470,366,.65)}${mountain(540,387,.9)}
      ${tree(259,296,.8)}${tree(273,315,.7)}${tree(389,236,.6)}${tree(400,253,.7)}
      ${cactus(393,540,.9)}${cactus(414,554,.65)}${cactus(574,567,.8)}
      <path d="M338 480q16-11 33 0m-11 11q16-9 31 0M464 551q16-9 31 0M594 624q16-9 31 0" fill="none" stroke="#d4b884" stroke-width="2" stroke-linecap="round"/>
      <path d="M800 210v17m-6-12 6 5 6-5m-6-8-5 5m5-5 5 5M822 221v17m-6-12 6 5 6-5m-6-8-5 5m5-5 5 5" fill="none" stroke="#c4bf84" stroke-width="2" stroke-linecap="round"/>
    </g>
    <path d="M434 449q-9 21-20 27t-27 15q-7 13-7 30t-12 29" fill="none" stroke="#9bc5ca" stroke-width="2.5" opacity=".7" stroke-linecap="round"/>
  </g>
  <g font-family="Arial, sans-serif" text-anchor="middle" fill="#69989e" opacity=".6">
    <text x="97" y="454" font-size="12" letter-spacing="4" transform="rotate(-68 97 454)">PACIFIC OCEAN</text>
    <text x="1080" y="729" font-size="11" letter-spacing="3">GULF OF MEXICO</text>
    <text x="629" y="62" font-size="10" letter-spacing="4" fill="#9aa98c">CANADA</text>
    <text x="515" y="735" font-size="10" letter-spacing="4" fill="#b4a282">MEXICO</text>
  </g>
  <g transform="translate(1122 102)" stroke="#789e98" fill="none" opacity=".55">
    <circle r="29" stroke-width="1"/>
    <path d="M0-23 6 0 0 23-6 0Z" stroke-width="1.2" fill="#f3f4df"/>
    <path d="M-22 0H22M0-23V0" stroke-width="1.2"/>
    <path d="M0-23 6 0H0Z" fill="#789e98" stroke="none"/>
    <text y="-38" text-anchor="middle" fill="#789e98" stroke="none" font-family="Arial,sans-serif" font-size="11" font-weight="700">N</text>
  </g>`;
}
