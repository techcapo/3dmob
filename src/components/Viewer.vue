<script setup>
import gridhelper from 'aframe-gridhelper-component'
</script>

<template>
  <main>
  <a-scene gridhelper="colorGrid: #444; colorCenterLine: #444; size: 200; divisions: 200;" id="scene"
  background="color: #000"
  vr-mode-ui="false" embedded
           renderer="highRefreshRate:true; logarithmicDepthBuffer:false; colorManagement: false;"

           light="defaultLightsEnabled: true"
           >


      <a-assets>

        <a-asset-item
          id="chimplino_ride"
          src="models/orangutano_1.glb">
        </a-asset-item>

      </a-assets>


    <a-entity id="camera" camera
      position="0 1.8 2.5"
      look-controls="false"></a-entity>

<a-entity light="type: ambient; color: #fff; intensity: 1" position="-1 -2 0"></a-entity>


    <a-entity class="light" visible="true"
              light="type: hemisphere;  color: #eeF; groundColor: #efe; intensity: 1"></a-entity>
    <a-entity class="light" visible="true" position="-1 1 1"
              light="type: directional; color: #FFF; intensity: 0.8;"></a-entity>

    <a-entity class="light" visible="true" position="1 1 -1" light="type: directional; color: #fff; intensity: 1;
     castShadow:false; shadowBias:0.001;"></a-entity>

<a-entity light="type: point; intensity: 1; distance: 40; decay: 2"
          position="0 0 2"></a-entity>


<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="10 -10 -10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="-10 -10 -10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="-10 10 -10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="10 10 -10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="10 -10 10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="-10 -10 10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="-10 10 10"></a-entity>
<a-entity light="type: point; intensity: 1; distance: 50; decay: 2"
          position="10 10 10"></a-entity>


    <a-entity id="container"
    position="0 1.5 0"
    animation="property:rotation; from:0 0 0; to:0 360 0; loop: true; easing:linear; dur:20000"
    >

    <a-entity gltf-model="#chimplino_ride"
    scale="0.5 0.5 0.5"
    position="0 -0.5 0"
    ></a-entity>

    </a-entity>



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
