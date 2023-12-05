function sumVerticalSpace(layout) {
  return layout.reduce((sum, current) => sum + current.h, 0);
}

export function generateMobileLayout({
  desktopLayout,
  defaultCardHeight,
  heightByDisplayType = {},
}) {
  const mobile = [];
  desktopLayout.forEach(item => {
    const card = item.dashcard.card;
    const height = heightByDisplayType[card.display] || defaultCardHeight;
    mobile.push({
      ...item,
      x: 0,
      y: sumVerticalSpace(mobile),
      h: height,
      w: 1,
    });
  });
  return mobile;
}
