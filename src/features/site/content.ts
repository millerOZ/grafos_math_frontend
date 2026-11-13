/**
 * Contenido del sitio público de Bake & Brew.
 * Todos los datos son de ejemplo (negocio ficticio para el proyecto académico);
 * se reemplazan aquí sin tocar los componentes.
 */

export interface ItemVitrina {
  nombre: string;
  detalle: string;
  precio: number;
  /** Hora en que sale del horno o se empieza a servir. */
  sale?: string;
}

export interface CategoriaVitrina {
  id: string;
  nombre: string;
  intro: string;
  items: ItemVitrina[];
}

export const VITRINA: CategoriaVitrina[] = [
  {
    id: 'panaderia',
    nombre: 'Panadería',
    intro: 'Masas con 24 horas de fermentación. Sale caliente dos veces al día.',
    items: [
      { nombre: 'Pan de masa madre', detalle: 'Corteza crujiente, miga húmeda. 800 g.', precio: 16000, sale: '6:00 a. m.' },
      { nombre: 'Pan tajado de la casa', detalle: 'Para el sándwich del colegio. 600 g.', precio: 9500, sale: '6:00 a. m.' },
      { nombre: 'Pandebono', detalle: 'Con queso costeño y almidón de yuca.', precio: 3200, sale: '6:30 a. m.' },
      { nombre: 'Baguette', detalle: 'Larga fermentación en frío.', precio: 6500, sale: '3:00 p. m.' },
      { nombre: 'Tostadas integrales', detalle: 'Doble horneado, sin azúcar añadida.', precio: 8000 },
    ],
  },
  {
    id: 'reposteria',
    nombre: 'Repostería',
    intro: 'Mantequilla de verdad, frutas de temporada y nada de premezclas.',
    items: [
      { nombre: 'Croissant de mantequilla', detalle: '27 capas laminadas a mano.', precio: 6800, sale: '6:30 a. m.' },
      { nombre: 'Ponqué artesanal', detalle: 'De naranja o de vainilla. Porción.', precio: 5500 },
      { nombre: 'Galletas de avena y panela', detalle: 'Paquete de seis.', precio: 7000 },
      { nombre: 'Torta de zanahoria', detalle: 'Con frosting de queso crema. Porción.', precio: 9800 },
      { nombre: 'Rollo de canela', detalle: 'Glaseado al momento.', precio: 7500, sale: '9:00 a. m.' },
    ],
  },
  {
    id: 'cafe',
    nombre: 'Barra de café',
    intro: 'Café de una finca de Jardín, Antioquia, tostado cada semana.',
    items: [
      { nombre: 'Tinto de la casa', detalle: 'Filtrado, servido en pocillo.', precio: 2500 },
      { nombre: 'Capuchino', detalle: 'Leche de la Sabana, espuma fina.', precio: 6500 },
      { nombre: 'Café en V60', detalle: 'Origen del mes, preparado en la mesa.', precio: 8500 },
      { nombre: 'Chocolate santafereño', detalle: 'Con queso y almojábana.', precio: 9000 },
      { nombre: 'Café en grano, 250 g', detalle: 'Para llevar a casa. Te lo molemos.', precio: 24000 },
    ],
  },
  {
    id: 'desayunos',
    nombre: 'Desayunos',
    intro: 'Servimos desde las 6:30 a. m. hasta las 11:30 a. m.',
    items: [
      { nombre: 'Calentado paisa', detalle: 'Arepa, huevo, chorizo y tinto.', precio: 18500 },
      { nombre: 'Tostada de masa madre', detalle: 'Aguacate, huevo pochado y semillas.', precio: 16000 },
      { nombre: 'Desayuno de la abuela', detalle: 'Changua, almojábana y chocolate.', precio: 15500 },
      { nombre: 'Bowl de yogur', detalle: 'Granola de la casa y fruta del día.', precio: 13000 },
    ],
  },
];

/** Un día en el obrador: es una secuencia real, por eso va numerada por hora. */
export const DIA_OBRADOR = [
  { hora: '3:30 a. m.', titulo: 'Se prende el horno', texto: 'Llega el primer turno y revisa las masas que fermentaron toda la noche.' },
  { hora: '4:00 a. m.', titulo: 'Amasar y formar', texto: 'Pandebonos, croissants y panes se forman a mano, uno por uno.' },
  { hora: '5:00 a. m.', titulo: 'Llegan los proveedores', texto: 'Leche, huevos y levadura entran por la puerta de cargue y se revisan antes de usarse.' },
  { hora: '6:00 a. m.', titulo: 'Primera horneada', texto: 'El olor llega hasta la esquina. Se llena la vitrina.' },
  { hora: '7:00 a. m.', titulo: 'Abrimos la puerta', texto: 'Primer tinto del día para los vecinos de siempre.' },
  { hora: '3:00 p. m.', titulo: 'Segunda horneada', texto: 'Baguettes y pan para la comida, recién salidos.' },
];

export const TESTIMONIOS = [
  { cita: 'Llevo ocho años comprando el pan de masa madre los sábados. No ha cambiado ni un poquito, y eso es lo que más me gusta.', autor: 'Marta Lucía', lugar: 'Vecina de Laureles' },
  { cita: 'El croissant sale a las 6:30 y a las 7:15 ya no queda. Aprendí a madrugar por él.', autor: 'Julián', lugar: 'Cliente de la sede Envigado' },
  { cita: 'Encargamos la torta de cumpleaños de mi hija con dos días y llegó exactamente como la pedimos.', autor: 'Carolina', lugar: 'Pedido para El Poblado' },
];

export interface Sede {
  nombre: string;
  direccion: string;
  barrio: string;
  horario: string[];
  telefono: string;
  nota?: string;
}

export const SEDES: Sede[] = [
  {
    nombre: 'Laureles',
    direccion: 'Cra. 70 #44-21',
    barrio: 'Laureles, Medellín',
    horario: ['Lunes a sábado, 6:30 a. m. a 8:00 p. m.', 'Domingos y festivos, 7:00 a. m. a 2:00 p. m.'],
    telefono: '(604) 444 1820',
    nota: 'Sede principal y obrador. Aquí se hornea todo.',
  },
  {
    nombre: 'Envigado',
    direccion: 'Cl. 38 Sur #43-12',
    barrio: 'Parque de Envigado',
    horario: ['Lunes a sábado, 7:00 a. m. a 8:00 p. m.', 'Domingos, 8:00 a. m. a 1:00 p. m.'],
    telefono: '(604) 444 1821',
  },
  {
    nombre: 'El Poblado',
    direccion: 'Cra. 35 #8A-40',
    barrio: 'Provenza, Medellín',
    horario: ['Todos los días, 7:00 a. m. a 9:00 p. m.'],
    telefono: '(604) 444 1822',
    nota: 'Barra de café con métodos filtrados.',
  },
];

export const VALORES = [
  { titulo: 'La masa tiene su tiempo', texto: 'No aceleramos la fermentación con aditivos. Si un pan necesita 24 horas, espera 24 horas.' },
  { titulo: 'Proveedores con nombre', texto: 'Sabemos de qué molino viene la harina y de qué finca el café. Si uno falla, sabemos qué se afecta antes de abrir.' },
  { titulo: 'Lo del día es del día', texto: 'Lo que no se vende se dona a las 8:00 p. m. a un comedor del barrio. Nada vuelve a la vitrina.' },
  { titulo: 'La vitrina siempre llena', texto: 'Planeamos el orden de preparación para que el primer cliente y el último encuentren lo mismo.' },
];

export const PREGUNTAS = [
  { p: '¿Hacen domicilios?', r: 'Sí, en un radio de 3 km de cada sede, de 7:00 a. m. a 6:00 p. m. Se piden por teléfono a la sede más cercana.' },
  { p: '¿Con cuánto tiempo encargo una torta?', r: 'Con 48 horas para tortas sencillas y con cinco días para tortas de dos pisos o decoradas.' },
  { p: '¿Tienen productos sin gluten?', r: 'Tenemos pandebono y galletas de almendra sin gluten, pero se hornean en el mismo obrador, así que no son aptos para celiaquía.' },
  { p: '¿Qué medios de pago reciben?', r: 'Efectivo, tarjetas débito y crédito, y transferencias.' },
];

export const formatoPrecio = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
