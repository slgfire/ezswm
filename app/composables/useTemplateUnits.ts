import type { Switch } from '~~/types/switch'
import type { LayoutTemplate, LayoutUnit } from '~~/types/layoutTemplate'

export function useTemplateUnits(
  item: Ref<Switch | null>,
  templates: Ref<LayoutTemplate[]>
) {
  const templateUnits = ref<LayoutUnit[]>([])

  watch([item, templates], () => {
    if (item.value?.layout_template_id) {
      const tpl = templates.value.find((t) => t.id === item.value!.layout_template_id)
      const baseUnits = tpl?.units || []
      const stackSize = item.value?.stack_size ?? 1

      if (stackSize > 1 && baseUnits.length > 0) {
        const incrementLabel = (label: string, memberIdx: number): string => {
          if (memberIdx === 1) return label
          const match = label.match(/^(.*?)(\d+)(.*)$/)
          if (match) return `${match[1]}${parseInt(match[2]!, 10) + memberIdx - 1}${match[3]}`
          return `${memberIdx}/${label}`
        }
        const stacked: LayoutUnit[] = []
        for (let member = 1; member <= stackSize; member++) {
          for (const unit of baseUnits) {
            stacked.push({
              ...unit,
              unit_number: unit.unit_number + (member - 1) * baseUnits.length,
              label: unit.label ? `Member ${member} - ${unit.label}` : `Member ${member}`,
              blocks: unit.blocks.map((b) => ({
                ...b,
                label: b.label ? incrementLabel(b.label, member) : b.label
              }))
            })
          }
        }
        templateUnits.value = stacked
      } else {
        templateUnits.value = baseUnits
      }
    } else {
      templateUnits.value = []
    }
  }, { immediate: true })

  return { templateUnits }
}
