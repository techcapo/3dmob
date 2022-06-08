<script setup>
</script>

<template>
  <main>
  <a-scene id="scene" background="color: #7CE3B6" vr-mode-ui="false" embedded
           renderer="highRefreshRate:true; logarithmicDepthBuffer:false; colorManagement: false;"

           light="defaultLightsEnabled: true">


    <a-entity id="camera" camera look-controls="false"></a-entity>
    <a-entity class="light" visible="true"
              light="type: hemisphere;  color: #FFF; groundColor: #7BF8C8; intensity: 0.5"></a-entity>
    <a-entity class="light" visible="true" position="-1 1 1"
              light="type: directional; color: #FFF; intensity: 0.8;
                     castShadow:true;  shadowBias:0.001; shadowMapWidth:2048; shadowMapHeight:2048;
                     shadowCameraVisible:false; shadowCameraNear:0; shadowCameraFar:10;
                     shadowCameraBottom:-1; shadowCameraLeft:-2; shadowCameraTop:2; shadowCameraRight:2;"></a-entity>
    <a-entity class="light" visible="true" position="0 1 -1" light="type: directional; color: #FFF; intensity: 1; castShadow:false; shadowBias:0.001;"></a-entity>
    <a-entity id="container"
    position="0 -0.3 -2"
    animation="property:rotation; from:0 0 0; to:0 360 0; loop: true; easing:linear; dur:5000"
    >
    </a-entity>

  </a-scene>
  </main>
</template>

<style scoped>
main {
  margin-left: 30vw;
  width:  70vw;
  height: 100vh;
  padding: 0;
}

</style>
