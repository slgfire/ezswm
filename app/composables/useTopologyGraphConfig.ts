import { defineConfigs } from 'v-network-graph'
import type { Edge } from 'v-network-graph'

export function useTopologyGraphConfig(isDark: Ref<boolean>) {
  const graphConfigs = computed(() => defineConfigs({
    view: {
      panEnabled: true,
      zoomEnabled: true,
      scalingObjects: true,
      minZoomLevel: 0.2,
      maxZoomLevel: 3,
      autoPanAndZoomOnLoad: 'fit-content',
      fitContentMargin: { top: 20, bottom: 40, left: 40, right: 40 }
    },
    node: {
      selectable: true,
      draggable: true,
      label: {
        visible: false
      },
      focusring: {
        visible: false
      },
      normal: {
        type: 'rect',
        width: 196,
        height: 86,
        borderRadius: 8,
        color: 'transparent',
        strokeColor: 'transparent',
        strokeWidth: 0
      },
      hover: {
        color: 'transparent',
        strokeColor: 'transparent',
        strokeWidth: 0
      },
      selected: {
        color: 'transparent',
        strokeColor: isDark.value ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.5)',
        strokeWidth: 1.5
      }
    },
    edge: {
      selectable: true,
      gap: 14,
      keepOrder: 'vertical',
      normal: {
        color: (edge: Edge) => {
          if (edge.isLag) return isDark.value ? '#7a8999' : '#8899aa'
          if (edge.isTrunk) return isDark.value ? '#666' : '#aaa'
          return isDark.value ? '#555' : '#bbb'
        },
        width: (edge: Edge) => {
          if (edge.isLag) return 3
          if (edge.isTrunk) return 2
          return 1.5
        },
        dasharray: (edge: Edge) => {
          if (edge.isTrunk && !edge.isLag) return '6 3'
          return 0
        }
      },
      hover: {
        color: (edge: Edge) => {
          if (edge.isLag) return isDark.value ? '#a0b0c0' : '#7799bb'
          if (edge.isTrunk) return isDark.value ? '#999' : '#777'
          return isDark.value ? '#888' : '#888'
        },
        width: (edge: Edge) => {
          if (edge.isLag) return 4.5
          if (edge.isTrunk) return 3
          return 2.5
        }
      },
      selected: {
        color: 'rgba(34,197,94,0.6)',
        width: 4
      },
      margin: null
    }
  }))

  return { graphConfigs }
}
