<script setup>
defineProps({
  msg: {
    type: String,
    required: true
  }
})

import { useWallet } from 'solana-wallets-vue';

</script>

<script>

import * as THREE from 'three';
import GLTFExporter from 'three-gltf-exporter';
var exporter = new GLTFExporter();

import PALETTE from '../PALETTE.js';
import attributes from '../attributes.js';
//import store from '../store.js';

function downloadJSON(exportObj, exportName){
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}


export default {
  data() {
    return {
      attributes: attributes,
      values: attributes.defaults,
      sending: false,
      success: false,
    };
  },
  methods: {
    onChange() {
      this.$emit('model-update', attributes.createModel(this.values))
    },
    propose() {

      var pubk = useWallet().publicKey.value.toString();
      this.sending = true;

      setTimeout(() => {
        this.sending = false;
        this.success = false;
      }, 3000);

      setTimeout(() => {
        this.success = true;
      }, 1000);

      var script = document.createElement('script');
      var d = this.values
      // var p = Object.keys(d).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(d[k])).join('&')
      var p = "json=" + JSON.stringify(d) + '&key=' + pubk;
      script.src = 'https://script.google.com/macros/s/AKfycbxJdOGXGZzalL-8-w7eJ-5sMsLoVYfZOV1khliezFNIeT64n7Q4rWog48iJdzMzhrLG/exec?' + p
      console.log(script.src)
      document.getElementsByTagName('head')[0].appendChild(script);

//      console.log(JSON.stringify(this.defaults));
    },
    randomizeModel() {
      attributes.randomize(this.values);
      this.onChange();
    },
    screenshot() {

      var w = window.open('', '');
      w.document.title = "Screenshot";
      //w.document.body.style.backgroundColor = "red";
      var img = new Image();
      // Without 'preserveDrawingBuffer' set to true, we must render now

//      renderer.render(scene, camera);
      var scene = document.querySelector('a-scene')
      scene.render()
      img.src = scene.renderer.domElement.toDataURL();
      w.document.body.appendChild(img);

    }
  }
}

</script>

<template>
  <aside>
    <h1>3D Mob</h1>
    <button @click="randomizeModel">Random</button>
    <br>
    <button @click="screenshot">shot</button>
    <div v-for="(value, name) in attributes.defaults">
      <label for="{{name}}">{{name}}</label>
      <select id="{{name}}" v-model="values[name]" @change=onChange>
        <option v-for="option in attributes.opts[name]">
          {{ option }}
        </option>
      </select>
    </div>
    <footer>
      Copyright 2022 Tech Capo. {{ msg }}
    </footer>
  </aside>
</template>

<style scoped>
aside {
  margin:  8px;
  width:  30vw;
  display:  inline-block;
  position:  fixed;
  overflow-y: scroll;
  top: 0;
  bottom: 0;

}
label {
  margin-top: 10px;
  display:  block;
  text-transform: capitalize;
}
footer {
  font-size: 20px;
  margin-top: 90px;
}
</style>
