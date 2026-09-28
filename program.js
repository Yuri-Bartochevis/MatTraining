/*
 * Mat Strength: training program data.
 * Edit this file to change exercises, sets, targets or rest times.
 * Exercise types: 'wr' kg x reps, 'r' reps with optional added kg,
 * 'dist' kg and meters, 'time' seconds.
 * Keep exercise ids stable: your history is linked to them.
 * Each day's 'warmup' field picks which primer from WARMUP it uses.
 */
const PROGRAM = [
  {id:'d1', n:1, title:'Lower and pull', kind:'hard', warmup:'lower', ex:[
    {id:'jump', name:'Box or broad jump', type:'r', sets:3, target:'3 × 3–5', rest:90, tip:'Fast and crisp. Stop before you slow down.'},
    {id:'fsquat', name:'Front squat', type:'wr', sets:4, target:'3–4 × 3–5', rest:180},
    {id:'rdl', name:'Romanian deadlift', type:'wr', sets:3, target:'3 × 6–8', rest:150},
    {id:'row', name:'Barbell row', type:'wr', sets:4, target:'3–4 × 6–8', rest:120},
    {id:'shrug', name:'Dumbbell shrug', type:'wr', sets:3, target:'3 × 10–12', rest:60, tip:'Weight is per dumbbell. Hold 2 s at the top. No straps, so it doubles as grip work.'},
    {id:'neck', name:'Neck isometrics', type:'time', sets:3, target:'3 × 10 s each side', rest:45},
  ]},
  {id:'d2', n:2, title:'Light upper', kind:'light', warmup:'upper', ex:[
    {id:'incdb', name:'Incline dumbbell press', type:'wr', sets:3, target:'3 × 8–12', rest:90, tip:'Weight is per dumbbell.'},
    {id:'pullup', name:'Pull-ups', type:'r', sets:3, target:'3 × max minus 2', rest:120, tip:'Towel or gi grip if you can. Add kg only if easy.'},
    {id:'dbrow', name:'One-arm dumbbell row', type:'wr', sets:3, target:'3 × 10–12 per arm', rest:60, tip:'Pull the elbow toward your hip. Pause 1 s at the top.'},
    {id:'dbohp', name:'Seated dumbbell shoulder press', type:'wr', sets:3, target:'3 × 8–10', rest:90, tip:'Weight is per dumbbell. Palms can turn in slightly if it feels better.'},
    {id:'reardelt', name:'Rear delt raise or face pull', type:'wr', sets:3, target:'3 × 15', rest:60},
    {id:'curl', name:'Dumbbell curl', type:'wr', sets:3, target:'2–3 × 10–12', rest:0, tip:'Superset with triceps extension: go straight to it, then rest.'},
    {id:'triext', name:'Triceps extension', type:'wr', sets:3, target:'2–3 × 10–12', rest:60, tip:'Second half of the superset. Rest after this, then back to curls.'},
    {id:'knee', name:'Hanging knee raise', type:'r', sets:3, target:'3 × 10–15', rest:60},
  ]},
  {id:'d3', n:3, title:'Upper and hinge', kind:'hard', warmup:'upper', ex:[
    {id:'plyopush', name:'Explosive push-up', type:'r', sets:3, target:'3 × 3–5', rest:60, tip:'Push hard enough for your hands to leave the floor. Stop when reps slow down.'},
    {id:'bench', name:'Bench press', type:'wr', sets:4, target:'3–4 × 3–5', rest:180, tip:'Pin press counts here too.'},
    {id:'deadlift', name:'Deadlift', type:'wr', sets:3, target:'3 × 2–5', rest:180},
    {id:'chinup', name:'Chin-ups', type:'r', sets:3, target:'3 × 5–8', rest:120},
    {id:'landmine', name:'Landmine rotation', type:'wr', sets:3, target:'3 × 5 per side', rest:90, tip:'Turn your feet and hips with the bar.'},
    {id:'pallof', name:'Pallof press', type:'wr', sets:3, target:'3 × 10 per side', rest:60, tip:'Press out and hold 2 s. Do not let the cable turn you.'},
  ]},
  {id:'d4', n:4, title:'Light lower and prehab', kind:'light', warmup:'lower', ex:[
    {id:'bss', name:'Bulgarian split squat', type:'wr', sets:3, target:'3 × 8 per leg', rest:90},
    {id:'hamcurl', name:'Hamstring curl', type:'wr', sets:3, target:'3 × 10–12', rest:60},
    {id:'backext', name:'Isometric back extension', type:'time', sets:3, target:'3 × 30–45 s', rest:60},
    {id:'sideplank', name:'Side plank', type:'time', sets:3, target:'3 × 30 s per side', rest:45},
    {id:'extrot', name:'Cable external rotation', type:'wr', sets:3, target:'3 × 15 per arm', rest:45, tip:'Elbow pinned to your side, towel under it. Light and slow.'},
    {id:'latraise', name:'Lateral raise', type:'wr', sets:3, target:'3 × 12–15', rest:60, tip:'Weight is per dumbbell. Raise to shoulder height, lower slowly.'},
    {id:'grip', name:'Grip work', type:'r', sets:3, target:'3 sets', rest:60, tip:'Gripper, plate pinch or gi hangs. Log reps or seconds.'},
  ]},
];
const EX = {}; PROGRAM.forEach(d => d.ex.forEach(e => EX[e.id] = {...e, day:d.id}));
const DAY = Object.fromEntries(PROGRAM.map(d => [d.id, d]));

/*
 * Exercises you no longer do. Keep them here so old workouts still show
 * their names in Log and their trends in Progress. Never reuse these ids.
 */
const RETIRED = [
  {id:'farmer', name:"Farmer's walk", type:'dist'},
  {id:'bearhug', name:'Sandbag bear-hug carry', type:'dist'},
  {id:'mbthrow', name:'Med ball chest throw', type:'wr'},
];

/*
 * Warm-up checklist, done before every session. Not logged in history.
 * Order: general, then the day's primer, then ramp-up sets for the first heavy lift.
 */
const WARMUP = {
  general: [
    {id:'wu-cardio', name:'Bike, rower or jump rope', dose:'3 min easy'},
    {id:'wu-catcow', name:'Cat-cow', dose:'× 8'},
    {id:'wu-wgs', name:"World's greatest stretch", dose:'× 3 per side'},
    {id:'wu-9090', name:'90/90 hip switches', dose:'× 6 per side'},
    {id:'wu-pullapart', name:'Band pull-aparts', dose:'× 15'},
    {id:'wu-dislocate', name:'Band dislocates', dose:'× 10'},
    {id:'wu-scappull', name:'Scap pull-ups', dose:'× 8'},
  ],
  primer: {
    lower: [
      {id:'wu-bwsquat', name:'Bodyweight squat', dose:'× 10'},
      {id:'wu-bridge', name:'Glute bridge', dose:'× 10'},
    ],
    upper: [
      {id:'wu-pushup', name:'Push-ups', dose:'× 10'},
      {id:'wu-bandext', name:'Band external rotation', dose:'× 15 per arm'},
    ],
  },
  ramp: [
    {id:'wu-ramp1', name:'Empty bar', dose:'× 8'},
    {id:'wu-ramp2', name:'About 50%', dose:'× 5'},
    {id:'wu-ramp3', name:'About 70%', dose:'× 3'},
    {id:'wu-ramp4', name:'About 85%', dose:'× 1'},
  ],
  rampTip:'Full ramp for the first heavy lift only. Later lifts need one or two lighter sets.',
};

const STANDARDS = [
  {id:'bench', label:'Bench press', lo:1.3, hi:1.5},
  {id:'fsquat', label:'Squat (logged as front squat)', lo:1.5, hi:2.0},
  {id:'deadlift', label:'Deadlift', lo:2.0, hi:2.5},
];
const RIR = [3,3,2,2,2,1,1];
const ACT = {'bjj-hard':{label:'BJJ, hard sparring', color:'#141414'}, 'bjj-light':{label:'BJJ, drilling', color:'#7B8794'}, 'crossfit':{label:'CrossFit class', color:'#B8272C'}};
