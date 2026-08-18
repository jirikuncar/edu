/* Fifteen stops, five islands, one broken compass.
   Every stop trains one idea from primary-school olympiad papers
   (Kangaroo Pre-Ecolier and Ecolier level). */

const S = (inner, w = 340, h = 130) =>
  `<svg class="art" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
     <g fill="none" stroke="#F2B441" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
   </svg>`;

const shell = (x, y) => `
  <path d="M${x} ${y} a22 22 0 0 1 44 0 z" fill="rgba(242,180,65,.14)"/>
  <path d="M${x + 11} ${y} l5 -18 M${x + 22} ${y} l0 -21 M${x + 33} ${y} l-5 -18"/>`;

export const art = {
  shells: S(
    [0, 1, 2, 3, 4, 5, 6]
      .map((i) => shell(14 + (i % 4) * 78, 52 + Math.floor(i / 4) * 58))
      .join(""),
  ),

  stones: S(
    [4, 6, 8, 10]
      .map(
        (n, i) => `
      <circle cx="${44 + i * 72}" cy="62" r="27" fill="rgba(242,180,65,.1)"/>
      <text x="${44 + i * 72}" y="71" text-anchor="middle" font-family="Space Mono" font-size="24" fill="#FFF4DE" stroke="none">${n}</text>`,
      )
      .join("") +
      `<circle cx="332" cy="62" r="27" stroke-dasharray="5 6"/>
     <text x="332" y="72" text-anchor="middle" font-size="26" fill="#F2B441" stroke="none">?</text>`,
  ),

  grid: S(`<rect x="112" y="12" width="106" height="106" fill="rgba(242,180,65,.08)"/>
           <line x1="165" y1="12" x2="165" y2="118"/><line x1="112" y1="65" x2="218" y2="65"/>`),

  stairs: S(
    [...Array(10)]
      .map(
        (_, i) => `
      <rect x="${16 + i * 31}" y="${112 - (i + 1) * 9.5}" width="22" height="${(i + 1) * 9.5}" rx="3" fill="rgba(242,180,65,.14)"/>`,
      )
      .join(""),
  ),

  jumps: S(
    `${[1, 2, 4, 7, 11]
      .map(
        (n, i) => `
      <text x="${34 + i * 66}" y="96" text-anchor="middle" font-family="Space Mono" font-size="22" fill="#FFF4DE" stroke="none">${n}</text>`,
      )
      .join("")}
    <text x="364" y="96" text-anchor="middle" font-size="24" fill="#F2B441" stroke="none">?</text>
    ${[1, 2, 3, 4]
      .map(
        (d, i) => `
      <path d="M${44 + i * 66} 74 q22 -26 44 0" stroke-dasharray="4 5"/>
      <text x="${66 + i * 66}" y="52" text-anchor="middle" font-family="Space Mono" font-size="14" fill="#79E3C0" stroke="none">+${d}</text>`,
      )
      .join("")}`,
    400,
  ),

  scales: S(
    `
    <g transform="translate(6,0)">
      <line x1="20" y1="34" x2="130" y2="34"/><line x1="75" y1="34" x2="75" y2="104"/><line x1="55" y1="104" x2="95" y2="104"/>
      <circle cx="20" cy="54" r="15" fill="rgba(242,180,65,.16)"/><path d="M20 41 l4 -8"/>
      <circle cx="108" cy="52" r="10" fill="rgba(242,180,65,.1)"/><circle cx="130" cy="52" r="10" fill="rgba(242,180,65,.1)"/>
    </g>
    <g transform="translate(180,0)">
      <line x1="10" y1="34" x2="126" y2="34"/><line x1="68" y1="34" x2="68" y2="104"/><line x1="48" y1="104" x2="88" y2="104"/>
      <circle cx="16" cy="52" r="10" fill="rgba(242,180,65,.1)"/>
      <circle cx="94" cy="52" r="7"/><circle cx="112" cy="52" r="7"/><circle cx="130" cy="52" r="7"/>
    </g>`,
    340,
    118,
  ),

  coins: S(
    `${[2, 2, 5]
      .map(
        (v, i) => `
      <circle cx="${70 + i * 100}" cy="60" r="30" fill="rgba(242,180,65,.12)"/>
      <text x="${70 + i * 100}" y="70" text-anchor="middle" font-family="Space Mono" font-size="24" fill="#FFF4DE" stroke="none">${v}</text>`,
      )
      .join("")}`,
  ),

  ring: S(
    `${[...Array(5)]
      .map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const x = 170 + 62 * Math.cos(a);
        const y = 62 + 52 * Math.sin(a);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="rgba(242,180,65,.16)"/>`;
      })
      .join("")}
    <path d="M170 10 L229 53" stroke-dasharray="4 5"/><path d="M170 10 L111 53" stroke-dasharray="4 5"/>`,
  ),

  pancake: S(`<circle cx="170" cy="62" r="52" fill="rgba(242,180,65,.1)"/>
    <line x1="118" y1="30" x2="222" y2="94"/><line x1="118" y1="94" x2="222" y2="30"/><line x1="170" y1="10" x2="170" y2="114"/>`),

  log: S(`<rect x="24" y="44" width="292" height="38" rx="8" fill="rgba(242,180,65,.1)"/>
    ${[1, 2, 3, 4, 5].map((i) => `<line x1="${24 + i * 48.6}" y1="34" x2="${24 + i * 48.6}" y2="92" stroke-dasharray="4 5"/>`).join("")}`),

  cube: S(
    `<g transform="translate(112,8)">
      <path d="M0 34 L56 6 L112 34 L56 62 Z" fill="rgba(242,180,65,.16)"/>
      <path d="M0 34 L0 84 L56 112 L56 62 Z" fill="rgba(242,180,65,.08)"/>
      <path d="M112 34 L112 84 L56 112 L56 62 Z" fill="rgba(242,180,65,.04)"/>
      <path d="M28 20 L84 48 M28 48 L84 20" stroke-dasharray="3 5"/>
      <path d="M0 59 L56 87 M56 87 L112 59 M56 62 L56 112" stroke-dasharray="3 5"/>
      <path d="M28 48 L28 98 M84 48 L84 98" stroke-dasharray="3 5"/>
    </g>`,
    340,
    124,
  ),

  well: S(`<rect x="130" y="8" width="80" height="110" rx="6" fill="rgba(242,180,65,.06)"/>
    ${[...Array(10)].map((_, i) => `<line x1="130" y1="${16 + i * 11}" x2="${i % 5 === 0 ? 210 : 146}" y2="${16 + i * 11}" stroke-width="1.6"/>`).join("")}
    <circle cx="170" cy="108" r="9" fill="rgba(121,227,192,.5)" stroke="#79E3C0"/>
    <text x="228" y="20" font-family="Space Mono" font-size="13" fill="#F2B441" stroke="none">10 m</text>`),
};

/* Short spoken description of each illustration, for screen readers. */
export const ART_ALT = {
  shells: {
    en: "Seven shells on the sand: four in a row above, three below.",
    es: "Siete conchas en la arena: cuatro en la fila de arriba y tres abajo.",
  },
  stones: {
    en: "Four stones marked 4, 6, 8 and 10, then an empty stone with a question mark.",
    es: "Cuatro piedras marcadas 4, 6, 8 y 10, y una piedra vacía con un signo de interrogación.",
  },
  grid: {
    en: "A square window divided by one vertical and one horizontal bar into four small squares.",
    es: "Una ventana cuadrada dividida por una barra vertical y otra horizontal en cuatro cuadrados pequeños.",
  },
  stairs: {
    en: "A staircase of ten columns of moss, growing from one block up to ten.",
    es: "Una escalera de diez columnas de musgo, de un bloque hasta diez.",
  },
  jumps: {
    en: "The numbers 1, 2, 4, 7, 11 with the hops between them marked plus 1, plus 2, plus 3, plus 4, then a question mark.",
    es: "Los números 1, 2, 4, 7, 11 con los saltos marcados más 1, más 2, más 3, más 4, y luego un signo de interrogación.",
  },
  scales: {
    en: "Two balance scales: one apple against two pears, and one pear against three cherries.",
    es: "Dos balanzas: una manzana contra dos peras, y una pera contra tres cerezas.",
  },
  coins: {
    en: "Three coins: two twos and a five.",
    es: "Tres monedas: dos de 2 y una de 5.",
  },
  ring: {
    en: "Five apprentices standing in a ring, with lines drawn between some of them.",
    es: "Cinco aprendices en corro, con líneas trazadas entre algunos de ellos.",
  },
  pancake: {
    en: "A round pancake with three straight cuts that all cross each other.",
    es: "Una tortita redonda con tres cortes rectos que se cruzan entre sí.",
  },
  log: {
    en: "A log with five dashed cut marks along it.",
    es: "Un tronco con cinco marcas de corte discontinuas.",
  },
  cube: {
    en: "A big cube built from eight small cubes, two along each edge.",
    es: "Un cubo grande formado por ocho cubos pequeños, dos por arista.",
  },
  well: {
    en: "A well ten metres deep with a frog at the bottom.",
    es: "Un pozo de diez metros de profundidad con una rana en el fondo.",
  },
};

export const LANDS = [
  {
    name: { en: "Shell Cove", es: "Cala de Conchas" },
    guide: { en: "Pip the crab", es: "Pip el cangrejo" },
  },
  {
    name: { en: "Whisperwood", es: "Bosque Susurrante" },
    guide: { en: "Sage the owl", es: "Sabia la lechuza" },
  },
  {
    name: { en: "Balance Bridge", es: "Puente de la Balanza" },
    guide: { en: "Grum the troll", es: "Grum el trol" },
  },
  {
    name: { en: "Clockspire", es: "Torre del Reloj" },
    guide: { en: "Tilda the clockmaker", es: "Tilda la relojera" },
  },
  {
    name: { en: "Emberdoor", es: "Puerta de Brasa" },
    guide: { en: "Ember the dragon", es: "Ember la dragona" },
  },
];

export const STOPS = [
  {
    land: 0,
    art: art.shells,
    alt: ART_ALT.shells,
    options: [6, 7, 8],
    answer: 1,
    story: {
      en: "Pip scuttles over with a claw full of treasure. “Before you sail anywhere, navigator, prove you can count what is right in front of you.”",
      es: "Pip llega a toda prisa con una pinza llena de tesoros. “Antes de zarpar, navegante, demuestra que sabes contar lo que tienes delante.”",
    },
    prompt: { en: "How many shells did Pip bring?", es: "¿Cuántas conchas ha traído Pip?" },
    hint: {
      en: "Touch each shell once and say the number out loud.",
      es: "Toca cada concha una vez y di el número en voz alta.",
    },
    why: {
      en: "Four in the top row and three below: 4 + 3 = 7.",
      es: "Cuatro en la fila de arriba y tres abajo: 4 + 3 = 7.",
    },
  },

  {
    land: 0,
    art: art.stones,
    alt: ART_ALT.stones,
    options: [11, 12, 14],
    answer: 1,
    story: {
      en: "The tide has left wet stones in a line, each with a number carved into it.",
      es: "La marea ha dejado piedras mojadas en fila, cada una con un número tallado.",
    },
    prompt: {
      en: "Which number belongs on the last stone?",
      es: "¿Qué número va en la última piedra?",
    },
    hint: {
      en: "How much do you add to get from one stone to the next?",
      es: "¿Cuánto sumas para pasar de una piedra a la siguiente?",
    },
    why: {
      en: "Every stone goes up by 2, so after 10 comes 12.",
      es: "Cada piedra sube de 2 en 2, así que después del 10 viene el 12.",
    },
  },

  {
    land: 0,
    art: null,
    options: [9, 10, 12],
    answer: 1,
    story: {
      en: "“Seven shells,” says Pip. “Give me two for the harbour fee. Then look — five more washed up behind you.”",
      es: "“Siete conchas”, dice Pip. “Dame dos por el peaje del puerto. Y mira: cinco más han llegado con la ola detrás de ti.”",
    },
    prompt: { en: "How many shells do you have now?", es: "¿Cuántas conchas tienes ahora?" },
    hint: {
      en: "Do it in two steps: first give away, then find.",
      es: "Hazlo en dos pasos: primero dar, después encontrar.",
    },
    why: { en: "7 − 2 = 5, and 5 + 5 = 10.", es: "7 − 2 = 5, y 5 + 5 = 10." },
  },

  {
    land: 1,
    art: art.grid,
    alt: ART_ALT.grid,
    options: [4, 5, 6],
    answer: 1,
    story: {
      en: "Sage the owl blinks slowly. “Counting shells is easy. Counting what hides inside a shape — that is olympiad work.”",
      es: "Sabia la lechuza parpadea despacio. “Contar conchas es fácil. Contar lo que se esconde dentro de una figura: eso ya es de olimpiada.”",
    },
    prompt: {
      en: "How many squares can you find in this window?",
      es: "¿Cuántos cuadrados hay en esta ventana?",
    },
    hint: {
      en: "Small squares are not the only squares. Look at the whole window too.",
      es: "Los cuadrados pequeños no son los únicos. Mira también la ventana entera.",
    },
    why: {
      en: "Four small squares plus the one big square around them: 4 + 1 = 5.",
      es: "Cuatro cuadrados pequeños más el grande que los rodea: 4 + 1 = 5.",
    },
  },

  {
    land: 1,
    art: art.stairs,
    alt: ART_ALT.stairs,
    options: [45, 50, 55, 60],
    answer: 2,
    story: {
      en: "A staircase of moss climbs the old oak: 1 block, then 2, then 3, all the way to 10.",
      es: "Una escalera de musgo sube por el viejo roble: 1 bloque, luego 2, luego 3, hasta 10.",
    },
    prompt: {
      en: "How many moss blocks are there altogether?",
      es: "¿Cuántos bloques de musgo hay en total?",
    },
    hint: {
      en: "Pair the ends: 1 + 10, 2 + 9, 3 + 8… What does every pair make?",
      es: "Junta los extremos: 1 + 10, 2 + 9, 3 + 8… ¿Cuánto suma cada pareja?",
    },
    why: {
      en: "Five pairs that each make 11: 5 × 11 = 55.",
      es: "Cinco parejas que suman 11 cada una: 5 × 11 = 55.",
    },
  },

  {
    land: 1,
    art: art.jumps,
    alt: ART_ALT.jumps,
    options: [15, 16, 18],
    answer: 1,
    story: {
      en: "Fireflies land on the branch in a rhythm Sage calls “the growing hop”.",
      es: "Las luciérnagas se posan en la rama con un ritmo que Sabia llama “el salto que crece”.",
    },
    prompt: { en: "Which number comes next?", es: "¿Qué número viene después?" },
    hint: {
      en: "The hops themselves grow: +1, +2, +3, +4, then…",
      es: "Los saltos también crecen: +1, +2, +3, +4, y luego…",
    },
    why: {
      en: "The next hop is +5, so 11 + 5 = 16.",
      es: "El siguiente salto es +5, así que 11 + 5 = 16.",
    },
  },

  {
    land: 2,
    art: art.scales,
    alt: ART_ALT.scales,
    options: [5, 6, 8],
    answer: 1,
    story: {
      en: "Grum guards the bridge with two market scales. “One apple balances two pears. One pear balances three cherries.”",
      es: "Grum guarda el puente con dos balanzas de mercado. “Una manzana equilibra dos peras. Una pera equilibra tres cerezas.”",
    },
    prompt: {
      en: "How many cherries balance one apple?",
      es: "¿Cuántas cerezas equilibran una manzana?",
    },
    hint: {
      en: "Swap each pear for its cherries, one pear at a time.",
      es: "Cambia cada pera por sus cerezas, una pera cada vez.",
    },
    why: {
      en: "An apple is 2 pears, and each pear is 3 cherries: 2 × 3 = 6.",
      es: "Una manzana son 2 peras, y cada pera son 3 cerezas: 2 × 3 = 6.",
    },
  },

  {
    land: 2,
    art: null,
    options: [5, 6, 7],
    answer: 1,
    story: {
      en: "“Two baskets,” grumbles Grum. “Ten nuts between them. The heavy one holds exactly 2 more than the light one.”",
      es: "“Dos cestas”, gruñe Grum. “Diez nueces entre las dos. La pesada tiene exactamente 2 más que la ligera.”",
    },
    prompt: {
      en: "How many nuts are in the heavy basket?",
      es: "¿Cuántas nueces hay en la cesta pesada?",
    },
    hint: {
      en: "Lift the 2 extra nuts out first. Now 8 nuts split evenly.",
      es: "Saca primero las 2 nueces de más. Ahora reparte 8 en partes iguales.",
    },
    why: {
      en: "Take the 2 extra away: 8 split evenly is 4 and 4. Put the 2 back on one side: 6 and 4.",
      es: "Quita las 2 de más: 8 repartidas son 4 y 4. Devuelve las 2 a un lado: 6 y 4.",
    },
  },

  {
    land: 2,
    // hands-on: six 2s and three 5s to play with
    widget: { kind: "coins", coins: [2, 2, 2, 2, 2, 2, 5, 5, 5], target: 11 },
    options: [3, 4, 5],
    answer: 1,
    story: {
      en: "The toll is 11 coppers. Your purse holds only 2-coin and 5-coin pieces, and Grum gives no change.",
      es: "El peaje son 11 cobres. En tu bolsa solo hay monedas de 2 y de 5, y Grum no da cambio.",
    },
    prompt: {
      en: "What is the smallest number of coins that pays exactly 11?",
      es: "¿Cuál es el menor número de monedas que paga exactamente 11?",
    },
    hint: {
      en: "Try using the big coins first, then fill the rest with twos.",
      es: "Prueba primero con las monedas grandes y completa el resto con las de 2.",
    },
    why: {
      en: "5 + 2 + 2 + 2 = 11, which is 4 coins. Three coins can never reach 11: 5+5+5 is 15 and 5+5+2 is 12.",
      es: "5 + 2 + 2 + 2 = 11, o sea 4 monedas. Con tres monedas es imposible: 5+5+5 son 15 y 5+5+2 son 12.",
    },
  },

  {
    land: 3,
    // hands-on: draw the handshakes and count them
    widget: { kind: "ring", people: 5 },
    options: [8, 10, 12, 20],
    answer: 1,
    story: {
      en: "In Clockspire, five apprentices meet you at the tower door. Every pair shakes hands exactly once.",
      es: "En la Torre del Reloj te esperan cinco aprendices en la puerta. Cada pareja se da la mano una sola vez.",
    },
    prompt: { en: "How many handshakes happen?", es: "¿Cuántos apretones de manos hay?" },
    hint: {
      en: "The first person shakes 4 hands, the next has only 3 new people left, then 2, then 1.",
      es: "El primero da 4 manos; al siguiente solo le quedan 3 personas nuevas, luego 2, luego 1.",
    },
    why: {
      en: "4 + 3 + 2 + 1 = 10. Counting 5 × 4 = 20 counts every handshake twice.",
      es: "4 + 3 + 2 + 1 = 10. Contar 5 × 4 = 20 cuenta cada apretón dos veces.",
    },
  },

  {
    land: 3,
    // hands-on: drag the cuts and watch the pieces
    widget: { kind: "pancake" },
    options: [6, 7, 8],
    answer: 1,
    story: {
      en: "Tilda slides a pancake over. “Three straight cuts, no folding. Be greedy.”",
      es: "Tilda desliza una tortita. “Tres cortes rectos, sin doblar. Sé ambicioso.”",
    },
    prompt: {
      en: "What is the largest number of pieces you can make?",
      es: "¿Cuál es el mayor número de trozos que puedes conseguir?",
    },
    hint: {
      en: "Make each new cut cross all the cuts already there.",
      es: "Haz que cada corte nuevo cruce todos los cortes anteriores.",
    },
    why: {
      en: "Cut 1 makes 2 pieces, cut 2 adds 2 more, cut 3 crosses both and adds 3: 2 + 2 + 3 = 7.",
      es: "El corte 1 hace 2 trozos, el corte 2 añade 2 más, y el corte 3 cruza los dos y añade 3: 2 + 2 + 3 = 7.",
    },
  },

  {
    land: 3,
    art: null,
    options: [4, 5, 6],
    answer: 1,
    story: {
      en: "The tower gate opens for any two-digit number whose digits add up to 5.",
      es: "La puerta de la torre se abre con cualquier número de dos cifras cuyas cifras sumen 5.",
    },
    prompt: { en: "How many such numbers are there?", es: "¿Cuántos números así existen?" },
    hint: {
      en: "Start with the tens digit: 1, then 2, then 3… The ones digit is forced each time.",
      es: "Empieza por la cifra de las decenas: 1, luego 2, luego 3… La otra cifra queda obligada.",
    },
    why: {
      en: "14, 23, 32, 41, 50 — five numbers. 05 does not count, because it is not a two-digit number.",
      es: "14, 23, 32, 41, 50: cinco números. El 05 no vale, porque no es un número de dos cifras.",
    },
  },

  {
    land: 4,
    art: art.log,
    alt: ART_ALT.log,
    options: [10, 12, 14],
    answer: 0,
    story: {
      en: "Ember the dragon warms a fallen log. “Saw it into 6 pieces for my fire. Each cut takes you 2 minutes.”",
      es: "Ember la dragona calienta un tronco caído. “Córtalo en 6 trozos para mi fuego. Cada corte te lleva 2 minutos.”",
    },
    prompt: {
      en: "How long does the whole job take, in minutes?",
      es: "¿Cuántos minutos dura todo el trabajo?",
    },
    hint: {
      en: "Draw the cut marks. Is the number of cuts the same as the number of pieces?",
      es: "Dibuja las marcas de corte. ¿Hay tantos cortes como trozos?",
    },
    why: {
      en: "6 pieces need only 5 cuts: 5 × 2 = 10 minutes.",
      es: "6 trozos necesitan solo 5 cortes: 5 × 2 = 10 minutos.",
    },
  },

  {
    land: 4,
    art: art.cube,
    alt: ART_ALT.cube,
    options: [2, 3, 4],
    answer: 1,
    story: {
      en: "Ember stacks 8 small stone cubes into one big 2×2×2 cube and paints the whole outside gold.",
      es: "Ember apila 8 cubos pequeños de piedra formando un cubo grande de 2×2×2 y pinta de dorado todo el exterior.",
    },
    prompt: {
      en: "How many faces of ONE small cube are painted?",
      es: "¿Cuántas caras de UN cubo pequeño quedan pintadas?",
    },
    hint: {
      en: "Every small cube sits in a corner. A corner touches three outside walls.",
      es: "Cada cubo pequeño está en una esquina. Una esquina toca tres paredes exteriores.",
    },
    why: {
      en: "Each small cube is a corner of the big cube, so exactly 3 of its faces show.",
      es: "Cada cubo pequeño es una esquina del cubo grande, así que se ven exactamente 3 de sus caras.",
    },
  },

  {
    land: 4,
    art: art.well,
    alt: ART_ALT.well,
    options: [4, 8, 10],
    answer: 1,
    story: {
      en: "The last piece of the Golden Compass lies at the bottom of a 10-metre well, guarded by a frog. “I climb 3 m each day,” she says, “and slip back 2 m each night.”",
      es: "La última pieza de la Brújula Dorada está en el fondo de un pozo de 10 metros, vigilada por una rana. “Subo 3 m cada día”, dice, “y resbalo 2 m cada noche.”",
    },
    prompt: {
      en: "On which day does the frog reach the top?",
      es: "¿Qué día llega la rana arriba?",
    },
    hint: {
      en: "Once she is out, she cannot slip back. Check where she stands at the start of day 8.",
      es: "Cuando ya está fuera no puede resbalar. Mira dónde está al empezar el día 8.",
    },
    why: {
      en: "She gains 1 m per full day, so day 8 begins at 7 m. Climbing 3 m reaches 10 m — she is out before the night.",
      es: "Gana 1 m por día completo, así que el día 8 empieza a 7 m. Sube 3 m y llega a 10 m: sale antes de la noche.",
    },
  },
];

export const SKILLS = [
  { en: "counting carefully", es: "contar con cuidado" },
  { en: "spotting a rule in a sequence", es: "descubrir la regla de una serie" },
  { en: "two-step arithmetic", es: "aritmética en dos pasos" },
  { en: "counting hidden shapes", es: "contar figuras escondidas" },
  { en: "pairing to add fast", es: "sumar rápido emparejando" },
  { en: "growing differences", es: "diferencias que crecen" },
  { en: "substitution in balances", es: "sustitución en balanzas" },
  { en: "sharing with a difference", es: "repartir con una diferencia" },
  {
    en: "making an amount with the fewest coins",
    es: "formar una cantidad con las menos monedas",
  },
  { en: "counting pairs without double-counting", es: "contar parejas sin repetir" },
  { en: "cuts and regions", es: "cortes y regiones" },
  { en: "organised listing", es: "listar de forma ordenada" },
  { en: "fenceposts: cuts vs pieces", es: "postes y vallas: cortes frente a trozos" },
  { en: "3D spatial reasoning", es: "razonamiento espacial en 3D" },
  { en: "the classic climb-and-slip trap", es: "la trampa clásica de subir y resbalar" },
];
