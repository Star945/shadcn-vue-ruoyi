<script setup lang="ts">
import { computed } from 'vue'

import { getDruidFrameSrc } from '@/api/monitor/druid'
import AdminEmbedFrame from '@/components/admin/AdminEmbedFrame.vue'
import { useAccess } from '@/lib/access'
import { permissionKeys } from '@/lib/permission-keys'

const access = useAccess()
const druidPerms = permissionKeys.monitor.druid
const frameSrc = getDruidFrameSrc()

const hasScopedDruidPerms = computed(() => access.hasAnyPrefix(druidPerms.scope))
const canViewDruid = computed(() => !hasScopedDruidPerms.value || access.can(druidPerms.view))
</script>

<template>
  <AdminEmbedFrame
    section-label="系统监控 / Druid"
    title="Druid 监控"
    description="数据库概览。"
    :src="frameSrc"
    :can-view="canViewDruid"
    :can-refresh="canViewDruid"
    :can-copy="canViewDruid"
    :can-open="canViewDruid"
    blocked-title="暂无权限"
    blocked-description="暂不可查看"
  />
</template>







