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
    return attributes;
  },
  methods: {
    onChange() {
      this.$emit('model-update', attributes.createModel(this.defaults))
    }
  }
}

</script>

<template>
  <aside>
    <h1>3D Mob</h1>
    <div v-for="(value, name) in defaults">
      <label for="{{name}}">{{name}}</label>
      <select id="{{name}}" v-model="defaults[name]" @change=onChange>
        <option v-for="option in opts[name]">
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
}
footer {
  font-size: 20px;
  margin-top: 90px;
}
</style>
