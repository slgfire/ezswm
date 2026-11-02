import type { Switch } from '~~/types/switch'
import type { LayoutTemplate, LayoutUnit } from '~~/types/layoutTemplate'
import { buildTemplateUnits } from '~~/app/utils/portMiniature'

export function useTemplateUnits(
  item: Ref<Switch | null>,
  templates: Ref<LayoutTemplate[]>
) {
  const templateUnits = ref<LayoutUnit[]>([])

  watch([item, templates], () => {
    if (item.value?.layout_template_id) {
      const tpl = templates.value.find((t) => t.id === item.value!.layout_template_id)
      templateUnits.value = buildTemplateUnits(tpl?.units || [], item.value?.stack_size ?? 1)
    } else {
      templateUnits.value = []
    }
  }, { immediate: true })

  return { templateUnits }
}
