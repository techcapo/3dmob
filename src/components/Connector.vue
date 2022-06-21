<script setup>
import { WalletMultiButton } from 'solana-wallets-vue'
import { useWallet } from 'solana-wallets-vue';
</script>

<script>

// import * as solanaWeb3 from '@solana/web3.js';
// console.log(solanaWeb3);

export default {
  data() {
    return {
    };
  },
  methods: {
    connect() {
      console.log('connect');
      console.log(useWallet())
    },
  }
}
</script>

<template>
  <header @click=connect>
    <wallet-multi-button></wallet-multi-button>
  </header>
</template>

<style scoped>
header {
  position:  absolute;
  top: 10px;
  right: 10px;
}
</style>
