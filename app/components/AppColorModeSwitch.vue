<template>
  <!-- Colour-mode switch styled to sit on the evergreen sidebar: the
       unchecked (light) state gets an emerald track and mint thumb so it
       contrasts subtly with the #022c22 background, mirroring how the
       checked (dark) state's primary track reads against it. -->
  <UColorModeSwitch
    :ui="{
      base: 'data-[state=unchecked]:bg-emerald-800',
      thumb: 'data-[state=unchecked]:bg-emerald-200',
    }"
  />
</template>
