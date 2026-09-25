/*
 * Mat Strength: training program data.
 * Edit this file to change exercises, sets, targets or rest times.
 * Exercise types: 'wr' kg x reps, 'r' reps with optional added kg,
 * 'dist' kg and meters, 'time' seconds.
 * Keep exercise ids stable: your history is linked to them.
 */
const PROGRAM = [
  {id:'d1', n:1, title:'Lower and pull', kind:'hard', ex:[
    {id:'jump', name:'Box or broad jump', type:'r', sets:3, target:'3 × 3–5', rest:90, tip:'Fast and crisp. Stop before you slow down.'},
    {id:'fsquat', name:'Front squat', type:'wr', sets:4, target:'3–4 × 3–5', rest:180},
    {id:'rdl', name:'Romanian deadlift', type:'wr', sets:3, target:'3 × 6–8', rest:150},
    {id:'row', name:'Barbell row', type:'wr', sets:4, target:'3–4 × 6–8', rest:120},
    {id:'farmer', name:"Farmer's walk", type:'dist', sets:3, target:'3 × 30 m', rest:90, tip:'Weight is per hand.'},
    {id:'neck', name:'Neck isometrics', type:'time', sets:3, target:'3 × 10 s each side', rest:45},
  ]},
  {id:'d2', n:2, title:'Light upper', kind:'light', ex:[
    {id:'incdb', name:'Incline dumbbell press', type:'wr', sets:3, target:'3 × 8–12', rest:90, tip:'Weight is per dumbbell.'},
    {id:'pullup', name:'Pull-ups', type:'r', sets:3, target:'3 × max minus 2', rest:120, tip:'Towel or gi grip if you can. Add kg only if easy.'},
    {id:'reardelt', name:'Rear delt raise or face pull', type:'wr', sets:3, target:'3 × 15', rest:60},
    {id:'curl', name:'Dumbbell curl', type:'wr', sets:3, target:'2–3 × 10–12', rest:60},
    {id:'triext', name:'Triceps extension', type:'wr', sets:3, target:'2–3 × 10–12', rest:60},
    {id:'knee', name:'Hanging knee raise', type:'r', sets:3, target:'3 × 10–15', rest:60},
  ]},
  {id:'d3', n:3, title:'Upper and hinge', kind:'hard', ex:[
    {id:'mbthrow', name:'Med ball chest throw', type:'wr', sets:3, target:'3 × 3–5', rest:60},
    {id:'bench', name:'Bench press', type:'wr', sets:4, target:'3–4 × 3–5', rest:180, tip:'Pin press counts here too.'},
    {id:'deadlift', name:'Deadlift', type:'wr', sets:3, target:'3 × 2–5', rest:180},
    {id:'chinup', name:'Chin-ups', type:'r', sets:3, target:'3 × 5–8', rest:120},
    {id:'landmine', name:'Landmine rotation', type:'wr', sets:3, target:'3 × 5 per side', rest:90, tip:'Turn your feet and hips with the bar.'},
    {id:'bearhug', name:'Sandbag bear-hug carry', type:'dist', sets:3, target:'3 × 30 m', rest:90, tip:'Change grip each set: gable, seatbelt.'},
  ]},
  {id:'d4', n:4, title:'Light lower and prehab', kind:'light', ex:[
    {id:'bss', name:'Bulgarian split squat', type:'wr', sets:3, target:'3 × 8 per leg', rest:90},
    {id:'hamcurl', name:'Hamstring curl', type:'wr', sets:3, target:'3 × 10–12', rest:60},
    {id:'backext', name:'Isometric back extension', type:'time', sets:3, target:'3 × 30–45 s', rest:60},
    {id:'sideplank', name:'Side plank', type:'time', sets:3, target:'3 × 30 s per side', rest:45},
    {id:'grip', name:'Grip work', type:'r', sets:3, target:'3 sets', rest:60, tip:'Gripper, plate pinch or gi hangs. Log reps or seconds.'},
  ]},
];
const EX = {}; PROGRAM.forEach(d => d.ex.forEach(e => EX[e.id] = {...e, day:d.id}));
const DAY = Object.fromEntries(PROGRAM.map(d => [d.id, d]));
const STANDARDS = [
  {id:'bench', label:'Bench press', lo:1.3, hi:1.5},
  {id:'fsquat', label:'Squat (logged as front squat)', lo:1.5, hi:2.0},
  {id:'deadlift', label:'Deadlift', lo:2.0, hi:2.5},
];
const RIR = [3,3,2,2,2,1,1];
const ACT = {'bjj-hard':{label:'BJJ, hard sparring', color:'#141414'}, 'bjj-light':{label:'BJJ, drilling', color:'#7B8794'}, 'crossfit':{label:'CrossFit class', color:'#B8272C'}};

