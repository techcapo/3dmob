<script setup>
defineProps({
  msg: {
    type: String,
    required: true
  }
})
</script>

<script>
import PALETTE from '../PALETTE.js';
import attributes from '../attributes.js';
//import store from '../store.js';
export default {
  data() {
    return {
      attributes: attributes,
      sending: false,
    };
  },
  methods: {
    onChange() {
      this.$emit('model-update', attributes.createModel(this.attributes.defaults))
    },
    propose() {

      this.sending = true;

      var script = document.createElement('script');
      var d = this.attributes.defaults
      // var p = Object.keys(d).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(d[k])).join('&')
      var p = "json=" + JSON.stringify(d);
      script.src = 'https://script.google.com/macros/s/AKfycbxJdOGXGZzalL-8-w7eJ-5sMsLoVYfZOV1khliezFNIeT64n7Q4rWog48iJdzMzhrLG/exec?' + p
      console.log(script.src)
      document.getElementsByTagName('head')[0].appendChild(script);

//      console.log(JSON.stringify(this.defaults));
    },
  }
}

</script>

<template>
  <aside>
    <h1>3D Mob</h1>
    <div v-for="(value, name) in attributes.defaults">
      <label for="{{name}}">{{name}}</label>
      <select id="{{name}}" v-model="attributes.defaults[name]" @change=onChange>
        <option v-for="option in attributes.opts[name]">
          {{ option }}
        </option>
      </select>
    </div>
    <button @click=propose>Propose</button>
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
button {
  font-family: '3d_thirteen_pixel_fontsRg', Arial, sans-serif;
  font-size:  60px;
  margin-top: 20px;
}
footer {
  font-size: 20px;
  margin-top: 90px;
}
</style>
