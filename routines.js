export const MOVES = {
  neckL:  {name:'Oreja al hombro izquierdo', cue:'Inclina la cabeza despacio. Deja el hombro abajo y respira.', a:{tilt:0}, b:{tilt:-32}, period:4},
  neckR:  {name:'Oreja al hombro derecho', cue:'Mismo gesto hacia el otro lado, sin forzar.', a:{tilt:0}, b:{tilt:32}, period:4},
  chin:   {name:'Retracción de mentón', cue:'Mirando al frente, lleva el mentón hacia atrás como para hacer papada. Alarga la nuca, aguanta dos segundos y suelta.', a:{nod:0}, b:{nod:.35}, period:4},
  levL:   {name:'Nuca hacia la axila izquierda', cue:'Gira la cabeza un poco a la izquierda y baja la nariz hacia la axila. Sujeta la silla con la mano derecha.', a:{tilt:0,nod:0}, b:{tilt:-22,nod:.8,rS:4}, period:5},
  levR:   {name:'Nuca hacia la axila derecha', cue:'Cambia de lado: nariz hacia la axila derecha, hombro izquierdo abajo.', a:{tilt:0,nod:0}, b:{tilt:22,nod:.8,lS:4}, period:5},
  shrug:  {name:'Hombros arriba y abajo', cue:'Sube los hombros hacia las orejas, aguanta un segundo y suéltalos.', a:{shrug:0}, b:{shrug:1}, period:2},
  chest:  {name:'Apertura de pecho', cue:'Codos atrás, junta los omóplatos y abre el pecho.', a:{lS:60,lE:80,rS:60,rE:80}, b:{lS:95,lE:40,rS:95,rE:40}, period:3.5},
  reach:  {name:'Brazos al cielo', cue:'Entrelaza las manos arriba y estírate hacia el techo.', a:{lS:150,rS:150,lE:20,rE:20}, b:{lS:172,rS:172,shrug:.4}, period:4},
  sideL:  {name:'Inclinación lateral izquierda', cue:'Brazo derecho arriba, inclina el tronco a la izquierda.', a:{rS:165}, b:{bend:-18,rS:170,lS:20}, period:4},
  sideR:  {name:'Inclinación lateral derecha', cue:'Brazo izquierdo arriba, inclina el tronco a la derecha.', a:{lS:165}, b:{bend:18,lS:170,rS:20}, period:4},
  fold:   {name:'Flexión hacia adelante', cue:'Rodillas suaves, deja caer el tronco y los brazos. Sube vértebra a vértebra.', a:{fold:0,crouch:.1}, b:{fold:.85,crouch:.25,lS:-5,rS:-5}, period:5},
  squat:  {name:'Sentadilla suave', cue:'Baja como si te sentaras y vuelve a subir. Sin prisa.', a:{lS:80,rS:80}, b:{crouch:1,lS:85,rS:85,fold:.15}, period:3},
};
export const ROUTINES = [
  {id:'neck', name:'Cuello y hombros', why:'Para el cuello rígido de mirar la pantalla', steps:[['chin',30],['neckL',30],['neckR',30],['levL',30],['levR',30],['shrug',20],['chest',30]]},
  {id:'back', name:'Espalda de oficina', why:'Para la espalda tensa de estar sentado', steps:[['reach',30],['sideL',30],['sideR',30],['fold',40],['chest',30],['squat',30]]},
  {id:'quick', name:'Pausa de 1 minuto', why:'Cuando el break es corto', steps:[['shrug',20],['neckL',10],['neckR',10],['reach',20]]},
];
