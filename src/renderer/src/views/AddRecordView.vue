<script setup lang="ts">
import { ref } from 'vue'
import RecordForm from '../components/RecordForm.vue'
import { toast } from '../toast'

// 保存成功后通过换 key 重建表单，自动清空
const formKey = ref(0)

function onSaved(): void {
  toast('已保存 ✓')
  formKey.value++
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">记一笔</h1>
    <p class="page-sub">记录每一笔收支，清楚钱花在了哪里</p>
    <div class="card form-card">
      <RecordForm :key="formKey" @saved="onSaved" />
    </div>
  </div>
</template>

<style scoped>
.form-card {
  max-width: 460px;
  padding: 26px;
}
</style>
