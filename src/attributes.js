import ADDONS from './addons.js';
import PALETTE from './palette.js';

var TYPES = {
  Brown: {
    furColor: PALETTE.fur.brown,
  },
  "Light Brown": {
    furColor: PALETTE.fur.lbrown,
  },
  Dark: {
    furColor: PALETTE.fur.dark,
  },
  Red: {
    furColor: PALETTE.fur.red,
  },
  Zombie: {
    furColor: PALETTE.fur.zombie,
    faceColor: PALETTE.face.zombie,
  },
  Skeleton: {
    furColor: PALETTE.fur.skelly,
    faceColor: PALETTE.face.skelly,
    addon: ADDONS.skellyFace,
  },
  Albino: {
    furColor: PALETTE.fur.albino,
  },
}

var SHADES = {
  None: {
  },
  Black: {
    addon: ADDONS.shade,
    lensColor: PALETTE.BLACK,
  },
  Purple: {
    addon: ADDONS.shade,
    lensColor: PALETTE.shades.purple,
  },
  Blue: {
    addon: ADDONS.shade,
    lensColor: PALETTE.shades.blue,
  },
  Retro: {
    addon: ADDONS.retro,
    lensColor: PALETTE.shades.retro,
  },
  'Blue Laser': {
    addon: ADDONS.laser,
    lensColor: PALETTE.shades.bluelaser,
    lensEmission: 1,
    frameColor: PALETTE.LASER_FRAME,
  },
  'Red Laser': {
    addon: ADDONS.laser,
    lensColor: PALETTE.shades.redlaser,
    lensEmission: 1,
    frameColor: PALETTE.LASER_FRAME,
  },
  'Green Laser': {
    addon: ADDONS.laser,
    lensColor: PALETTE.shades.greenlaser,
    lensEmission: 1,
    frameColor: PALETTE.LASER_FRAME,
  },
}

var SMOKING = {
  None: {},
  Vape: {
    smoking1Color: PALETTE.smoking.vape1,
    smoking2Color: PALETTE.smoking.vape2,
    smokingEmission: 1,
    addon: ADDONS.vape,
  },
  Cigarette: {
    smoking1Color: PALETTE.smoking.cigarette1,
    smoking2Color: PALETTE.smoking.cigarette2,
    addon: ADDONS.cigarette,
  },
  Pipe: {
    smoking1Color: PALETTE.smoking.pipe,
    addon: ADDONS.pipe,
  },
  Cigar: {
    smoking1Color: PALETTE.smoking.cigar1,
    smoking2Color: PALETTE.smoking.cigar2,
    smokingEmission: 1,
    addon: ADDONS.cigar,
  },
}

var HATS = {
  None: {},
  'Orange Beanie': {
    color: PALETTE.hats.orange,
    addon: ADDONS.beanie,
  },
  'Black Beanie': {
    color: PALETTE.hats.black,
    addon: ADDONS.beanie,
  },
  'Black Cap': {
    color: PALETTE.hats.blackCap,
    addon: ADDONS.cap,
  },
  'Black Cap Backwards': {
    color: PALETTE.hats.blackCap,
    addon: ADDONS.capBackwards,
  },
  'Red Cap': {
    color: PALETTE.hats.redCap,
    addon: ADDONS.cap,
  },
  'Red Cap Backwards': {
    color: PALETTE.hats.redCap,
    addon: ADDONS.capBackwards,
  },
  'Blue Cap': {
    color: PALETTE.hats.blueCap,
    addon: ADDONS.cap,
  },
  'Blue Cap Backwards': {
    color: PALETTE.hats.blueCap,
    addon: ADDONS.capBackwards,
  },
  'Camo Cap': {
    color: PALETTE.hats.camo,
    addon: ADDONS.cap,
  },
  'Camo Cap Backwards': {
    color: PALETTE.hats.camo,
    addon: ADDONS.capBackwards,
  },
  'Solana Cap': {
    color: PALETTE.hats.solana,
    addon: ADDONS.solanaCap,
  },
  'Solana Cap Backwards': {
    color: PALETTE.hats.solana,
    addon: ADDONS.solanaCapBackwards,
  },
  'White Fedora': {
    color: PALETTE.hats.whiteFedora,
    addon: ADDONS.fedora,
  },
  'Purple Fedora': {
    color: PALETTE.hats.purpleFedora,
    addon: ADDONS.fedora,
  },
  'Black Fedora': {
    color: PALETTE.hats.blackFedora,
    addon: ADDONS.fedora,
  },
  'Boater': {
    color: PALETTE.hats.boater,
    addon: ADDONS.boater,
  },
}

export default {
  defaults: {
    gender: 'Monkie',
    types: 'Brown',
    chain: 'None',
    earrings: 'None',
    grill: 'None',
    clothing: 'None',
    shades: 'None',
    smoking: 'None',
    hats: 'None',
    background: 'Pale Green',
  },
  opts: {
    gender: ['Monkie', 'Monkette'],
    types: Object.keys(TYPES),
    chain: ['None', 'Silver', 'Gold'],
    earrings: ['None', 'Silver', 'Gold'],
    grill: ['None', 'Silver', 'Gold'],
    clothing: Object.keys(PALETTE.clothing),
    shades: Object.keys(SHADES),
    smoking: Object.keys(SMOKING),
    hats: Object.keys(HATS),
    background: Object.keys(PALETTE.backgrounds),
  },
  createModel(attrs) {
    var modelData = {}
    modelData.gender = attrs.gender
    modelData.background = attrs.background
    modelData.hair = TYPES[attrs.types]
    modelData.shades = SHADES[attrs.shades]
    modelData.smoking = SMOKING[attrs.smoking]
    modelData.hats = HATS[attrs.hats]

    modelData.chain = attrs.chain
    modelData.earrings = attrs.earrings
    modelData.grill = attrs.grill
    modelData.clothing = attrs.clothing
    modelData.clothingAddon = modelData.clothing === 'Camo Jacket' ? ADDONS.camoJacket : null;

    return modelData
  }
}
