export default defineAppConfig({
  ui: {
    colors: {
      primary: 'cyan',
      neutral: 'slate'
    },
    card: {
      slots: {
        root: 'rounded-2xl border border-default/70 bg-(--bg-surface) shadow-[0_14px_34px_-20px_rgba(2,12,32,.75)]',
        header: 'px-5 py-4 border-b border-default/70',
        body: 'px-5 py-4 sm:p-5',
        footer: 'px-5 py-4 border-t border-default/70'
      }
    },
    button: {
      defaultVariants: {
        size: 'md'
      }
    },
    input: {
      slots: {
        root: 'w-full',
        base: 'rounded-xl border-default/80 bg-(--bg-muted) text-(--text-primary) shadow-[inset_0_1px_0_rgba(255,255,255,.03)]'
      }
    },
    select: {
      slots: {
        base: 'rounded-xl border-default/80 bg-(--bg-muted) text-(--text-primary)'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-xl border-default/80 bg-(--bg-muted) text-(--text-primary)'
      }
    },
    progress: {
      slots: {
        base: 'bg-(--bg-muted) ring-1 ring-(--border-default) rounded-full',
        indicator: 'rounded-full'
      }
    },
    slideover: {
      slots: {
        content: 'border-l border-default/80 bg-(--bg-surface)'
      }
    }
  }
})
