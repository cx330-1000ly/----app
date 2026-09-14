<script setup lang="ts">
defineProps<{
  title: string
  width?: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="$emit('close')">
      <div class="modal" :style="width ? { width } : undefined">
        <div class="modal-head">
          <div class="modal-title">{{ title }}</div>
          <button class="modal-close" @click="$emit('close')">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
