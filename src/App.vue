<script setup>
import aframe from 'aframe'
import SVOX from './lib/smoothvoxels.1.1.0.min.js'

import { RouterLink, RouterView } from 'vue-router'
import Creator from '@/components/Creator.vue'
import Viewer from '@/components/Viewer.vue'
</script>

<script>

import baseMonkie from './assets/monkie.svox?raw'
import baseMonkette from './assets/monkette.svox?raw'
import ADDONS from './addons.js'
import PALETTE from './palette.js'
import attributes from './attributes.js'

      // var faceColor = PALETTE.face.normal;
      // var furColor = PALETTE.fur.brown;

      // var modelData = {
      //   faceColor: PALETTE.face.normal,
      //   furColor: PALETTE.fur.brown,
      // }

      function render(parent, elTag, elAttributes, elText) {

          let element = document.createElement(elTag);

          if (elText !== null && elText !== undefined && elText !== '') {
            element.innerHTML += elText;
          }

          for (let attrName in elAttributes) {
              element.setAttribute(attrName, elAttributes[attrName]);
          };

          if (parent)
            return parent.appendChild(element);
          else
            return element;
      }

      var BASE_DIM = [15, 19, 23,];



      var metalColor = function(value, code, noneColor, bling) {
        return value === 'Gold' ?
`material lighting = flat, roughness = 0.0, metalness = 1, emissive = ${PALETTE.GOLD} 0.5
  colors = ${code}:${PALETTE.GOLD}` : value === 'Silver' ?
`material lighting = flat, roughness = 0.0, metalness = 1, emissive = #BFBFBF 0.5
  colors = ${code}:#BFBFBF` : bling ?
// `material lighting = flat, roughness = 0.2
//   colors = ${code}:${PALETTE.GOLD}` : value === 'Silver' ?
// `material lighting = flat, roughness = 0.2
//   colors = ${code}:#BFBFBF` : bling ?
`material lighting = flat, roughness = 0.0, emissive = ${noneColor} 1.0, opacity = 1
  colors = ${code}:${noneColor}`: noneColor ?
`material lighting = flat
  colors = ${code}:${noneColor}`:
`material lighting = flat, opacity = 0.0
  colors = ${code}:#000`;
      }

      var earringColor = function(earrings) {
        var base = metalColor(earrings.base, 'D')
        var dangle = metalColor(earrings.dangle, 'S', earrings.dangle, earrings.bling)
        var hoops = metalColor(earrings.hoops, 'T')
        return [base, dangle, hoops].join('\n');
      }

      var refreshModel = function(modelData) {
        // console.log(modelData)

        var furColor = modelData.hair.furColor
        var faceColor = modelData.hair.faceColor || PALETTE.face.normal

        var chainColor = metalColor(modelData.chain, 'C');
        var earColor = earringColor(modelData.earrings);
        var mouthColor = metalColor(modelData.mouth, 'M', modelData.mouthColor || faceColor);
        var clothingColor = PALETTE.clothing[modelData.clothing] || furColor;
        var lensColor = modelData.shades.lensColor || PALETTE.BLACK;
        var frameColor = modelData.shades.frameColor || PALETTE.BLACK;
        var lensEmission = modelData.shades.lensEmission || 0.5;

        var smoking1Color = modelData.smoking.smoking1Color || PALETTE.BLACK;
        var smoking2Color = modelData.smoking.smoking2Color || PALETTE.BLACK;
        var smokingEmission = modelData.smoking.smokingEmission || 0.0;

        var hatsColor = modelData.hats.color || [];
        var hats1Color = hatsColor[0] || PALETTE.BLACK;
        var hats2Color = hatsColor[1] || PALETTE.BLACK;
        var hats3Color = hatsColor[2] || PALETTE.BLACK;
        var hats4Color = hatsColor[3] || PALETTE.BLACK;

        var voxels = modelData.gender === 'Monkie' ? baseMonkie : baseMonkette;
        voxels = mergeVoxels(voxels, modelData.hair.addon);
        voxels = mergeVoxels(voxels, modelData.clothingAddon);
        voxels = mergeVoxels(voxels, modelData.shades.addon);
        voxels = mergeVoxels(voxels, modelData.smoking.addon);
        voxels = mergeVoxels(voxels, modelData.hats.addon);

        SVOX.models.MobMonkie = `
          size = ${BASE_DIM[0]}  ${BASE_DIM[1]}  ${BASE_DIM[2]}
          scale = 0.07
          rotation = 0 0 0
          ao = 1 1
          ${chainColor}
          ${earColor}
          ${mouthColor}
          material lighting = flat, roughness = 0.2, metalness = 1, emissive = ${frameColor} 0.5
            colors = H:${frameColor}
          material lighting = flat, roughness = 0.2, metalness = 0.5, emissive = ${lensColor} ${lensEmission}
            colors = I:${lensColor}
          material lighting = flat, emissive = ${smoking2Color} ${smokingEmission}
            colors = L:${smoking2Color}
          material lighting = flat,  emissive = ${PALETTE.SMOKE} 0.5, deform = 0.2 1, scatter = 0.1
            colors = N:${PALETTE.SMOKE}
          material lighting = flat
            colors = A:${furColor} B:${faceColor} K:${PALETTE.BLACK} E:${clothingColor} F:${PALETTE.CAMO2} G:${PALETTE.CAMO3} J:${smoking1Color} U:${PALETTE.SOLANA2} V:${PALETTE.SOLANA3}
          material lighting = flat
            colors = O:${hats1Color} P:${hats2Color} Q:${hats3Color} R:${hats4Color}
          voxels =
${voxels}
        `;

        // console.log(SVOX.models.MobMonkie)

        let model = document.getElementById('model');
        if (model)
          model.parentNode.removeChild(model);

        let container = document.getElementById('container');
        container.textContent = '';

        model = render(container, 'a-entity', {
          id: "model",
          svox: { model: "MobMonkie" },
          // position: "0 0 -2",
          // animation: "property:rotation; from:0 0 0; to:0 360 0; loop: true; easing:linear; dur:5000",
        });

        var FAMILIES = {
          'Bananos': {
            shape: 'a-tetrahedron',
            props: {
              color: '#FF926B',
              radius: '.8',
              position: "0 -0.26 0",
              roughness: 0.1,
              rotation: '35 0 45',
            },
          },
          'Orangutanos': {
            shape: 'a-box',
            props: {
              color: '#FF926B',
              width: '.8',
              height: '.8',
              depth: '.8',
              position: "0 -0.4 0",
              roughness: 0.1,
              rotation: '0 0 0',
            },
          },
          'Chimplinos': {
            shape: 'a-dodecahedron',
            props: {
              color: '#FF926B',
              radius: '.8',
              position: "0 -0.63 0",
              roughness: 0.1,
              rotation: '32 0 0',
            },
          },
        }

        const fam = FAMILIES[modelData.family]

        const body = render(container, fam.shape, fam.props);

        requestAnimationFrame(function(){
          var box = new THREE.Box3().setFromObject(model.object3D);
          model.object3D.position.y = (box.max.y - box.min.y) / 2
        })

        if (modelData.background) {
          let scene = document.getElementById('scene');
          if (scene) {
            scene.setAttribute('background', 'color: ' + PALETTE.backgrounds[modelData.background])
            body.setAttribute('color', PALETTE.backgrounds[modelData.background])
          }
        }

        const MIN_ROT = Math.PI / 100
        document.addEventListener("keydown", (e) => {
          const r = body.object3D.rotation
          const p = body.object3D.position
          console.log(e.key)
          if (e.key === 'q') {
            r.x = r.x + MIN_ROT;
          }
          if (e.key === 'w') {
            r.x = r.x - MIN_ROT;
          }
          if (e.key === 'a') {
            r.y = r.y + MIN_ROT;
          }
          if (e.key === 's') {
            r.y = r.y - MIN_ROT;
          }
          if (e.key === 'z') {
            r.z = r.z + MIN_ROT;
          }
          if (e.key === 'x') {
            r.z = r.z - MIN_ROT;
          }
          if (e.key === 'ArrowUp') {
            p.y = p.y + 0.01
          }
          if (e.key === 'ArrowDown') {
            p.y = p.y - 0.01
          }
          console.log(`pos ${p.x} ${p.y} ${p.z}`)
          console.log(`rot ${r.x} ${r.y} ${r.z}`)
        });

      }



      function parseVoxels(mask) {
        var rows = mask.voxels.replaceAll('.', ' ').split('\n');
        rows = rows.filter(r => r.length > 0)
        // console.log(rows)
        if (rows.length !== mask.dimension[2]) {
          throw "error, expected " + mask.dimension[2] + " rows, got " + rows.length
        }
        rows = rows.map(function(row) {
          if (mask.dimension[0] * mask.dimension[1] + (mask.dimension[1] - 1) !== row.length) {
            throw "error, expected " + mask.dimension[0] + " x " + mask.dimension[1] + " chars, got " + row.length
          }
          var lines = []
          for (var i = 0; i < row.length; i += mask.dimension[0] + 1) {
            lines.push(row.substr(i, mask.dimension[0]))
          }
          return lines
        });
        // console.log(rows)
        // console.log(writeVoxels(rows))
        return rows
      }

      function writeVoxels(voxels) {
        return '\n' + voxels.map((row) => row.join(' ')).join('\n')
      }

      function addition(org, mask) {
        if (org.length !== mask.length) {
          throw "oh no, lengths don't match: " + org + " and " + mask;
        }
        var replaced = []
        for (var i = 0; i < org.length; i++) {
          if (mask.charAt(i) === ' ') {
            replaced.push(org.charAt(i));
          } else {
            replaced.push(mask.charAt(i));
          }
        }
        return replaced.join('');
      }

      function mergeVoxels(base, mask) {
        if (!mask) {
          return base;
        }
        var baseVx = parseVoxels({dimension: BASE_DIM, voxels: base})
        var mod = parseVoxels(mask)
        for (var z = 0; z < mask.dimension[2]; z++) {
          for (var y = 0; y < mask.dimension[1]; y++) {

            var org = baseVx[mask.offset[2] + z][mask.offset[1] + y];
            // console.log(org, mask.offset[2] + z, mask.offset[1] + y);
            var replaced = org.substr(0, mask.offset[0])
                + addition(org.substr(mask.offset[0], mask.dimension[0]), mod[z][y])
                + org.substring(mask.offset[0] + mask.dimension[0], org.length)
            // console.log(replaced);
            baseVx[mask.offset[2] + z][mask.offset[1] + y] = replaced

          }
        }
        return writeVoxels(baseVx);
      }


export default {
  methods: {
    refreshModel: refreshModel,
  },
  mounted() {
    refreshModel(attributes.createModel(attributes.defaults));
  }
}

</script>

<template>
  <Creator msg="WAGMI" @model-update="refreshModel" />
  <Viewer />
</template>

<style>
@import '@/fonts/stylesheet.css';
@import '@/assets/base.css';
</style>
