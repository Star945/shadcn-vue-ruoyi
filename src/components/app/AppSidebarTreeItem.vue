<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { resolveIcon } from '@/lib/icons'
import type { NavigationNode } from '@/stores/navigation'

defineOptions({ name: 'AppSidebarTreeItem' })

const props = withDefaults(defineProps<{
  node: NavigationNode
  activePath: string
  openKeys: string[]
  depth?: number
}>(), {
  depth: 0,
})

const emit = defineEmits<{
  toggle: [payload: { path: string, open: boolean }]
}>()

const isRoot = computed(() => props.depth === 0)
const hasChildren = computed(() => props.node.children.length > 0)

function containsPath(node: NavigationNode, target: string): boolean {
  if (!node.external && node.path === target) {
    return true
  }
  return node.children.some(child => containsPath(child, target))
}

const isActive = computed(() => !props.node.external && props.node.path === props.activePath)
const isBranchActive = computed(() => props.node.children.some(child => containsPath(child, props.activePath)))
const isOpen = computed(() => hasChildren.value && (props.openKeys.includes(props.node.path) || isBranchActive.value))
const sharedActiveState = computed(() => isActive.value || isBranchActive.value)

function updateOpen(value: boolean) {
  emit('toggle', { path: props.node.path, open: value })
}

function handleExternalClick(event: MouseEvent) {
  event.preventDefault()
  window.open(props.node.path, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <template v-if="hasChildren">
    <Collapsible :open="isOpen" @update:open="updateOpen">
      <SidebarMenuItem v-if="isRoot">
        <CollapsibleTrigger as-child>
          <SidebarMenuButton :is-active="sharedActiveState" :tooltip="node.title">
            <component :is="resolveIcon(node.icon)" />
            <span>{{ node.title }}</span>
            <ChevronRight class="ml-auto size-4 transition-transform" :class="isOpen ? 'rotate-90' : ''" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <AppSidebarTreeItem
              v-for="child in node.children"
              :key="`${child.path}-${child.title}`"
              :node="child"
              :active-path="activePath"
              :open-keys="openKeys"
              :depth="depth + 1"
              @toggle="emit('toggle', $event)"
            />
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>

      <SidebarMenuSubItem v-else>
        <CollapsibleTrigger as-child>
          <SidebarMenuSubButton :is-active="sharedActiveState">
            <component :is="resolveIcon(node.icon)" />
            <span>{{ node.title }}</span>
            <ChevronRight class="ml-auto size-4 transition-transform" :class="isOpen ? 'rotate-90' : ''" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <AppSidebarTreeItem
              v-for="child in node.children"
              :key="`${child.path}-${child.title}`"
              :node="child"
              :active-path="activePath"
              :open-keys="openKeys"
              :depth="depth + 1"
              @toggle="emit('toggle', $event)"
            />
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  </template>

  <SidebarMenuItem v-else-if="isRoot">
    <SidebarMenuButton v-if="node.external" :tooltip="node.title" @click="handleExternalClick">
      <component :is="resolveIcon(node.icon)" />
      <span>{{ node.title }}</span>
    </SidebarMenuButton>
    <SidebarMenuButton v-else as-child :is-active="isActive" :tooltip="node.title">
      <RouterLink :to="node.path">
        <component :is="resolveIcon(node.icon)" />
        <span>{{ node.title }}</span>
      </RouterLink>
    </SidebarMenuButton>
  </SidebarMenuItem>

  <SidebarMenuSubItem v-else>
    <SidebarMenuSubButton v-if="node.external" :is-active="isActive" @click="handleExternalClick">
      <component :is="resolveIcon(node.icon)" />
      <span>{{ node.title }}</span>
    </SidebarMenuSubButton>
    <SidebarMenuSubButton v-else as-child :is-active="isActive">
      <RouterLink :to="node.path">
        <component :is="resolveIcon(node.icon)" />
        <span>{{ node.title }}</span>
      </RouterLink>
    </SidebarMenuSubButton>
  </SidebarMenuSubItem>
</template>
