<script setup lang="ts">
import { toasts } from '../toast'
</script>

<template>
  <div class="toast-host">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type === 'success' ? 'toast-success' : 'toast-error'">
      {{ t.text }}
    </div>
  </div>
</template>
