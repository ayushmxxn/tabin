export default defineBackground(() => {
  // Ensure action is enabled globally so the pinned icon is in full color
  browser.action.enable();

  // Open the Tabin new tab page when the pinned icon is clicked
  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({});
  });
});
