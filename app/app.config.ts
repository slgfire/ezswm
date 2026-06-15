export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'neutral'
    },
    // Nuxt UI v4 gives both modals and slideovers `z-[100]` content with an
    // un-z-indexed overlay, so a modal opened over an open slideover could render
    // behind it (stacking fell back to DOM order). Pin modals above slideovers so
    // every confirm/dialog stays on top and clickable.
    modal: {
      slots: {
        overlay: 'z-[200]',
        content: 'z-[200]'
      }
    }
  }
})
