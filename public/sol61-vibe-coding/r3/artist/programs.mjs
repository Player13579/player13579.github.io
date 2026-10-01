// Visual pseudocode, never evaluated as JavaScript or used as gameplay commands.
// English underscore item spellings map explicitly to producer hyphen item IDs.
const creation={
  'mineral-water':'mineral_water',seawater:'seawater',antidote:'antidote',molotov:'molotov',
  'frag-grenade':'frag_grenade','stun-grenade':'stun_grenade',mercury:'mercury',lead:'lead',
  uranium:'uranium',plutonium:'plutonium','orichalcum-sword':'orichalcum_sword',
  'vending-ice':'ice','vending-heated-water':'heated_water',
};
const other={
  'vending-evade':'extend("dodge");','vending-speed':'increase("speed");',warp:'create_charge("warp");',
  'vending-mystery':'resolve("mystery");',fire:'create_charge("fire");',protect:'create_charge("protect");',
  heal:'recover("health");','vending-mana':'gain("mana");',stamina:'gain("stamina");',
  'vending-railgun':'invent("railgun");','vending-particle-cannon':'invent("particle_cannon");',
  'vending-excalibur':'invent("excalibur");','vending-exile':'set("exiled",1);',
  'vending-hack':'enable("hack");','vending-handgun':'create_weapon("handgun");',
  'vending-smg':'create_weapon("smg");','vending-assault':'create_weapon("assault");',
  'vending-sniper':'create_weapon("sniper");','vending-taser':'create_weapon("taser");',
  iai:'create_charge("iai");',gold:'gain("credits");','vending-rpg':'create_weapon("rpg");',
  'vending-missile':'create_weapon("missile");',
  'hack-credits-delete':'delete_credits(target);','hack-credits-duplicate':'duplicate_credits(target);',
  'hack-items-delete':'delete_inventory(target);','hack-items-duplicate':'duplicate_inventory(target);',
  'hack-hp-delete':'delete_health(target);','hack-hp-duplicate':'recover_health(target);',
  'hack-mana-delete':'delete_mana(target);','hack-mana-duplicate':'duplicate_mana(target);',
  'hack-status-recover':'recover_status(target);',revive:'revive(target);',
};
export const PROGRAMS=Object.freeze({...Object.fromEntries(Object.entries(creation).map(([id,text])=>[id,`create("${text}");`])),...other});
export const CREATION_TARGETS=Object.freeze(creation);
export function programFor(variant) {
  const statement=PROGRAMS[variant];
  if(!statement) throw new RangeError('Unknown canonical Vibe recipe; do not synthesize a label');
  // Split at lexical boundaries; never break an identifier, quote or underscore.
  const open=statement.indexOf('(');
  const lines=statement.length<=25?[statement]:[statement.slice(0,open+1),statement.slice(open+1)];
  if(lines.some(line=>line.length>27)) throw new RangeError('Recipe exceeds authored layout');
  return {statement,lines,exactVariant:variant,itemTarget:creation[variant]?.replaceAll('_','-')??null,
    targetIdentityAvailable:false,representation:'authored-visual-pseudocode-not-executable-game-api'};
}
