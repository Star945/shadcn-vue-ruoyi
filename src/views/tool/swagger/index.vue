<script setup lang="ts">
import { computed } from 'vue'

import { getSwaggerFrameSrc } from '@/api/tool/swagger'
import AdminEmbedFrame from '@/components/admin/AdminEmbedFrame.vue'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const swaggerPerms = permissionKeys.tool.swagger
const frameSrc = getSwaggerFrameSrc()

const hasScopedSwaggerPerms = computed(() => access.hasAnyPrefix(swaggerPerms.scope))
const canViewSwagger = computed(() => !hasScopedSwaggerPerms.value || access.can(swaggerPerms.view))
</script>

<template>
  <AdminEmbedFrame
    section-label="系统工具 / 接口文档"
    title="接口文档"
    description="文档总览。"
    :src="frameSrc"
    :can-view="canViewSwagger"
    :can-refresh="canViewSwagger"
    :can-copy="canViewSwagger"
    :can-open="canViewSwagger"
    blocked-title="暂无权限"
    blocked-description="暂不可查看"
  />
</template>







