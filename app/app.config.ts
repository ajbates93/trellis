export default defineAppConfig({
  ui: {
    colors: {
      // Accent — try: emerald, teal, green, indigo, violet, sky, cyan, rose
      primary: "emerald",
      // Success states use the brand green rather than Tailwind's brighter
      // default green, so badges/buttons/toasts match the emerald primary.
      success: "emerald",
      // Backgrounds/text — try: zinc, slate, neutral, stone, gray
      neutral: "slate",
    },
    // Cards sit on the dotted canvas, so they need the elevated surface
    // (white in light, #161816 charcoal in dark) rather than bg-default,
    // which now matches the page canvas in both modes.
    card: {
      variants: {
        variant: {
          outline: {
            root: "bg-elevated ring ring-default divide-y divide-default",
          },
        },
      },
    },
  },
});
