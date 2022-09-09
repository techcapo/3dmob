<script setup>
import aframe from 'aframe'
import SVOX from './lib/smoothvoxels.1.1.0.min.js'

import { RouterLink, RouterView } from 'vue-router'
import Creator from '@/components/Creator.vue'
import Viewer from '@/components/Viewer.vue'
import Connector from '@/components/Connector.vue'
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

      function loadEnvMap(scene, color) {
        scene.setAttribute('background', 'color: ' + color)

        let envMap = [
          "px.png",
          "nx.png",
          "py.png",
          "ny.png",
          "pz.png",
          "nz.png",
        ];
        scene.object3D.environment = new THREE.CubeTextureLoader().load( envMap );
      }

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

      var refreshModel = function(modelData) {
        // console.log(modelData)

        let container = document.getElementById('container');
        container.textContent = '';



        requestAnimationFrame(function(){
          console.log('asdf')
          var ride = render(container, 'a-entity', {
            'gltf-model': '#chimplino_ride',
            scale: '0.5 0.5 0.5',
            position: "0 -0.6 0",
            // animation: "property:rotation; from:0 0 0; to:0 360 0; loop: true; easing:linear; dur:5000",
          });

          requestAnimationFrame(function() {
            var mesh = ride.getObject3D('mesh');
            if (!mesh) return
            mesh.traverse(function (node) {
              if (node.isMesh) {
                console.log("yep")
                node.material.color.set(PALETTE.GOLD)
                node.material.metalness = 0.95
                node.material.roughness = 0.2
              }
            })
          })




            let scene = document.getElementById('scene');
            if (scene) {
              loadEnvMap(scene, "#222")
            }
        })

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
  <Connector />
</template>

<style>
@import '@/fonts/stylesheet.css';
@import '@/assets/base.css';
</style>
