<script setup>
import gridhelper from 'aframe-gridhelper-component'
</script>

<template>
  <main>
  <a-scene gridhelper="colorGrid: #444; colorCenterLine: #444; size: 200; divisions: 100;" id="scene"
  background="color: #222"
  vr-mode-ui="false" embedded
           renderer="highRefreshRate:true; logarithmicDepthBuffer:false; colorManagement: false;"

           light="defaultLightsEnabled: true"
           >

<a-entity light="type: ambient; color: #fff; intensity: 0.3" position="1 5 0"></a-entity>




    <a-entity id="camera" camera
      position="0 1.8 2.5"
      look-controls="false"></a-entity>
<!--
    <a-entity class="light" visible="true" position="-1 1 1"
              light="type: directional; color: #FFF; intensity: 0.8;
                     castShadow:true;  shadowBias:0.001; shadowMapWidth:2048; shadowMapHeight:2048;
                     shadowCameraVisible:false; shadowCameraNear:0; shadowCameraFar:10;
                     shadowCameraBottom:-1; shadowCameraLeft:-2; shadowCameraTop:2; shadowCameraRight:2;"></a-entity>
    <a-entity class="light" visible="true" position="0 1 -1" light="type: directional; color: #FFF; intensity: 1; castShadow:false; shadowBias:0.001;"></a-entity>
-->
    <a-entity id="container"
    position="0 1.5 0"
    animation="property:rotation; from:0 0 0; to:0 360 0; loop: true; easing:linear; dur:5000"
    ></a-entity>


    <!--a-sphere color="red" position="0.8 2 0.2" metalness="1.0" roughness="0.0" radius="0.4"></a-sphere-->


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
